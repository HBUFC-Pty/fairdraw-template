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
 * Player spend limits (daily, weekly, monthly; any amount down to £0).
 *
 * A decrease, or setting a limit where there was none, takes effect immediately. An increase, or removing a limit,
 * waits 24 hours (the cooling-off period) and the player can cancel it during that time. Do not shorten or remove
 * the cooling-off period: see AGENTS.md.
 *
 * Periods are rolling: "day" is the last 24 hours, "week" the last 7 days, "month" the last 30 days.
 */
import { and, eq, gt, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { orders, spendLimits, SPEND_PERIODS, type SpendPeriod } from '../db/schema';

export const COOLING_OFF_MS = 24 * 3600_000;
export const PERIOD_MS: Record<SpendPeriod, number> = { day: 86400_000, week: 7 * 86400_000, month: 30 * 86400_000 };
export const PERIOD_LABEL: Record<SpendPeriod, string> = { day: 'Daily (24 hours)', week: 'Weekly (7 days)', month: 'Monthly (30 days)' };

export interface LimitState {
  period: SpendPeriod;
  limitPence: number | null;
  pending: { limitPence: number | null; effectiveAt: Date } | null;
}

type Row = typeof spendLimits.$inferSelect;

/** Apply any pending change whose cooling-off period has ended. Pure. */
export function effective(row: Row | undefined, period: SpendPeriod, now: Date): LimitState {
  if (!row) return { period, limitPence: null, pending: null };
  if (row.pendingEffectiveAt && row.pendingEffectiveAt <= now) {
    return { period, limitPence: row.pendingRemoval ? null : row.pendingLimitPence, pending: null };
  }
  return {
    period,
    limitPence: row.limitPence,
    pending: row.pendingEffectiveAt ? { limitPence: row.pendingRemoval ? null : row.pendingLimitPence, effectiveAt: row.pendingEffectiveAt } : null,
  };
}

export async function getLimits(db: Db, userId: string, now = new Date()): Promise<Record<SpendPeriod, LimitState>> {
  const rows = await db.select().from(spendLimits).where(eq(spendLimits.userId, userId));
  const out = {} as Record<SpendPeriod, LimitState>;
  for (const p of SPEND_PERIODS) out[p] = effective(rows.find((r) => r.period === p), p, now);
  return out;
}

/** True when `next` is a decrease or equal: it applies at once. Removing a limit (null) is an increase. */
export function isDecrease(current: number | null, next: number | null): boolean {
  if (next === null) return current === null;
  return current === null || next <= current;
}

export type SetLimitResult = { applied: 'now' } | { applied: 'later'; effectiveAt: Date };

export async function setLimit(db: Db, userId: string, period: SpendPeriod, next: number | null, now = new Date()): Promise<SetLimitResult> {
  if (next !== null && (!Number.isInteger(next) || next < 0)) throw new Error('limit must be a whole number of pence, 0 or more');
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(spendLimits)
      .where(and(eq(spendLimits.userId, userId), eq(spendLimits.period, period)))
      .for('update');
    const cur = effective(row, period, now);
    if (isDecrease(cur.limitPence, next)) {
      const values = { limitPence: next, pendingLimitPence: null, pendingRemoval: false, pendingEffectiveAt: null, updatedAt: now };
      if (row) await tx.update(spendLimits).set(values).where(and(eq(spendLimits.userId, userId), eq(spendLimits.period, period)));
      else await tx.insert(spendLimits).values({ userId, period, ...values });
      return { applied: 'now' } as const;
    }
    const effectiveAt = new Date(now.getTime() + COOLING_OFF_MS);
    const values = { limitPence: cur.limitPence, pendingLimitPence: next, pendingRemoval: next === null, pendingEffectiveAt: effectiveAt, updatedAt: now };
    if (row) await tx.update(spendLimits).set(values).where(and(eq(spendLimits.userId, userId), eq(spendLimits.period, period)));
    else await tx.insert(spendLimits).values({ userId, period, ...values });
    return { applied: 'later', effectiveAt } as const;
  });
}

export async function cancelPendingIncrease(db: Db, userId: string, period: SpendPeriod, now = new Date()) {
  const [row] = await db.select().from(spendLimits).where(and(eq(spendLimits.userId, userId), eq(spendLimits.period, period)));
  if (!row?.pendingEffectiveAt || row.pendingEffectiveAt <= now) return false;
  await db
    .update(spendLimits)
    .set({ pendingLimitPence: null, pendingRemoval: false, pendingEffectiveAt: null, updatedAt: now })
    .where(and(eq(spendLimits.userId, userId), eq(spendLimits.period, period)));
  return true;
}

/** What the player has spent (or has pending) in each rolling period. */
export async function spentInPeriod(db: Db, userId: string, period: SpendPeriod, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - PERIOD_MS[period]);
  const [r] = await db
    .select({ total: sql<string>`coalesce(sum(${orders.totalPence}), 0)` })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        gt(orders.createdAt, since),
        sql`(${orders.status} IN ('paid', 'partially_refunded') OR (${orders.status} = 'pending' AND ${orders.expiresAt} > ${now.toISOString()}))`,
      ),
    );
  return Number(r?.total ?? 0);
}

export interface SpendCheck {
  ok: boolean;
  period?: SpendPeriod;
  limitPence?: number;
  spentPence?: number;
}

/** Would spending `amountPence` more break any limit? Call inside the checkout transaction. */
export async function checkSpend(db: Db, userId: string, amountPence: number, now = new Date()): Promise<SpendCheck> {
  const limits = await getLimits(db, userId, now);
  for (const p of SPEND_PERIODS) {
    const l = limits[p].limitPence;
    if (l === null) continue;
    const spent = await spentInPeriod(db, userId, p, now);
    if (spent + amountPence > l) return { ok: false, period: p, limitPence: l, spentPence: spent };
  }
  return { ok: true };
}

// Re-exported for the account page.
export { SPEND_PERIODS };
