import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { addPaidTickets, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { orders, refunds, tickets } from '../src/lib/db/schema';
import { addToBasket, applyPaymentEvent, CheckoutError, expireStaleOrders, placeOrder, processRefunds } from '../src/lib/checkout/service';
import { recordPostalEntry } from '../src/lib/competitions/postal';
import { setLimit } from '../src/lib/limits/spend';
import { TestProvider } from '../src/lib/payments/test-provider';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

const opts = { provider: 'test', reservationMinutes: 30 };
const paid = (orderId: string, amountPence: number, id = `evt_${orderId}`) => ({ kind: 'payment_succeeded' as const, eventId: id, orderId, providerRef: 'ref', paymentRef: 'pay', amountPence });

describe('checkout', () => {
  it('reserves random tickets, then activates them on a verified payment', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db);
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 3, chosenNumbers: null, answerIndex: null });
    const o = await placeOrder(db, u.id, opts);
    expect(o.totalPence).toBe(750);
    let ts = await db.select().from(tickets).where(eq(tickets.orderId, o.orderId));
    expect(ts.map((t) => t.status)).toEqual(['reserved', 'reserved', 'reserved']);
    expect(ts.every((t) => t.allocation === 'random')).toBe(true);
    expect(await applyPaymentEvent(db, 'test', paid(o.orderId, 750))).toBe('paid');
    ts = await db.select().from(tickets).where(eq(tickets.orderId, o.orderId));
    expect(ts.every((t) => t.status === 'active')).toBe(true);
  });

  it('records chosen numbers and refuses taken ones', async () => {
    const u = await makeUser(db);
    const v = await makeUser(db);
    const c = await makeCompetition(db);
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 2, chosenNumbers: [7, 8], answerIndex: null });
    const o = await placeOrder(db, u.id, opts);
    const ts = await db.select().from(tickets).where(eq(tickets.orderId, o.orderId));
    expect(ts.map((t) => [t.number, t.allocation])).toEqual([[7, 'chosen'], [8, 'chosen']]);
    await addToBasket(db, v.id, { competitionId: c.id, quantity: 1, chosenNumbers: [8], answerIndex: null });
    await expect(placeOrder(db, v.id, opts)).rejects.toThrow('already gone');
  });

  it('enforces the per-person cap across orders and postal entries', async () => {
    const u = await makeUser(db, { email: 'cap@example.test' });
    const admin = await makeUser(db, { role: 'admin' });
    const c = await makeCompetition(db, { perPersonCap: 3 });
    await recordPostalEntry(db, { id: admin.id, role: 'admin' }, { competitionId: c.id, fullName: 'Cap Person', email: 'CAP@example.test', postalAddress: '2 Low Road, York', answerIndex: null, receivedAt: new Date() });
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 2, chosenNumbers: null, answerIndex: null });
    await placeOrder(db, u.id, opts);
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 1, chosenNumbers: null, answerIndex: null });
    await expect(placeOrder(db, u.id, opts)).rejects.toThrow('3 entries per person');
    await expect(addToBasket(db, u.id, { competitionId: c.id, quantity: 4, chosenNumbers: null, answerIndex: null })).rejects.toThrow(CheckoutError);
    const r = await recordPostalEntry(db, { id: admin.id, role: 'admin' }, { competitionId: c.id, fullName: 'Cap Person', email: 'cap@example.test', postalAddress: '2 Low Road, York', answerIndex: null, receivedAt: new Date() });
    expect(r.status).toBe('rejected');
  });

  it('enforces spend limits, including £0', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db);
    await setLimit(db, u.id, 'month', 500);
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 3, chosenNumbers: null, answerIndex: null });
    await expect(placeOrder(db, u.id, opts)).rejects.toThrow('monthly');
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 2, chosenNumbers: null, answerIndex: null });
    await placeOrder(db, u.id, opts);
    await setLimit(db, u.id, 'day', 0);
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 1, chosenNumbers: null, answerIndex: null });
    await expect(placeOrder(db, u.id, opts)).rejects.toThrow('daily');
  });

  it('refuses players who are under 18, unverified, on a break or self-excluded', async () => {
    const c = await makeCompetition(db);
    const cases = [
      await makeUser(db, { dateOfBirth: '2015-01-01' }),
      await makeUser(db, { emailVerifiedAt: null }),
      await makeUser(db, { breakUntil: new Date(Date.now() + 86400_000) }),
      await makeUser(db, { selfExcludedUntil: new Date(Date.now() + 86400_000) }),
    ];
    for (const u of cases) {
      await addToBasket(db, u.id, { competitionId: c.id, quantity: 1, chosenNumbers: null, answerIndex: null });
      await expect(placeOrder(db, u.id, opts)).rejects.toThrow(CheckoutError);
    }
  });

  it('requires an answer when there is a question', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { skillQuestion: { question: 'Capital of Wales?', options: ['Cardiff', 'Leeds'], correctIndex: 0 } });
    await expect(addToBasket(db, u.id, { competitionId: c.id, quantity: 1, chosenNumbers: null, answerIndex: null })).rejects.toThrow('answer');
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 1, chosenNumbers: null, answerIndex: 1 });
    const o = await placeOrder(db, u.id, opts);
    const [t] = await db.select().from(tickets).where(eq(tickets.orderId, o.orderId));
    expect(t!.answerCorrect).toBe(false);
  });

  it('refunds a payment that arrives after the reservation lapsed and the number went to someone else', async () => {
    const u = await makeUser(db);
    const v = await makeUser(db);
    const c = await makeCompetition(db);
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 1, chosenNumbers: [5], answerIndex: null });
    const o = await placeOrder(db, u.id, opts);
    expect(await expireStaleOrders(db, new Date(Date.now() + 31 * 60_000))).toBe(1);
    await addPaidTickets(db, c.id, v.id, [5]);
    expect(await applyPaymentEvent(db, 'test', paid(o.orderId, 250))).toBe('refund_due');
    const [r] = await db.select().from(refunds).where(eq(refunds.orderId, o.orderId));
    expect(r!.amountPence).toBe(250);
    const res = await processRefunds(db, new TestProvider('s'.repeat(32), 'http://x'));
    expect(res).toEqual({ done: 1, failed: 0 });
    const [ord] = await db.select().from(orders).where(eq(orders.id, o.orderId));
    expect(ord!.status).toBe('refunded');
  });

  it('is idempotent and checks the amount', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db);
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 2, chosenNumbers: null, answerIndex: null });
    const o = await placeOrder(db, u.id, opts);
    expect(await applyPaymentEvent(db, 'test', paid(o.orderId, 500))).toBe('paid');
    expect(await applyPaymentEvent(db, 'test', paid(o.orderId, 500))).toBe('already_processed');
    expect(await applyPaymentEvent(db, 'test', paid(o.orderId, 500, 'another-event'))).toBe('already_processed');
    expect(await applyPaymentEvent(db, 'stripe', paid(o.orderId, 500, 'x'))).toBe('unknown_order');

    await addToBasket(db, u.id, { competitionId: c.id, quantity: 1, chosenNumbers: null, answerIndex: null });
    const o2 = await placeOrder(db, u.id, opts);
    expect(await applyPaymentEvent(db, 'test', paid(o2.orderId, 1))).toBe('amount_mismatch');
    const ts = await db.select().from(tickets).where(eq(tickets.orderId, o2.orderId));
    expect(ts.every((t) => t.status === 'refunded')).toBe(true);
  });

  it('never sells the same number twice under concurrent checkouts', async () => {
    const c = await makeCompetition(db, { maxTickets: 20, perPersonCap: 2 });
    const us = await Promise.all(Array.from({ length: 10 }, () => makeUser(db)));
    for (const u of us) await addToBasket(db, u.id, { competitionId: c.id, quantity: 2, chosenNumbers: null, answerIndex: null });
    await Promise.all(us.map((u) => placeOrder(db, u.id, opts)));
    const ts = await db.select().from(tickets).where(eq(tickets.competitionId, c.id));
    expect(new Set(ts.map((t) => t.number)).size).toBe(20);
    const extra = await makeUser(db);
    await addToBasket(db, extra.id, { competitionId: c.id, quantity: 1, chosenNumbers: null, answerIndex: null });
    await expect(placeOrder(db, extra.id, opts)).rejects.toThrow('left');
  });
});
