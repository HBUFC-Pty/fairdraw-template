/** DCMS Voluntary Code clause 1.3: credit card payments capped at £250 per player per month, none for instant wins. */
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { expectDbError, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { orders, tickets } from '../src/lib/db/schema';
import { addToBasket, placeOrder, processPaymentEvent, settlePendingOrders } from '../src/lib/checkout/service';
import { creditAllowance, creditUsedThisMonth, decideCredit } from '../src/lib/checkout/credit-card-rule';
import { TestProvider } from '../src/lib/payments/test-provider';
import type { FundingType } from '../src/lib/payments/types';
import { siteConfig, siteConfigSchema, creditCardCapPence } from '../src/lib/site-config';
import { ukMonthBounds } from '../src/lib/time';

let db: Db;
let provider: TestProvider;
beforeEach(async () => {
  ({ db } = await testDb());
  provider = new TestProvider('s'.repeat(32), 'http://x');
});

/** £50 tickets, so 5 tickets is exactly the £250 limit. */
async function comp(over: Parameters<typeof makeCompetition>[1] = {}) {
  return makeCompetition(db, { ticketPricePence: 5000, maxTickets: 1000, perPersonCap: 100, ...over });
}

async function order(userId: string, competitionId: string, quantity: number) {
  await addToBasket(db, userId, { competitionId, quantity, chosenNumbers: null, answerIndex: null });
  return placeOrder(db, userId, { provider: 'test', reservationMinutes: 30 });
}

let seq = 0;
async function authorise(orderId: string, amountPence: number, funding: FundingType, now = new Date(), eventId = `evt_${seq++}`) {
  const r = await processPaymentEvent(db, provider, { kind: 'payment_authorised', eventId, orderId, providerRef: 'ref', paymentRef: `pay_${orderId}`, amountPence, funding, brand: 'visa' }, now);
  return r.outcome.kind === 'decided' ? `${r.outcome.decision}:${r.settled}` : r.outcome.kind;
}

async function statusOf(orderId: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  const ts = await db.select({ s: tickets.status }).from(tickets).where(eq(tickets.orderId, orderId));
  return { order: o!, tickets: ts.map((t) => t.s) };
}

describe('credit card limit (£250 per player per calendar month)', () => {
  it('accepts credit payments under and exactly at the limit, and refuses one pence over', async () => {
    const u = await makeUser(db);
    const c = await comp();
    const o1 = await order(u.id, c.id, 3); // £150
    expect(await authorise(o1.orderId, 15000, 'credit')).toBe('capture:paid');
    const o2 = await order(u.id, c.id, 2); // £100: exactly £250 in total
    expect(await authorise(o2.orderId, 10000, 'credit')).toBe('capture:paid');
    expect(await creditUsedThisMonth(db, u.id)).toBe(25000);
    const o3 = await order(u.id, c.id, 1); // £50 more: over
    expect(await authorise(o3.orderId, 5000, 'credit')).toBe('decline_credit_cap:declined');
    const s3 = await statusOf(o3.orderId);
    expect(s3.order.status).toBe('declined');
    expect(s3.tickets).toEqual(['expired']);
    expect(provider.cancels.map((x) => x.key)).toEqual([o3.orderId]);
    expect(provider.captures.map((x) => x.key)).toEqual([o1.orderId, o2.orderId]);
  });

  it('refuses a single credit payment over the limit outright', async () => {
    const u = await makeUser(db);
    const c = await comp();
    const o = await order(u.id, c.id, 6); // £300
    expect(await authorise(o.orderId, 30000, 'credit')).toBe('decline_credit_cap:declined');
  });

  it('treats an unknown funding type as credit', async () => {
    const u = await makeUser(db);
    const c = await comp();
    const o1 = await order(u.id, c.id, 5);
    expect(await authorise(o1.orderId, 25000, 'unknown')).toBe('capture:paid');
    const o2 = await order(u.id, c.id, 1);
    expect(await authorise(o2.orderId, 5000, 'unknown')).toBe('decline_credit_cap:declined');
    expect(await creditUsedThisMonth(db, u.id)).toBe(25000);
  });

  it('does not limit debit or prepaid cards, and they do not use up the allowance', async () => {
    const u = await makeUser(db);
    const c = await comp();
    const o1 = await order(u.id, c.id, 6);
    expect(await authorise(o1.orderId, 30000, 'debit')).toBe('capture:paid');
    const o2 = await order(u.id, c.id, 6);
    expect(await authorise(o2.orderId, 30000, 'prepaid')).toBe('capture:paid');
    expect(await creditUsedThisMonth(db, u.id)).toBe(0);
    const o3 = await order(u.id, c.id, 5);
    expect(await authorise(o3.orderId, 25000, 'credit')).toBe('capture:paid');
  });

  it('is per player: another player has their own allowance', async () => {
    const [a, b] = [await makeUser(db), await makeUser(db)];
    const c = await comp();
    expect(await authorise((await order(a.id, c.id, 5)).orderId, 25000, 'credit')).toBe('capture:paid');
    expect(await authorise((await order(b.id, c.id, 5)).orderId, 25000, 'credit')).toBe('capture:paid');
  });

  it('uses the calendar month in UK time (Europe/London), not UTC', async () => {
    // 30 September 2026 22:30 UTC is 23:30 BST on 30 September; 23:30 UTC is 00:30 BST on 1 October.
    const septLate = new Date('2026-09-30T22:30:00Z');
    const octEarly = new Date('2026-09-30T23:30:00Z');
    expect(ukMonthBounds(septLate).label).toBe('2026-09');
    expect(ukMonthBounds(octEarly).label).toBe('2026-10');
    expect(ukMonthBounds(octEarly).start.toISOString()).toBe('2026-09-30T23:00:00.000Z');
    expect(ukMonthBounds(new Date('2026-12-31T23:59:00Z')).end.toISOString()).toBe('2027-01-01T00:00:00.000Z');

    const u = await makeUser(db);
    const c = await comp();
    expect(await authorise((await order(u.id, c.id, 4)).orderId, 20000, 'credit', septLate)).toBe('capture:paid');
    expect(await authorise((await order(u.id, c.id, 2)).orderId, 10000, 'credit', new Date('2026-09-30T22:45:00Z'))).toBe('decline_credit_cap:declined');
    expect(await authorise((await order(u.id, c.id, 2)).orderId, 10000, 'credit', octEarly)).toBe('capture:paid');
    expect(await creditUsedThisMonth(db, u.id, octEarly)).toBe(10000);
  });

  it('lets only one of two concurrent credit orders through when together they would exceed the limit', async () => {
    const u = await makeUser(db);
    const c = await comp();
    const o1 = await order(u.id, c.id, 3);
    const o2 = await order(u.id, c.id, 3);
    const results = await Promise.all([authorise(o1.orderId, 15000, 'credit'), authorise(o2.orderId, 15000, 'credit')]);
    expect(results.sort()).toEqual(['capture:paid', 'decline_credit_cap:declined']);
    expect(await creditUsedThisMonth(db, u.id)).toBe(15000);
  });

  it('ignores a replayed webhook: no second decision, capture or cancel', async () => {
    const u = await makeUser(db);
    const c = await comp();
    const o = await order(u.id, c.id, 6);
    expect(await authorise(o.orderId, 30000, 'credit', new Date(), 'evt_same')).toBe('decline_credit_cap:declined');
    expect(await authorise(o.orderId, 30000, 'credit', new Date(), 'evt_same')).toBe('already_processed');
    expect(await authorise(o.orderId, 30000, 'debit', new Date(), 'evt_other')).toBe('already_processed');
    expect(provider.cancels).toHaveLength(1);
    expect(provider.captures).toHaveLength(0);
  });

  it('a released authorisation frees the reserved ticket numbers for other players', async () => {
    const u = await makeUser(db);
    const v = await makeUser(db);
    const c = await comp({ maxTickets: 6, perPersonCap: 6 });
    const o = await order(u.id, c.id, 6); // every ticket
    expect(await authorise(o.orderId, 30000, 'credit')).toBe('decline_credit_cap:declined');
    expect((await statusOf(o.orderId)).tickets.every((t) => t === 'expired')).toBe(true);
    const o2 = await order(v.id, c.id, 6);
    expect(await authorise(o2.orderId, 30000, 'debit')).toBe('capture:paid');
  });

  it('retries a capture that failed temporarily, and expires tickets if the authorisation can no longer be taken', async () => {
    const u = await makeUser(db);
    const c = await comp();
    const o = await order(u.id, c.id, 1);
    provider.failNextCapture = 'temporary';
    expect(await authorise(o.orderId, 5000, 'credit')).toBe('capture:retry');
    expect((await statusOf(o.orderId)).order.status).toBe('capturing');
    expect(await creditUsedThisMonth(db, u.id)).toBe(5000); // held against the limit while capturing
    expect(await settlePendingOrders(db, provider)).toBe(1);
    expect((await statusOf(o.orderId)).order.status).toBe('paid');
    expect((await statusOf(o.orderId)).tickets).toEqual(['active']);

    const o2 = await order(u.id, c.id, 1);
    provider.failNextCapture = 'final';
    expect(await authorise(o2.orderId, 5000, 'debit')).toBe('capture:failed');
    expect(await statusOf(o2.orderId)).toMatchObject({ order: { status: 'failed' }, tickets: ['expired'] });
  });

  it('shows the player their remaining allowance', async () => {
    const u = await makeUser(db);
    const c = await comp();
    await authorise((await order(u.id, c.id, 2)).orderId, 10000, 'credit');
    const a = await creditAllowance(db, u.id);
    expect(a).toMatchObject({ capPence: 25000, usedPence: 10000, remainingPence: 15000 });
  });
});

describe('no credit cards for instant win prize draws', () => {
  it('refuses credit and unknown funding for an order containing an instant win, but accepts debit', async () => {
    const u = await makeUser(db);
    const iw = await comp({ isInstantWin: true });
    const ordinary = await comp();
    await addToBasket(db, u.id, { competitionId: iw.id, quantity: 1, chosenNumbers: null, answerIndex: null });
    await addToBasket(db, u.id, { competitionId: ordinary.id, quantity: 1, chosenNumbers: null, answerIndex: null });
    const o = await placeOrder(db, u.id, { provider: 'test', reservationMinutes: 30 });
    expect(await authorise(o.orderId, 10000, 'credit')).toBe('decline_instant_win_credit:declined');
    const o2 = await order(u.id, iw.id, 1);
    expect(await authorise(o2.orderId, 5000, 'unknown')).toBe('decline_instant_win_credit:declined');
    const o3 = await order(u.id, iw.id, 1);
    expect(await authorise(o3.orderId, 5000, 'debit')).toBe('capture:paid');
  });

  it('the instant win flag cannot change once a competition is published', async () => {
    const iw = await comp({ isInstantWin: true });
    const { competitions } = await import('../src/lib/db/schema');
    await expectDbError(db.update(competitions).set({ isInstantWin: false }).where(eq(competitions.id, iw.id)), 'cannot change');
  });
});

describe('the database refuses to capture what breaks clause 1.3, whatever the code does', () => {
  it('blocks capturing credit over £250 in the month or credit for an instant win', async () => {
    const u = await makeUser(db);
    const c = await comp();
    const o1 = await order(u.id, c.id, 5);
    expect(await authorise(o1.orderId, 25000, 'credit')).toBe('capture:paid');
    const o2 = await order(u.id, c.id, 1);
    await expectDbError(
      db.update(orders).set({ status: 'capturing', paymentFunding: 'credit', capturePence: 5000, decidedAt: new Date() }).where(eq(orders.id, o2.orderId)),
      'exceed £250',
    );
    const iw = await comp({ isInstantWin: true });
    const o3 = await order(u.id, iw.id, 1);
    await expectDbError(
      db.update(orders).set({ status: 'capturing', paymentFunding: 'unknown', capturePence: 100, decidedAt: new Date() }).where(eq(orders.id, o3.orderId)),
      'instant win',
    );
  });
});

describe('configuration', () => {
  it('ships with the DCMS figures', () => {
    expect(creditCardCapPence()).toBe(25000);
    expect(siteConfig.payments.instantWinCreditCardBan).toBe(true);
  });
  it('may lower the cap but never raise it, and cannot switch off the instant win ban', () => {
    const withPayments = (p: Record<string, unknown>) => siteConfigSchema.safeParse({ ...siteConfig, payments: { ...siteConfig.payments, ...p } }).success;
    expect(withPayments({ creditCardMonthlyCapPounds: 100 })).toBe(true);
    expect(withPayments({ creditCardMonthlyCapPounds: 0 })).toBe(true);
    expect(withPayments({ creditCardMonthlyCapPounds: 250.01 })).toBe(false);
    expect(withPayments({ creditCardMonthlyCapPounds: 1000 })).toBe(false);
    expect(withPayments({ instantWinCreditCardBan: false })).toBe(false);
  });
  it('the pure decision', () => {
    expect(decideCredit({ funding: 'debit', hasInstantWin: true, usedPence: 99999, amountPence: 1, capPence: 25000 })).toEqual({ ok: true });
    expect(decideCredit({ funding: 'credit', hasInstantWin: false, usedPence: 24999, amountPence: 1, capPence: 25000 })).toEqual({ ok: true });
    expect(decideCredit({ funding: 'credit', hasInstantWin: false, usedPence: 25000, amountPence: 1, capPence: 25000 })).toMatchObject({ ok: false, reason: 'cap' });
  });
});
