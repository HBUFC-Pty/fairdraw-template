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
 * Basket, checkout and payment confirmation.
 *
 * Checkout runs in one database transaction that locks each competition row, so caps, spend limits and ticket
 * availability are checked against a consistent view and two buyers can never get the same number. Tickets are
 * reserved while the player pays; they become active only when the provider's signed webhook confirms payment.
 */
import { and, asc, eq, inArray, lt, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { basketItems, competitions, orders, refunds, tickets, users, webhookEvents } from '../db/schema';
import { allocateChosen, allocateRandom, AllocationError, cryptoRandomInt, withinCap, type RandomIntFn } from '../competitions/allocation';
import { entriesHeld, takenNumbers } from '../competitions/queries';
import { isOpen } from '../competitions/service';
import { checkSpend, PERIOD_LABEL } from '../limits/spend';
import { isAdult } from '../auth/age';
import { formatPence } from '../money';
import type { PaymentEvent, PaymentProvider } from '../payments/types';
import { creditCardCapPence } from '../site-config';
import { creditUsedThisMonth, decideCredit } from './credit-card-rule';

export class CheckoutError extends Error {}

export interface BasketAdd {
  competitionId: string;
  quantity: number;
  chosenNumbers: number[] | null;
  answerIndex: number | null;
}

/** Why a player may not buy right now, or null if they may. */
export function playBlockReason(u: typeof users.$inferSelect, now: Date): string | null {
  if (u.deletedAt) return 'This account has been deleted.';
  if (!u.emailVerifiedAt) return 'Please verify your email address first.';
  if (!u.dateOfBirth || !isAdult(u.dateOfBirth, now)) return 'You must be 18 or over to play.';
  if (u.selfExcludedUntil && u.selfExcludedUntil > now) return 'You have self-excluded. You cannot enter competitions until your exclusion ends.';
  if (u.breakUntil && u.breakUntil > now) return 'You are taking a break. You can enter competitions again when it ends.';
  return null;
}

export async function addToBasket(db: Db, userId: string, item: BasketAdd, now = new Date()) {
  const [c] = await db.select().from(competitions).where(eq(competitions.id, item.competitionId));
  if (!c || !isOpen(c, now)) throw new CheckoutError('This competition is not open for entries.');
  if (item.chosenNumbers?.length && c.instantPrizes.length) {
    throw new CheckoutError('Ticket numbers are always picked at random in competitions with instant prizes, so nobody can choose a winning number.');
  }
  if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new CheckoutError('Choose at least one ticket.');
  if (item.quantity > c.perPersonCap) throw new CheckoutError(`The maximum is ${c.perPersonCap} tickets per person.`);
  if (item.chosenNumbers && item.chosenNumbers.length !== item.quantity) throw new CheckoutError('Choose one number for each ticket.');
  if (c.skillQuestion && (item.answerIndex === null || item.answerIndex < 0 || item.answerIndex >= c.skillQuestion.options.length)) {
    throw new CheckoutError('Please answer the question.');
  }
  await db
    .insert(basketItems)
    .values({ userId, competitionId: c.id, quantity: item.quantity, chosenNumbers: item.chosenNumbers, answerIndex: item.answerIndex, addedAt: now })
    .onConflictDoUpdate({
      target: [basketItems.userId, basketItems.competitionId],
      set: { quantity: item.quantity, chosenNumbers: item.chosenNumbers, answerIndex: item.answerIndex, addedAt: now },
    });
}

export async function removeFromBasket(db: Db, userId: string, competitionId: string) {
  await db.delete(basketItems).where(and(eq(basketItems.userId, userId), eq(basketItems.competitionId, competitionId)));
}

export interface PlacedOrder {
  orderId: string;
  totalPence: number;
  expiresAt: Date;
  lines: { name: string; quantity: number; unitPence: number }[];
  email: string;
}

/**
 * Turn the basket into a pending order with reserved tickets. Enforces: account checks (verified, 18+, no break or
 * exclusion), competition open, skill answer given, per-person cap (paid and postal entries together), ticket
 * availability and every spend limit.
 */
export async function placeOrder(
  db: Db,
  userId: string,
  opts: { provider: string; reservationMinutes: number; now?: Date; rand?: RandomIntFn },
): Promise<PlacedOrder> {
  const now = opts.now ?? new Date();
  const rand = opts.rand ?? cryptoRandomInt;
  return db.transaction(async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (!u) throw new CheckoutError('Account not found.');
    const blocked = playBlockReason(u, now);
    if (blocked) throw new CheckoutError(blocked);

    const items = await tx.select().from(basketItems).where(eq(basketItems.userId, userId)).orderBy(asc(basketItems.competitionId));
    if (items.length === 0) throw new CheckoutError('Your basket is empty.');

    // Lock the competitions in a fixed order to avoid deadlocks between concurrent checkouts.
    const comps = await tx
      .select()
      .from(competitions)
      .where(inArray(competitions.id, items.map((i) => i.competitionId)))
      .orderBy(asc(competitions.id))
      .for('update');

    const expiresAt = new Date(now.getTime() + opts.reservationMinutes * 60_000);
    const plan: { comp: (typeof comps)[number]; numbers: number[]; allocation: 'random' | 'chosen'; answerCorrect: boolean | null }[] = [];
    let total = 0;

    // Expire stale reservations first so their numbers are free again.
    await tx
      .update(tickets)
      .set({ status: 'expired' })
      .where(and(inArray(tickets.competitionId, comps.map((c) => c.id)), eq(tickets.status, 'reserved'), lt(tickets.reservedUntil, now)));

    for (const item of items) {
      const comp = comps.find((c) => c.id === item.competitionId);
      if (!comp || !isOpen(comp, now)) throw new CheckoutError(`"${comp?.title ?? 'A competition'}" is no longer open. Remove it from your basket.`);
      if (comp.skillQuestion && item.answerIndex === null) throw new CheckoutError(`Please answer the question for "${comp.title}".`);
      const held = await entriesHeld(tx, comp.id, { userId, email: u.email });
      if (!withinCap(held, item.quantity, comp.perPersonCap)) {
        throw new CheckoutError(`"${comp.title}" allows ${comp.perPersonCap} entries per person and you already hold ${held}.`);
      }
      const taken = await takenNumbers(tx, comp.id);
      let numbers: number[];
      try {
        const chosen = item.chosenNumbers?.length && !comp.instantPrizes.length ? item.chosenNumbers : null;
        numbers = chosen ? allocateChosen(comp.maxTickets, taken, chosen) : allocateRandom(comp.maxTickets, taken, item.quantity, rand);
      } catch (e) {
        if (e instanceof AllocationError) throw new CheckoutError(`"${comp.title}": ${e.message}.`);
        throw e;
      }
      const answerCorrect = comp.skillQuestion ? item.answerIndex === comp.skillQuestion.correctIndex : null;
      plan.push({ comp, numbers, allocation: item.chosenNumbers?.length && !comp.instantPrizes.length ? 'chosen' : 'random', answerCorrect });
      total += comp.ticketPricePence * item.quantity;
    }

    const spend = await checkSpend(tx, userId, total, now);
    if (!spend.ok) {
      throw new CheckoutError(
        `This order (${formatPence(total)}) would take you over your ${PERIOD_LABEL[spend.period!].toLowerCase()} spend limit of ${formatPence(spend.limitPence!)}. You have spent ${formatPence(spend.spentPence!)} in that period.`,
      );
    }

    const [order] = await tx.insert(orders).values({ userId, status: 'pending', totalPence: total, provider: opts.provider, createdAt: now, expiresAt }).returning();
    for (const p of plan) {
      await tx.insert(tickets).values(
        p.numbers.map((n) => ({
          competitionId: p.comp.id,
          number: n,
          userId,
          orderId: order!.id,
          source: 'paid' as const,
          allocation: p.allocation,
          status: 'reserved' as const,
          answerCorrect: p.answerCorrect,
          reservedUntil: expiresAt,
          createdAt: now,
        })),
      );
    }
    await tx.delete(basketItems).where(eq(basketItems.userId, userId));
    return {
      orderId: order!.id,
      totalPence: total,
      expiresAt,
      email: u.email,
      lines: plan.map((p) => ({ name: `${p.comp.title}: ${p.numbers.length} ticket${p.numbers.length === 1 ? '' : 's'}`, quantity: p.numbers.length, unitPence: p.comp.ticketPricePence })),
    };
  });
}

