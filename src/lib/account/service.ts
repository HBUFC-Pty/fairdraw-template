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
/**
 * Player account controls: take a break, self-exclusion, winner consent, data export and account deletion.
 * Retention periods are set out in docs/gdpr/retention.md and the privacy notice; keep them in step.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { basketItems, competitions, exclusions, orders, postalEntries, refunds, sessions, spendLimits, tickets, users, winners, authTokens } from '../db/schema';
import { exclusionKey } from '../auth/service';
import { fairdrawEntryCode } from '../fairdraw/entry-codes';
import { env } from '../env';

export const BREAK_OPTIONS = { '1d': 1, '7d': 7, '30d': 30, '42d': 42 } as const;
export const EXCLUSION_OPTIONS = { '6m': 182, '1y': 365, '2y': 730, '5y': 1826 } as const;

/** A break cannot be shortened once started. A longer break replaces a shorter one. */
export async function takeBreak(db: Db, userId: string, days: number, now = new Date()) {
  const until = new Date(now.getTime() + days * 86400_000);
  await db
    .update(users)
    .set({ breakUntil: sql`greatest(coalesce(${users.breakUntil}, ${now.toISOString()}::timestamptz), ${until.toISOString()}::timestamptz)` })
    .where(eq(users.id, userId));
  await db.delete(basketItems).where(eq(basketItems.userId, userId));
  return until;
}

/**
 * Self-exclusion: cannot be undone early. Also recorded against a keyed hash of the email address, so it still
 * applies if the account is deleted and the person signs up again.
 */
export async function selfExclude(db: Db, userId: string, days: number, now = new Date()) {
  const until = new Date(now.getTime() + days * 86400_000);
  const [u] = await db.select({ email: users.email, cur: users.selfExcludedUntil }).from(users).where(eq(users.id, userId));
  if (!u) throw new Error('user not found');
  const finalUntil = u.cur && u.cur > until ? u.cur : until;
  await db.update(users).set({ selfExcludedUntil: finalUntil }).where(eq(users.id, userId));
  await db
    .insert(exclusions)
    .values({ emailHash: exclusionKey(u.email), until: finalUntil, createdAt: now })
    .onConflictDoUpdate({ target: exclusions.emailHash, set: { until: sql`greatest(${exclusions.until}, ${finalUntil.toISOString()}::timestamptz)` } });
  await db.delete(basketItems).where(eq(basketItems.userId, userId));
  return finalUntil;
}

/** Show (or stop showing) the winner's first name and surname initial on public results. */
export async function setWinnerConsent(db: Db, userId: string, competitionId: string, consent: boolean, now = new Date()) {
  const [u] = await db.select({ first: users.firstName, last: users.lastName }).from(users).where(eq(users.id, userId));
  if (!u) throw new Error('user not found');
  const display = consent ? publicWinnerName(u.first, u.last) : null;
  const rows = await db
    .update(winners)
    .set({ publicConsent: consent, displayName: display, consentAt: now })
    .where(and(eq(winners.userId, userId), eq(winners.competitionId, competitionId)))
    .returning();
  return rows.length > 0;
}

/** "Sam T." from "Sam" and "Taylor". Never more than a first name and an initial. */
export function publicWinnerName(first: string | null, last: string | null): string | null {
  const f = (first ?? '').trim().split(/\s+/)[0] ?? '';
  const l = (last ?? '').trim().charAt(0).toUpperCase();
  if (!f) return null;
  return l ? `${f} ${l}.` : f;
}

