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
        numbers = item.chosenNumbers?.length ? allocateChosen(comp.maxTickets, taken, item.chosenNumbers) : allocateRandom(comp.maxTickets, taken, item.quantity, rand);
      } catch (e) {
        if (e instanceof AllocationError) throw new CheckoutError(`"${comp.title}": ${e.message}.`);
        throw e;
      }
      const answerCorrect = comp.skillQuestion ? item.answerIndex === comp.skillQuestion.correctIndex : null;
      plan.push({ comp, numbers, allocation: item.chosenNumbers?.length ? 'chosen' : 'random', answerCorrect });
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

export type ConfirmOutcome = 'paid' | 'already_processed' | 'refund_due' | 'amount_mismatch' | 'unknown_order';

/**
 * Apply a verified payment event. Idempotent: each provider event id is processed once, and a paid order is never
 * processed again. A payment that arrives after its reservation lapsed or after the competition closed is refunded
 * in full rather than added to a draw.
 */
export async function applyPaymentEvent(db: Db, provider: string, ev: PaymentEvent, now = new Date()): Promise<ConfirmOutcome | 'ignored' | 'failed'> {
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(webhookEvents).values({ provider, eventId: ev.eventId, receivedAt: now }).onConflictDoNothing().returning();
    if (inserted.length === 0) return 'already_processed';
    if (ev.kind === 'ignored') return 'ignored';

    const [order] = await tx.select().from(orders).where(eq(orders.id, ev.orderId)).for('update');
    if (!order || order.provider !== provider) return 'unknown_order';

    if (ev.kind === 'payment_failed' || ev.kind === 'checkout_expired') {
      if (order.status === 'pending') {
        await tx.update(orders).set({ status: ev.kind === 'payment_failed' ? 'failed' : 'expired' }).where(eq(orders.id, order.id));
        await tx.update(tickets).set({ status: 'expired' }).where(and(eq(tickets.orderId, order.id), eq(tickets.status, 'reserved')));
      }
      return 'failed';
    }

    if (order.status === 'paid' || order.status === 'refunded' || order.status === 'partially_refunded') return 'already_processed';
    if (ev.amountPence !== order.totalPence) {
      // Never activate tickets for the wrong amount. Record the payment and refund what was taken.
      await tx.update(orders).set({ status: 'paid', paidAt: now, paymentRef: ev.paymentRef, providerRef: ev.providerRef }).where(eq(orders.id, order.id));
      await tx.update(tickets).set({ status: 'refunded' }).where(and(eq(tickets.orderId, order.id), inArray(tickets.status, ['reserved', 'expired'])));
      if (ev.amountPence > 0) await tx.insert(refunds).values({ orderId: order.id, amountPence: ev.amountPence, reason: 'Amount paid did not match the order total', createdAt: now });
      return 'amount_mismatch';
    }

    await tx.update(orders).set({ status: 'paid', paidAt: now, paymentRef: ev.paymentRef, providerRef: ev.providerRef }).where(eq(orders.id, order.id));
    const ts = await tx.select().from(tickets).where(eq(tickets.orderId, order.id));
    const compIds = [...new Set(ts.map((t) => t.competitionId))];
    const comps = compIds.length ? await tx.select().from(competitions).where(inArray(competitions.id, compIds)).for('update') : [];
    let refundPence = 0;
    for (const t of ts) {
      const comp = comps.find((c) => c.id === t.competitionId)!;
      let ok = false;
      if (comp.status === 'live') {
        if (t.status === 'reserved') ok = true;
        else if (t.status === 'expired') {
          // The reservation lapsed: take the number back only if nobody else holds it.
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
        await tx.update(tickets).set({ status: 'active', reservedUntil: null }).where(eq(tickets.id, t.id));
      } else {
        await tx.update(tickets).set({ status: 'refunded' }).where(eq(tickets.id, t.id));
        refundPence += comp.ticketPricePence;
      }
    }
    if (refundPence > 0) {
      await tx.insert(refunds).values({ orderId: order.id, amountPence: refundPence, reason: 'Payment arrived after the tickets were released or the competition closed', createdAt: now });
      return 'refund_due';
    }
    return 'paid';
  });
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