export async function recordCheckoutRef(db: Db, orderId: string, providerRef: string) {
  await db.update(orders).set({ providerRef }).where(eq(orders.id, orderId));
}

/** Release an order whose checkout could not be created. */
export async function abandonOrder(db: Db, orderId: string) {
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status: 'failed' }).where(and(eq(orders.id, orderId), eq(orders.status, 'pending')));
    await tx.update(tickets).set({ status: 'expired' }).where(and(eq(tickets.orderId, orderId), eq(tickets.status, 'reserved')));
  });
}

export type Decision = 'capture' | 'decline_credit_cap' | 'decline_instant_win_credit' | 'decline_unavailable' | 'decline_amount' | 'decline_play_blocked' | 'decline_spend_limit';

export type EventOutcome =
  | { kind: 'decided'; orderId: string; decision: Decision; capturePence: number; creditUsedPence: number; creditCapPence: number }
  | { kind: 'already_processed' | 'unknown_order' | 'ignored' | 'failed' };

/** What the player is told when an authorised payment is released instead of taken. */
export function declineMessage(decision: Decision, creditCapPence: number, creditUsedPence: number): string | null {
  switch (decision) {
    case 'decline_credit_cap':
      return `We have not taken this payment: it was made with a credit card and would take your credit card payments this month over the ${formatPence(creditCapPence)} limit (you have used ${formatPence(creditUsedPence)}). Under the industry's voluntary code we cannot accept more by credit card this month. The hold on your card has been released. Please pay by debit card instead.`;
    case 'decline_instant_win_credit':
      return 'We have not taken this payment: credit cards cannot be used for instant win prize draws under the industry\'s voluntary code. The hold on your card has been released. Please pay by debit card instead.';
    case 'decline_unavailable':
      return 'We have not taken this payment: your reserved tickets were no longer available (the reservation lapsed or the competition closed). The hold on your card has been released.';
    case 'decline_amount':
      return 'We have not taken this payment because the amount did not match your order. The hold on your card has been released. Please try again.';
    case 'decline_play_blocked':
      return 'We have not taken this payment: your account cannot enter competitions at the moment (for example during a break or self-exclusion). The hold on your card has been released.';
    case 'decline_spend_limit':
      return 'We have not taken this payment: it would take you over one of your spend limits. The hold on your card has been released.';
    default:
      return null;
  }
}