/** Everything held about the player, as JSON (UK GDPR Articles 15 and 20). */
export async function exportUserData(db: Db, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw new Error('user not found');
  const os = await db.select().from(orders).where(eq(orders.userId, userId));
  const ts = await db
    .select({ t: tickets, title: competitions.title })
    .from(tickets)
    .innerJoin(competitions, eq(competitions.id, tickets.competitionId))
    .where(eq(tickets.userId, userId));
  const rs = os.length ? await db.select().from(refunds).where(inArray(refunds.orderId, os.map((o) => o.id))) : [];
  const ls = await db.select().from(spendLimits).where(eq(spendLimits.userId, userId));
  const ws = await db.select().from(winners).where(eq(winners.userId, userId));
  const ss = await db.select({ createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, expiresAt: sessions.expiresAt }).from(sessions).where(eq(sessions.userId, userId));
  const ps = await db.select().from(postalEntries).where(eq(postalEntries.email, u.email));
  const secret = env().ENTRY_CODE_SECRET;
  return {
    exported_at: new Date().toISOString(),
    account: {
      id: u.id,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      date_of_birth: u.dateOfBirth,
      age_check: { method: u.ageCheckMethod, checked_at: u.ageCheckedAt },
      email_verified_at: u.emailVerifiedAt,
      role: u.role,
      two_factor_enabled: Boolean(u.totpEnabledAt),
      break_until: u.breakUntil,
      self_excluded_until: u.selfExcludedUntil,
      created_at: u.createdAt,
      last_login_at: u.lastLoginAt,
    },
    spend_limits: ls.map((l) => ({ period: l.period, limit_pence: l.limitPence, pending_limit_pence: l.pendingLimitPence, pending_removal: l.pendingRemoval, pending_effective_at: l.pendingEffectiveAt })),
    orders: os.map((o) => ({ id: o.id, status: o.status, total_pence: o.totalPence, provider: o.provider, created_at: o.createdAt, paid_at: o.paidAt })),
    refunds: rs.map((r) => ({ order_id: r.orderId, amount_pence: r.amountPence, reason: r.reason, status: r.status, created_at: r.createdAt })),
    tickets: ts.map(({ t, title }) => ({
      competition: title,
      ticket: t.number,
      entry_code: t.orderId ? fairdrawEntryCode(secret, t.competitionId, t.number, t.orderId) : t.postalEntryId ? fairdrawEntryCode(secret, t.competitionId, t.number, t.postalEntryId) : null,
      status: t.status,
      allocation: t.allocation,
      source: t.source,
      created_at: t.createdAt,
    })),
    postal_entries: ps.map((p) => ({ competition_id: p.competitionId, full_name: p.fullName, postal_address: p.postalAddress, received_at: p.receivedAt, status: p.status })),
    wins: ws.map((w) => ({ competition_id: w.competitionId, ticket: w.ticketNumber, public_consent: w.publicConsent, display_name: w.displayName })),
    sessions: ss,
  };
}

export const DELETION_RETAINED = [
  'Orders, payments and refunds (amounts, dates and references, linked to an anonymised account): kept for 6 years from the end of the financial year, because UK tax and company law require us to keep accounting records.',
  'Ticket numbers and draw records: kept permanently, because they are public proof that each draw was fair. They do not identify you once your account is anonymised.',
  'Prize wins: kept for 6 years as part of our accounting records. Your name is removed from public results.',
  'Self-exclusion: if you self-excluded, a one-way keyed fingerprint of your email address (not the address itself) is kept until the exclusion ends, so the exclusion still works if you sign up again.',
  'The admin audit log keeps account ids (not names or emails) for 6 years, to show how the site was run.',
];

/**
 * Delete an account: personal details are erased and the account is anonymised; what the law requires us to keep
 * (DELETION_RETAINED) stays, linked only to an anonymous id.
 */
export async function deleteAccount(db: Db, userId: string, now = new Date()) {
  await db.transaction(async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (!u || u.deletedAt) return;
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(authTokens).where(eq(authTokens.userId, userId));
    await tx.delete(basketItems).where(eq(basketItems.userId, userId));
    await tx.delete(spendLimits).where(eq(spendLimits.userId, userId));
    await tx.update(winners).set({ publicConsent: false, displayName: null }).where(eq(winners.userId, userId));
    await tx
      .update(postalEntries)
      .set({ fullName: null, postalAddress: null, email: null, anonymisedAt: now })
      .where(eq(postalEntries.email, u.email));
    await tx
      .update(users)
      .set({
        email: `deleted-${u.id}@invalid`,
        passwordHash: null,
        firstName: null,
        lastName: null,
        dateOfBirth: null,
        totpSecretEnc: null,
        totpEnabledAt: null,
        role: 'player',
        deletedAt: now,
      })
      .where(eq(users.id, userId));
  });
}
