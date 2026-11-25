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
/** Breaks, self-exclusion and spend limits re-checked when the money arrives (red team, November 2026). */
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { orders } from '../src/lib/db/schema';
import { addToBasket, expireStaleOrders, placeOrder, processPaymentEvent } from '../src/lib/checkout/service';
import { TestProvider } from '../src/lib/payments/test-provider';
import { selfExclude, takeBreak } from '../src/lib/account/service';
import { setLimit } from '../src/lib/limits/spend';

let db: Db;
let provider: TestProvider;
beforeEach(async () => {
  ({ db } = await testDb());
  provider = new TestProvider('s'.repeat(32), 'http://x');
});

async function order(userId: string, competitionId: string, quantity: number, now = new Date()) {
  await addToBasket(db, userId, { competitionId, quantity, chosenNumbers: null, answerIndex: null }, now);
  return placeOrder(db, userId, { provider: 'test', reservationMinutes: 30, now });
}
let seq = 0;
async function pay(orderId: string, amountPence: number, now = new Date()) {
  const r = await processPaymentEvent(db, provider, { kind: 'payment_authorised', eventId: `evt_${seq++}`, orderId, providerRef: 'ref', paymentRef: `pay_${orderId}`, amountPence, funding: 'debit', brand: 'visa' }, now);
  return r.outcome.kind === 'decided' ? r.outcome.decision : r.outcome.kind;
}

describe('payment-time checks', () => {
  it('declines a lapsed order paid after the player self-excluded', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { ticketPricePence: 500, maxTickets: 1000, perPersonCap: 100 });
    const o1 = await order(u.id, c.id, 2);
    await expireStaleOrders(db, new Date(Date.now() + 31 * 60_000)); // order 1 lapses unpaid
    await selfExclude(db, u.id, 180);
    expect(await pay(o1.orderId, o1.totalPence)).toBe('decline_play_blocked');
  });

  it('declines a lapsed order whose payment would break a spend limit set since', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { ticketPricePence: 500, maxTickets: 1000, perPersonCap: 100 });
    await setLimit(db, u.id, 'day', 1000);
    const o1 = await order(u.id, c.id, 2); // 1000p, exactly the limit
    await expireStaleOrders(db, new Date(Date.now() + 31 * 60_000)); // lapses unpaid
    const o2 = await order(u.id, c.id, 2, new Date(Date.now() + 32 * 60_000)); // a second 1000p order, paid
    expect(await pay(o2.orderId, o2.totalPence, new Date(Date.now() + 33 * 60_000))).toBe('capture');
    expect(await pay(o1.orderId, o1.totalPence, new Date(Date.now() + 34 * 60_000))).toBe('decline_spend_limit');
  });

  it('cancels orders waiting for payment when a break starts', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { ticketPricePence: 500, maxTickets: 1000, perPersonCap: 100 });
    const o1 = await order(u.id, c.id, 1);
    await takeBreak(db, u.id, 1);
    const [o] = await db.select().from(orders).where(eq(orders.id, o1.orderId));
    expect(o!.status).toBe('expired');
    expect(await pay(o1.orderId, o1.totalPence)).toBe('decline_play_blocked');
  });

  it('still takes an ordinary payment', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { ticketPricePence: 500, maxTickets: 1000, perPersonCap: 100 });
    await setLimit(db, u.id, 'day', 1000);
    const o1 = await order(u.id, c.id, 2);
    expect(await pay(o1.orderId, o1.totalPence)).toBe('capture');
  });
});
