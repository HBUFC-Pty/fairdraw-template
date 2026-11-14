/*
 * The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may
 * not use this file except in compliance with the License. You may obtain a copy of the License at
 * https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections
 * 14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for
 * the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
 * Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either
 * express or implied. See the License for the specific language governing rights and limitations under the License.
 * The Original Code is FairDraw operator template.
 * The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are
 * Copyright (c) 2026 Harrison Jones. All Rights Reserved.
 */
/** Admin operations. Every one writes to the hash-chained audit log. */
import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { competitions, orders, refunds, sessions, tickets, users, type Role } from '../db/schema';
import { appendAudit, type AuditActor } from '../audit';
import { normaliseEmail } from '../auth/service';

export const PERMISSIONS = {
  competitions: ['admin', 'owner'],
  postal: ['support', 'admin', 'owner'],
  refunds: ['admin', 'owner'],
  users: ['support', 'admin', 'owner'],
  audit: ['admin', 'owner'],
  staff: ['owner'],
} as const satisfies Record<string, readonly Role[]>;

export class AdminError extends Error {}

/**
 * Refund part or all of an order. While a competition is still live, refunded tickets are released from the draw.
 * Once a competition has closed its list is frozen: the money can still be refunded, but the ticket stays in the
 * committed draw (the database would refuse any change to it anyway).
 */
export async function issueRefund(db: Db, actor: AuditActor, input: { orderId: string; amountPence: number; reason: string; releaseTickets: boolean }, now = new Date()) {
  const result = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for('update');
    if (!o) throw new AdminError('Order not found.');
    if (!['paid', 'partially_refunded'].includes(o.status)) throw new AdminError(`This order is ${o.status}; only paid orders can be refunded.`);
    const [done] = await tx
      .select({ s: sql<string>`coalesce(sum(${refunds.amountPence}), 0)` })
      .from(refunds)
      .where(and(eq(refunds.orderId, o.id), inArray(refunds.status, ['pending', 'succeeded'])));
    const left = o.totalPence - Number(done?.s ?? 0);
    if (!Number.isInteger(input.amountPence) || input.amountPence < 1 || input.amountPence > left) throw new AdminError(`Refund must be between 1p and the ${left}p not yet refunded.`);
    const [r] = await tx.insert(refunds).values({ orderId: o.id, amountPence: input.amountPence, reason: input.reason, requestedBy: actor.id, createdAt: now }).returning();
    let released = 0;
    if (input.releaseTickets) {
      // Only competitions still open: after the advertised close the entries are fixed (drizzle/0004).
      const live = await tx.select({ id: competitions.id }).from(competitions).where(and(eq(competitions.status, 'live'), gt(competitions.closesAt, now)));
      const liveIds = live.map((l) => l.id);
      if (liveIds.length) {
        const rel = await tx
          .update(tickets)
          .set({ status: 'refunded' })
          .where(and(eq(tickets.orderId, o.id), inArray(tickets.status, ['active', 'reserved']), inArray(tickets.competitionId, liveIds), sql`NOT EXISTS (SELECT 1 FROM draws d WHERE d.competition_id = ${tickets.competitionId})`))
          .returning({ id: tickets.id });
        released = rel.length;
      }
    }
    return { refundId: r!.id, released };
  });
  await appendAudit(db, actor, { action: 'refund.issue', targetType: 'order', targetId: input.orderId, details: { amount_pence: input.amountPence, reason: input.reason, tickets_released: result.released, refund_id: result.refundId } }, now);
  return result;
}

export async function setRole(db: Db, actor: AuditActor, emailInput: string, role: Role, now = new Date()) {
  const email = normaliseEmail(emailInput);
  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u || u.deletedAt) throw new AdminError('No account with that email.');
  if (u.id === actor.id) throw new AdminError('You cannot change your own role.');
  if (u.role === 'owner' && role !== 'owner') {
    const [{ n } = { n: '0' }] = await db.select({ n: sql<string>`count(*)` }).from(users).where(eq(users.role, 'owner'));
    if (Number(n) <= 1) throw new AdminError('There must always be at least one owner.');
  }
  await db.update(users).set({ role }).where(eq(users.id, u.id));
  // A changed role must log in again (and staff must pass 2FA).
  await db.delete(sessions).where(eq(sessions.userId, u.id));
  await appendAudit(db, actor, { action: 'staff.set_role', targetType: 'user', targetId: u.id, details: { from: u.role, to: role } }, now);
}

/** What support staff may see about a player: enough to help, nothing more (no date of birth, address or password data). */
export async function supportView(db: Db, actor: AuditActor, userId: string, now = new Date()) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) return null;
  await appendAudit(db, actor, { action: 'user.view', targetType: 'user', targetId: userId }, now);
  const os = await db.select({ id: orders.id, status: orders.status, totalPence: orders.totalPence, createdAt: orders.createdAt }).from(orders).where(eq(orders.userId, userId));
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    role: u.role,
    emailVerified: Boolean(u.emailVerifiedAt),
    ageChecked: u.ageCheckMethod,
    twoFactor: Boolean(u.totpEnabledAt),
    breakUntil: u.breakUntil,
    selfExcludedUntil: u.selfExcludedUntil,
    createdAt: u.createdAt,
    deleted: Boolean(u.deletedAt),
    orders: os,
  };
}