/**
 * Apply a verified payment event. Idempotent: each provider event id is processed once, and only a pending (or lapsed)
 * order is ever decided. For an authorisation, in one transaction that locks the player:
 *   1. work out which reserved tickets can still be entered (late payments lose tickets that went to someone else or
 *      whose competition closed); the capture amount is their price;
 *   2. apply the DCMS credit card rule (src/lib/checkout/credit-card-rule.ts) to credit and unknown funding;
 *   3. record the decision: "capturing" (tickets stay reserved until the money is taken) or "cancelling".
 * The provider call happens afterwards in settleOrder, which the worker retries until it succeeds.
 */
export async function applyPaymentEvent(db: Db, provider: string, ev: PaymentEvent, now = new Date(), capPence = creditCardCapPence()): Promise<EventOutcome> {
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(webhookEvents).values({ provider, eventId: ev.eventId, receivedAt: now }).onConflictDoNothing().returning();
    if (inserted.length === 0) return { kind: 'already_processed' } as const;
    if (ev.kind === 'ignored') return { kind: 'ignored' } as const;

    const [order] = await tx.select().from(orders).where(eq(orders.id, ev.orderId)).for('update');
    if (!order || order.provider !== provider) return { kind: 'unknown_order' } as const;

    if (ev.kind === 'payment_failed' || ev.kind === 'checkout_expired') {
      if (order.status === 'pending') {
        await tx.update(orders).set({ status: ev.kind === 'payment_failed' ? 'failed' : 'expired' }).where(eq(orders.id, order.id));
        await tx.update(tickets).set({ status: 'expired' }).where(and(eq(tickets.orderId, order.id), eq(tickets.status, 'reserved')));
      }
      return { kind: 'failed' } as const;
    }

    if (order.status !== 'pending' && order.status !== 'expired') return { kind: 'already_processed' } as const;

    // One decision at a time per player, so two orders cannot both fit under the credit card limit.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, order.userId)).for('update');

    const ts = await tx.select().from(tickets).where(eq(tickets.orderId, order.id));
    const compIds = [...new Set(ts.map((t) => t.competitionId))];
    const comps = compIds.length ? await tx.select().from(competitions).where(inArray(competitions.id, compIds)).for('update') : [];
    const keep: number[] = [];
    let capturePence = 0;
    for (const t of ts) {
      const comp = comps.find((c) => c.id === t.competitionId)!;
      let ok = false;
      // Open, not merely 'live': the entries are fixed at the advertised close, even before the worker commits them.
      if (isOpen(comp, now) && (t.status === 'reserved' || t.status === 'expired')) {
        if (t.status === 'reserved') ok = true;
        else {
          // The reservation lapsed: take the number back only if nobody else holds it and the cap still allows it.
          const clash = await tx
            .select({ id: tickets.id })
            .from(tickets)
            .where(and(eq(tickets.competitionId, t.competitionId), eq(tickets.number, t.number), inArray(tickets.status, ['reserved', 'active'])));
          const [owner] = await tx.select({ email: users.email }).from(users).where(eq(users.id, order.userId));
          const held = await entriesHeld(tx, t.competitionId, { userId: order.userId, email: owner?.email ?? '' });
          ok = clash.length === 0 && withinCap(held, 1, comp.perPersonCap);
        }
      }
      if (ok) {
        keep.push(t.id);
        capturePence += comp.ticketPricePence;
      }
    }

    const funding = ev.funding;
    const hasInstantWin = comps.some((c) => c.isInstantWin && ts.some((t) => t.competitionId === c.id && keep.includes(t.id)));
    const used = await creditUsedThisMonth(tx, order.userId, now);
    let decision: Decision;
    // Re-check the player when the money arrives, not only at checkout: a break, a self-exclusion or a spend limit
    // that applies by now wins over an order placed earlier (including a lapsed order paid late).
    const [player] = await tx.select().from(users).where(eq(users.id, order.userId));
    const blocked = player ? playBlockReason(player, now) : 'Account not found.';
    const spend = capturePence > 0 ? await checkSpend(tx, order.userId, capturePence, now, order.id) : { ok: true };
    if (ev.amountPence !== order.totalPence) decision = 'decline_amount';
    else if (capturePence === 0) decision = 'decline_unavailable';
    else if (blocked) decision = 'decline_play_blocked';
    else if (!spend.ok) decision = 'decline_spend_limit';
    else {
      const credit = decideCredit({ funding, hasInstantWin, usedPence: used, amountPence: capturePence, capPence });
      decision = credit.ok ? 'capture' : credit.reason === 'instant_win' ? 'decline_instant_win_credit' : 'decline_credit_cap';
    }

    const base = {
      paymentRef: ev.paymentRef,
      providerRef: ev.providerRef,
      paymentFunding: funding,
      paymentBrand: ev.brand,
      authorisedPence: ev.amountPence,
      decision,
      decidedAt: now,
    };
    if (decision === 'capture') {
      // Held with no expiry until the money is taken, so a slow capture cannot lose them to the basket clean-up.
      if (keep.length) await tx.update(tickets).set({ status: 'reserved', reservedUntil: null }).where(inArray(tickets.id, keep));
      const drop = ts.filter((t) => !keep.includes(t.id) && (t.status === 'reserved' || t.status === 'expired')).map((t) => t.id);
      if (drop.length) await tx.update(tickets).set({ status: 'expired' }).where(inArray(tickets.id, drop));
      // The database re-checks the credit card rule on this update (drizzle/0003_instant_win_guard.sql).
      await tx.update(orders).set({ ...base, status: 'capturing', capturePence }).where(eq(orders.id, order.id));
    } else {
      await tx.update(tickets).set({ status: 'expired' }).where(and(eq(tickets.orderId, order.id), inArray(tickets.status, ['reserved', 'expired'])));
      await tx.update(orders).set({ ...base, status: 'cancelling', capturePence: 0 }).where(eq(orders.id, order.id));
    }
    return { kind: 'decided', orderId: order.id, decision, capturePence: decision === 'capture' ? capturePence : 0, creditUsedPence: used, creditCapPence: capPence } as const;
  });
}

