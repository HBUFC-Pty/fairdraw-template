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
/** Bundle prices (src/lib/competitions/bundles.ts) through checkout, payment, refunds and releases. */
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { expectDbError, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { competitions, orders, tickets } from '../src/lib/db/schema';
import { competitionInputSchema, createCompetition, publishCompetition } from '../src/lib/competitions/service';
import { addToBasket, placeOrder, processPaymentEvent } from '../src/lib/checkout/service';
import { TestProvider } from '../src/lib/payments/test-provider';
import { AdminError, issueRefund } from '../src/lib/admin/service';
import { bundleOffers, priceFor, splitPrice } from '../src/lib/competitions/bundles';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});
const H = 3600_000;

async function bundled() {
  const owner = await makeUser(db, { role: 'owner' });
  const c = await createCompetition(db, { id: owner.id, role: 'owner' }, {
    slug: 'bundled', title: 'Bundled', prizeDescription: 'A prize sold in bundles.', prizeValuePence: 50_000, ticketPricePence: 100,
    maxTickets: 1000, perPersonCap: 100, opensAt: new Date(Date.now() - H), closesAt: new Date(Date.now() + H), drawAt: new Date(Date.now() + H),
    bundles: [{ quantity: 10, pricePence: 800 }, { quantity: 3, pricePence: 250 }],
  });
  await publishCompetition(db, { id: owner.id, role: 'owner' }, c.id);
  return { c, owner };
}

describe('bundle prices', () => {
  it('always charges the lowest mix of bundles and single tickets', () => {
    const b = [{ quantity: 10, pricePence: 800 }, { quantity: 3, pricePence: 250 }];
    expect(priceFor(1, 100, b)).toBe(100);
    expect(priceFor(3, 100, b)).toBe(250);
    expect(priceFor(10, 100, b)).toBe(800);
    expect(priceFor(13, 100, b)).toBe(1050);
    expect(priceFor(12, 100, b)).toBe(1000);
    expect(priceFor(7, 100, [])).toBe(700);
    expect(splitPrice(800, 3)).toEqual([267, 267, 266]);
    expect(bundleOffers(100, b)[0]).toEqual({ quantity: 10, pricePence: 800, savingPence: 200 });
  });

  it('refuses bundles bigger than the cap, dearer than single tickets, or repeated', () => {
    const base = { slug: 'x', title: 'Xyz', prizeDescription: 'A prize sold in bundles.', prizeValuePence: 100, ticketPricePence: 100, maxTickets: 100, perPersonCap: 10, opensAt: new Date(), closesAt: new Date(Date.now() + H), drawAt: new Date(Date.now() + H) };
    expect(() => competitionInputSchema.parse({ ...base, bundles: [{ quantity: 20, pricePence: 1500 }] })).toThrow(/per-person cap/);
    expect(() => competitionInputSchema.parse({ ...base, bundles: [{ quantity: 5, pricePence: 500 }] })).toThrow(/cost less/);
    expect(() => competitionInputSchema.parse({ ...base, bundles: [{ quantity: 5, pricePence: 400 }, { quantity: 5, pricePence: 300 }] })).toThrow(/same number/);
  });

  it("charges the bundle price, records each ticket's share, and takes exactly that payment", async () => {
    const { c } = await bundled();
    const u = await makeUser(db);
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 13, chosenNumbers: null, answerIndex: null });
    const o = await placeOrder(db, u.id, { provider: 'test', reservationMinutes: 30 });
    expect(o.totalPence).toBe(1050);
    const ts = await db.select().from(tickets).where(eq(tickets.orderId, o.orderId));
    expect(ts.reduce((s, t) => s + t.pricePence!, 0)).toBe(1050);
    const provider = new TestProvider('s'.repeat(32), 'http://x');
    const r = await processPaymentEvent(db, provider, { kind: 'payment_authorised', eventId: 'e1', orderId: o.orderId, providerRef: 'r', paymentRef: 'p', amountPence: 1050, funding: 'debit', brand: 'visa' });
    expect(r.outcome.kind === 'decided' && r.outcome.capturePence).toBe(1050);
    const [paid] = await db.select().from(orders).where(eq(orders.id, o.orderId));
    expect(paid!.status).toBe('paid');
    // Releasing the tickets means refunding what was paid for them, not the full ticket price.
    const admin = await makeUser(db, { role: 'admin' });
    await expect(issueRefund(db, { id: admin.id, role: 'admin' }, { orderId: o.orderId, amountPence: 1300, reason: 'x', releaseTickets: true })).rejects.toBeInstanceOf(AdminError);
    expect((await issueRefund(db, { id: admin.id, role: 'admin' }, { orderId: o.orderId, amountPence: 1050, reason: 'x', releaseTickets: true })).released).toBe(13);
  });

  it("fixes bundle prices once published, and a ticket's price never changes", async () => {
    const { c } = await bundled();
    await expectDbError(db.update(competitions).set({ bundles: [] }).where(eq(competitions.id, c.id)), 'bundle prices never change');
    const u = await makeUser(db);
    await addToBasket(db, u.id, { competitionId: c.id, quantity: 3, chosenNumbers: null, answerIndex: null });
    const o = await placeOrder(db, u.id, { provider: 'test', reservationMinutes: 30 });
    await expectDbError(db.update(tickets).set({ pricePence: 1 }).where(eq(tickets.orderId, o.orderId)), 'price never changes');
  });
});
