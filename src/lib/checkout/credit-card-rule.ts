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
 * DCMS Voluntary Code of Good Practice for Prize Draw Operators, clause 1.3 (checked on gov.uk on 13 November 2026,
 * page "Updated 19 October 2026"; Open Government Licence v3.0), quoted exactly:
 *
 *   "1.3 Operators should not accept credit card payments in excess of £250 per month per player (“credit card
 *   limit”). Operators should not accept any credit card payments whatsoever for any instant win prize draws. To
 *   ensure a smooth transition, operators who currently accept credit card payments should not accept credit card
 *   payments beyond this credit card limit, or accept credit card payments for any instant win prize draws, by the
 *   implementation date.  This includes any payments made to operators by credit card through a money service
 *   business."
 *
 * How this template applies it:
 * - "per month": the clause does not say calendar or rolling, so this uses the calendar month in UK time
 *   (Europe/London), from 00:00 on the 1st.
 * - "per player": per player account, across every card and order on that account.
 * - "credit card payments": a payment the card network reports as credit-funded. "unknown" is treated as credit. Debit
 *   and prepaid cards are not credit cards.
 * - "accept": a payment counts when it is captured (taken). Refunds later in the month do not give the allowance back,
 *   because the payment was still accepted.
 * - The cap comes from config/site.json (creditCardMonthlyCapPounds), which may be lower than £250 but never higher, and
 *   the instant win ban cannot be switched off (src/lib/site-config.ts). The database refuses to capture anything that
 *   breaks either rule at the £250 figure (drizzle/0003_instant_win_guard.sql).
 *
 * Do not weaken this check: see AGENTS.md.
 */
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { orders } from '../db/schema';
import type { FundingType } from '../payments/types';
import { creditCardCapPence } from '../site-config';
import { ukMonthBounds } from '../time';

/** Order statuses whose payment has been (or is being) accepted. */
export const ACCEPTED_STATUSES = ['capturing', 'paid', 'partially_refunded', 'refunded'] as const;
export const CREDIT_LIKE: FundingType[] = ['credit', 'unknown'];

export function isCreditFunded(funding: FundingType | null | undefined): boolean {
  return funding !== 'debit' && funding !== 'prepaid';
}

/** Credit-funded payments accepted from this player in the current UK calendar month. */
export async function creditUsedThisMonth(db: Db, userId: string, now = new Date()): Promise<number> {
  const { start, end } = ukMonthBounds(now);
  const [r] = await db
    .select({ total: sql<string>`coalesce(sum(${orders.capturePence}), 0)` })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        inArray(orders.paymentFunding, CREDIT_LIKE),
        inArray(orders.status, [...ACCEPTED_STATUSES]),
        gte(orders.decidedAt, start),
        lt(orders.decidedAt, end),
      ),
    );
  return Number(r?.total ?? 0);
}

export interface CreditAllowance {
  capPence: number;
  usedPence: number;
  remainingPence: number;
  month: string;
  resetsAt: Date;
}

export async function creditAllowance(db: Db, userId: string, now = new Date(), capPence = creditCardCapPence()): Promise<CreditAllowance> {
  const used = await creditUsedThisMonth(db, userId, now);
  const { end, label } = ukMonthBounds(now);
  return { capPence, usedPence: used, remainingPence: Math.max(0, capPence - used), month: label, resetsAt: end };
}

export type CreditDecision = { ok: true } | { ok: false; reason: 'instant_win' | 'cap'; usedPence: number; capPence: number };

/** Pure decision for one authorised payment. */
export function decideCredit(input: { funding: FundingType; hasInstantWin: boolean; usedPence: number; amountPence: number; capPence: number }): CreditDecision {
  if (!isCreditFunded(input.funding)) return { ok: true };
  if (input.hasInstantWin) return { ok: false, reason: 'instant_win', usedPence: input.usedPence, capPence: input.capPence };
  if (input.usedPence + input.amountPence > input.capPence) return { ok: false, reason: 'cap', usedPence: input.usedPence, capPence: input.capPence };
  return { ok: true };
}