export type SettleOutcome = 'paid' | 'declined' | 'failed' | 'retry' | 'nothing_to_do';

/**
 * Carry out a recorded decision with the provider: capture (then enter the tickets) or cancel (release the hold).
 * Safe to repeat: the provider calls use the order id as idempotency key and the final update only runs once.
 */
export async function settleOrder(db: Db, provider: PaymentProvider, orderId: string, now = new Date()): Promise<SettleOutcome> {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o || o.provider !== provider.name || !o.paymentRef || o.settledAt) return 'nothing_to_do';
  try {
    if (o.status === 'capturing') {
      const r = await provider.capture(o.paymentRef, o.capturePence ?? 0, o.id);
      return await db.transaction(async (tx) => {
        const [cur] = await tx.select().from(orders).where(eq(orders.id, o.id)).for('update');
        if (!cur || cur.status !== 'capturing') return 'nothing_to_do' as const;
        if (r.status === 'failed') {
          await tx.update(orders).set({ status: 'failed', settledAt: now, settleError: 'authorisation could not be captured' }).where(eq(orders.id, o.id));
          await tx.update(tickets).set({ status: 'expired' }).where(and(eq(tickets.orderId, o.id), eq(tickets.status, 'reserved')));
          return 'failed' as const;
        }
        await tx.update(orders).set({ status: 'paid', paidAt: now, settledAt: now, settleError: null }).where(eq(orders.id, o.id));
        const ts = await tx.select().from(tickets).where(and(eq(tickets.orderId, o.id), eq(tickets.status, 'reserved')));
        const comps = ts.length ? await tx.select().from(competitions).where(inArray(competitions.id, [...new Set(ts.map((t) => t.competitionId))])) : [];
        let enteredPence = 0;
        for (const t of ts) {
          const comp = comps.find((c) => c.id === t.competitionId)!;
          if (isOpen(comp, now)) {
            await tx.update(tickets).set({ status: 'active', reservedUntil: null }).where(eq(tickets.id, t.id));
            enteredPence += comp.ticketPricePence;
          } else await tx.update(tickets).set({ status: 'refunded' }).where(eq(tickets.id, t.id));
        }
        // Anything taken but not entered (a competition closed between the decision and the capture) is refunded.
        const refundPence = (cur.capturePence ?? 0) - enteredPence;
        if (refundPence > 0) {
          await tx.insert(refunds).values({ orderId: o.id, amountPence: refundPence, reason: 'The competition closed before the payment was completed', createdAt: now });
        }
        return 'paid' as const;
      });
    }
    if (o.status === 'cancelling') {
      await provider.cancel(o.paymentRef, o.id);
      await db.update(orders).set({ status: 'declined', settledAt: now, settleError: null }).where(and(eq(orders.id, o.id), eq(orders.status, 'cancelling')));
      return 'declined';
    }
    return 'nothing_to_do';
  } catch (e) {
    await db
      .update(orders)
      .set({ settleAttempts: sql`${orders.settleAttempts} + 1`, settleError: (e as Error).message.slice(0, 500) })
      .where(eq(orders.id, o.id));
    return 'retry';
  }
}

