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
/** Instant wins that anyone can check (src/lib/competitions/instant.ts and drizzle/0005). */
import { beforeEach, describe, expect, it } from 'vitest';
import { and, eq, isNotNull } from 'drizzle-orm';
import { expectDbError, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { competitions, instantWins, orders, tickets } from '../src/lib/db/schema';
import { createCompetition, publishCompetition } from '../src/lib/competitions/service';
import { addToBasket, CheckoutError } from '../src/lib/checkout/service';
import { instantCommitment, instantRows, verifyInstantRecord, INSTANT_METHOD } from '../src/lib/competitions/instant';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

const H = 3600_000;
async function instantComp(over: Record<string, unknown> = {}) {
  const owner = await makeUser(db, { role: 'owner' });
  const now = Date.now();
  const c = await createCompetition(db, { id: owner.id, role: 'owner' }, {
    slug: `instant-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Instant test',
    prizeDescription: 'A test prize with instant wins.',
    prizeValuePence: 10_000,
    ticketPricePence: 100,
    maxTickets: 10,
    perPersonCap: 10,
    opensAt: new Date(now - H),
    closesAt: new Date(now + H),
    drawAt: new Date(now + H),
    instantPrizes: [
      { title: 'Big instant', valuePence: 5000, count: 1 },
      { title: 'Small instant', valuePence: 500, count: 2 },
    ],
    ...over,
  });
  await publishCompetition(db, { id: owner.id, role: 'owner' }, c.id);
  const [live] = await db.select().from(competitions).where(eq(competitions.id, c.id));
  return live!;
}

async function enter(competitionId: string, userId: string, numbers: number[], answerCorrect: boolean | null = null) {
  const [o] = await db.insert(orders).values({ userId, status: 'paid', totalPence: numbers.length * 100, provider: 'test', expiresAt: new Date(Date.now() + H), paidAt: new Date() }).returning();
  await db.insert(tickets).values(numbers.map((n) => ({ competitionId, number: n, userId, orderId: o!.id, source: 'paid' as const, allocation: 'random' as const, status: 'active' as const, answerCorrect })));
  return db.select().from(tickets).where(and(eq(tickets.competitionId, competitionId), eq(tickets.orderId, o!.id)));
}

describe('instant wins', () => {
  it('chooses and commits the winning numbers when published, as an instant win prize draw', async () => {
    const c = await instantComp();
    const rows = await instantRows(db, c.id);
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.ticketNumber)).size).toBe(3);
    expect(rows.every((r) => r.ticketNumber >= 1 && r.ticketNumber <= 10 && r.wonTicketId === null)).toBe(true);
    expect(c.isInstantWin).toBe(true);
    expect(c.instantCommit).toBe(instantCommitment(c.instantSalt!, rows));
  });

  it('awards each prize the moment its number is entered, and only once', async () => {
    const c = await instantComp();
    const u = await makeUser(db);
    const all = await enter(c.id, u.id, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const won = await db.select().from(instantWins).where(and(eq(instantWins.competitionId, c.id), isNotNull(instantWins.wonTicketId)));
    expect(won).toHaveLength(3);
    for (const w of won) expect(all.find((t) => t.id === w.wonTicketId)!.number).toBe(w.ticketNumber);
    // Nobody can move a prize to another ticket, or release a winning ticket.
    const other = all.find((t) => !won.some((w) => w.wonTicketId === t.id))!;
    await expectDbError(db.update(instantWins).set({ wonTicketId: other.id }).where(eq(instantWins.ticketNumber, won[0]!.ticketNumber)), 'won once');
    await expectDbError(db.update(tickets).set({ status: 'refunded' }).where(eq(tickets.id, won[0]!.wonTicketId!)), 'cannot be released');
  });

  it('never awards an instant prize to a wrong answer', async () => {
    const c = await instantComp({ skillQuestion: { question: 'What is 2 + 2?', options: ['3', '4'], correctIndex: 1 } });
    const u = await makeUser(db);
    await enter(c.id, u.id, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], false);
    const won = await db.select().from(instantWins).where(and(eq(instantWins.competitionId, c.id), isNotNull(instantWins.wonTicketId)));
    expect(won).toHaveLength(0);
  });

  it('fixes the prizes at publishing: no new, changed or removed prizes, no new terms', async () => {
    const c = await instantComp();
    await expectDbError(db.insert(instantWins).values({ competitionId: c.id, ticketNumber: 99, tier: 0, title: 'Extra', valuePence: 1 }), 'fixed when a competition is published');
    await expectDbError(db.update(instantWins).set({ valuePence: 1 }).where(eq(instantWins.competitionId, c.id)), 'never change');
    await expectDbError(db.delete(instantWins).where(eq(instantWins.competitionId, c.id)), 'never deleted');
    await expectDbError(db.update(competitions).set({ instantPrizes: [] }).where(eq(competitions.id, c.id)), 'never change');
  });

  it('refuses chosen numbers, at checkout and in the database', async () => {
    const c = await instantComp();
    const u = await makeUser(db);
    await expect(addToBasket(db, u.id, { competitionId: c.id, quantity: 1, chosenNumbers: [3], answerIndex: null })).rejects.toBeInstanceOf(CheckoutError);
    const [o] = await db.insert(orders).values({ userId: u.id, status: 'paid', totalPence: 100, provider: 'test', expiresAt: new Date(Date.now() + H) }).returning();
    await expectDbError(db.insert(tickets).values({ competitionId: c.id, number: 3, userId: u.id, orderId: o!.id, source: 'paid', allocation: 'chosen', status: 'active' }), 'cannot be chosen');
  });

  it('refuses to publish when the commitment does not match the numbers', async () => {
    const owner = await makeUser(db, { role: 'owner' });
    const c = await createCompetition(db, { id: owner.id, role: 'owner' }, {
      slug: 'forged', title: 'Forged', prizeDescription: 'A test prize with instant wins.', prizeValuePence: 100, ticketPricePence: 100, maxTickets: 10, perPersonCap: 10,
      opensAt: new Date(Date.now() - H), closesAt: new Date(Date.now() + H), drawAt: new Date(Date.now() + H),
      instantPrizes: [{ title: 'Instant', valuePence: 100, count: 1 }],
    });
    await db.insert(instantWins).values({ competitionId: c.id, ticketNumber: 4, tier: 0, title: 'Instant', valuePence: 100 });
    const salt = 'a'.repeat(64);
    await expectDbError(
      db.update(competitions).set({ status: 'live', instantSalt: salt, instantCommit: instantCommitment(salt, [{ ticketNumber: 5, tier: 0 }]), instantCommittedAt: new Date() }).where(eq(competitions.id, c.id)),
      'does not match',
    );
  });

  it('publishes a record anyone can check, and spots a moved prize', async () => {
    const c = await instantComp();
    const rows = await instantRows(db, c.id);
    const record = { method: INSTANT_METHOD, commit: c.instantCommit!, committed_at: c.instantCommittedAt!.toISOString(), salt: c.instantSalt!, prizes: rows.map((r) => ({ ticket: r.ticketNumber, tier: r.tier, title: r.title, value_pence: r.valuePence, won: false })) };
    expect(verifyInstantRecord(record).ok).toBe(true);
    const moved = { ...record, prizes: record.prizes.map((p, i) => (i === 0 ? { ...p, ticket: p.ticket === 10 ? 9 : 10 } : p)) };
    expect(verifyInstantRecord(moved).ok).toBe(false);
  });
});
