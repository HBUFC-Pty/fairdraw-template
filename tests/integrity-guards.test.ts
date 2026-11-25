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
/** The draw integrity guards in drizzle/0004 (red team, November 2026), with the real database clock where they use it. */
import { beforeEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import type { PGlite } from '@electric-sql/pglite';
import { addPaidTickets, backdate, expectDbError, makeCompetition, makeUser, testDb, useRealClock } from './helpers/db';
import type { Db } from '../src/lib/db';
import { competitions, draws, tickets, winners } from '../src/lib/db/schema';
import { closeCompetition, runDraw } from '../src/lib/draw/service';
import { fairdrawRoundAfter, fairdrawRoundTime } from '../src/lib/fairdraw/draw';

const RAND = 'fe290beca10872ef2fb164d2aa4442de4566183ec51c56ff3cd603d930e54fdd';
const beacon = async (round: number) => ({ round, randomness: RAND, signature: 'ab', relays: ['https://a', 'https://b'] });

let db: Db;
let client: PGlite;
beforeEach(async () => {
  ({ db, client } = await testDb());
});

describe('drand round in a commitment', () => {
  it('refuses a commitment to a round that was already published (the randomness would be known)', async () => {
    await useRealClock(client);
    const c = await makeCompetition(db);
    const closesAt = new Date(Date.now() - 3600_000);
    await backdate(db, c.id, closesAt);
    // Claiming the close happened an hour ago commits to an hour-old round: refused.
    await expectDbError(closeCompetition(db, c.id, new Date(closesAt.getTime() + 1000)), 'has already been published');
    // Closing now commits to a round that does not exist yet: accepted.
    const commit = await closeCompetition(db, c.id);
    expect(fairdrawRoundTime(commit.drand_round)).toBeGreaterThan(Date.now() / 1000);
  });

  it('refuses any round other than the one the rules give for the close and draw time', async () => {
    const c = await makeCompetition(db);
    const closesAt = new Date(Date.now() - 3600_000);
    await backdate(db, c.id, closesAt);
    const closeUnix = Math.floor(closesAt.getTime() / 1000) + 1;
    const right = fairdrawRoundAfter(closeUnix, 30);
    const row = (round: number) => ({
      competitionId: c.id,
      closedAtText: new Date(closeUnix * 1000).toISOString(),
      closeUnix,
      ticketsSold: 0,
      maxTickets: c.maxTickets,
      entriesHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      drandChain: '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971',
      drandRound: round,
      ticketList: [],
      scheduledDrawAt: closesAt,
    });
    await expectDbError(db.insert(draws).values(row(right - 7)), `must be ${right}`);
    await expectDbError(db.insert(draws).values({ ...row(right), drandChain: 'f'.repeat(64) }), 'quicknet');
  });
});

describe('winners and ticket owners', () => {
  it('records the active holder as winner when a refunded number was sold again', async () => {
    const [a, b] = [await makeUser(db), await makeUser(db)];
    const c = await makeCompetition(db);
    await addPaidTickets(db, c.id, a.id, [5]);
    await db.update(tickets).set({ status: 'refunded' }).where(and(eq(tickets.competitionId, c.id), eq(tickets.userId, a.id)));
    await addPaidTickets(db, c.id, b.id, [5]);
    const closesAt = new Date(Date.now() - 3600_000);
    await backdate(db, c.id, closesAt);
    await closeCompetition(db, c.id, new Date(closesAt.getTime() + 1000));
    await runDraw(db, c.id, { beacon });
    const [w] = await db.select().from(winners).where(eq(winners.competitionId, c.id));
    expect(w!.ticketNumber).toBe(5);
    expect(w!.userId).toBe(b.id);
  });

  it('never moves a ticket or a win to another owner', async () => {
    const [a, b] = [await makeUser(db), await makeUser(db)];
    const c = await makeCompetition(db);
    await addPaidTickets(db, c.id, a.id, [7]);
    await expectDbError(db.update(tickets).set({ userId: b.id }).where(eq(tickets.competitionId, c.id)), 'never change');
    await expectDbError(db.update(tickets).set({ answerCorrect: false }).where(eq(tickets.competitionId, c.id)), 'never change');
    const closesAt = new Date(Date.now() - 3600_000);
    await backdate(db, c.id, closesAt);
    await closeCompetition(db, c.id, new Date(closesAt.getTime() + 1000));
    await runDraw(db, c.id, { beacon });
    await expectDbError(db.update(winners).set({ userId: b.id }).where(eq(winners.competitionId, c.id)), 'owner never changes');
    // Consent can still change.
    await db.update(winners).set({ publicConsent: true, displayName: 'Sam T.' }).where(eq(winners.competitionId, c.id));
  });
});

describe('entries are fixed at the advertised close', () => {
  it('refuses new, entered or removed tickets after the close, but lets wrong answers become ineligible', async () => {
    await useRealClock(client);
    const u = await makeUser(db);
    const c = await makeCompetition(db);
    const o = await addPaidTickets(db, c.id, u.id, [1, 2]);
    await db.insert(tickets).values({ competitionId: c.id, number: 3, userId: u.id, orderId: o.id, source: 'paid', allocation: 'random', status: 'reserved', reservedUntil: new Date(Date.now() + 600_000) });
    await backdate(db, c.id, new Date(Date.now() - 60_000));
    await expectDbError(db.insert(tickets).values({ competitionId: c.id, number: 4, userId: u.id, orderId: o.id, source: 'paid', allocation: 'random', status: 'active' }), 'after the advertised close');
    await expectDbError(db.update(tickets).set({ status: 'active' }).where(and(eq(tickets.competitionId, c.id), eq(tickets.number, 3))), 'cannot change after the advertised close');
    await expectDbError(db.update(tickets).set({ status: 'refunded' }).where(and(eq(tickets.competitionId, c.id), eq(tickets.number, 1))), 'cannot change after the advertised close');
    await db.update(tickets).set({ status: 'expired' }).where(and(eq(tickets.competitionId, c.id), eq(tickets.number, 3)));
    await db.update(tickets).set({ status: 'ineligible' }).where(and(eq(tickets.competitionId, c.id), eq(tickets.number, 2)));
  });

  it('fixes the prize text from the close and the title from publishing', async () => {
    await useRealClock(client);
    const c = await makeCompetition(db);
    await expectDbError(db.update(competitions).set({ title: 'Something else' }).where(eq(competitions.id, c.id)), 'title never changes');
    await db.update(competitions).set({ prizeDescription: 'A clearer description of the same prize.' }).where(eq(competitions.id, c.id));
    await backdate(db, c.id, new Date(Date.now() - 60_000));
    await expectDbError(db.update(competitions).set({ prizeDescription: 'A toy car, not the real one.' }).where(eq(competitions.id, c.id)), 'cannot change after the close');
    await expectDbError(
      db.execute(sql`UPDATE competitions SET images = '[{"url":"/images/other.svg","alt":"A different prize"}]'::jsonb WHERE id = ${c.id}`),
      'cannot change after the close',
    );
  });
});