/** Apply a verified event and, if it produced a decision, settle it straight away. */
export async function processPaymentEvent(db: Db, provider: PaymentProvider, ev: PaymentEvent, now = new Date()) {
  const outcome = await applyPaymentEvent(db, provider.name, ev, now);
  const settled = outcome.kind === 'decided' ? await settleOrder(db, provider, outcome.orderId, now) : null;
  return { outcome, settled };
}

/** Retry decisions whose provider call has not gone through yet (run by the worker). */
export async function settlePendingOrders(db: Db, provider: PaymentProvider, now = new Date()): Promise<number> {
  const due = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.provider, provider.name), inArray(orders.status, ['capturing', 'cancelling']), sql`${orders.settledAt} IS NULL`))
    .limit(50);
  for (const d of due) await settleOrder(db, provider, d.id, now);
  return due.length;
}

/** Expire unpaid orders and release their numbers (run every minute by the worker). */
export async function expireStaleOrders(db: Db, now = new Date()): Promise<number> {
  return db.transaction(async (tx) => {
    const stale = await tx
      .update(orders)
      .set({ status: 'expired' })
      .where(and(eq(orders.status, 'pending'), lt(orders.expiresAt, now)))
      .returning({ id: orders.id });
    if (stale.length) {
      await tx.update(tickets).set({ status: 'expired' }).where(and(inArray(tickets.orderId, stale.map((s) => s.id)), eq(tickets.status, 'reserved')));
    }
    return stale.length;
  });
}

/** Send pending refunds to the provider (run by the worker). Each refund id doubles as the idempotency key. */
export async function processRefunds(db: Db, provider: PaymentProvider, now = new Date()): Promise<{ done: number; failed: number }> {
  const pending = await db
    .select({ r: refunds, o: orders })
    .from(refunds)
    .innerJoin(orders, eq(orders.id, refunds.orderId))
    .where(and(eq(refunds.status, 'pending'), eq(orders.provider, provider.name)))
    .limit(50);
  let done = 0;
  let failed = 0;
  for (const { r, o } of pending) {
    try {
      if (!o.paymentRef) throw new Error('order has no payment reference');
      const res = await provider.refund(o.paymentRef, r.amountPence, r.id);
      if (res.status === 'failed') throw new Error('provider reported the refund failed');
      await db.transaction(async (tx) => {
        await tx.update(refunds).set({ status: 'succeeded', providerRef: res.refundRef, processedAt: now, error: null }).where(eq(refunds.id, r.id));
        const [sum] = await tx
          .select({ s: sql<string>`coalesce(sum(${refunds.amountPence}), 0)` })
          .from(refunds)
          .where(and(eq(refunds.orderId, o.id), eq(refunds.status, 'succeeded')));
        const refunded = Number(sum?.s ?? 0);
        await tx.update(orders).set({ status: refunded >= o.totalPence ? 'refunded' : 'partially_refunded' }).where(eq(orders.id, o.id));
      });
      done++;
    } catch (e) {
      await db.update(refunds).set({ status: 'failed', error: (e as Error).message.slice(0, 500), processedAt: now }).where(eq(refunds.id, r.id));
      failed++;
    }
  }
  return { done, failed };
}
