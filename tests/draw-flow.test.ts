import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { addPaidTickets, backdate, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { competitions, draws, refunds, tickets, winners } from '../src/lib/db/schema';
import { closeCompetition, competitionsDueToClose, competitionsDueToDraw, DrawNotDueError, runDraw } from '../src/lib/draw/service';
import { fairdrawEntriesHash, fairdrawRoundAfter, fairdrawRoundTime, fairdrawVerify } from '../src/lib/fairdraw/draw';
import { BeaconNotReadyError } from '../src/lib/fairdraw/beacon';
import { verifyAuditChain } from '../src/lib/audit';
import { recordPostalEntry } from '../src/lib/competitions/postal';

const RAND = 'fe290beca10872ef2fb164d2aa4442de4566183ec51c56ff3cd603d930e54fdd';
const beacon = async (round: number) => ({ round, randomness: RAND, signature: 'ab', relays: ['https://a', 'https://b'] });

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

describe('close, commit and draw', () => {
  it('commits the frozen list, waits for the round and publishes a record anyone can re-run', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { winnerCount: 2 });
    await addPaidTickets(db, c.id, u.id, [7, 3, 50, 12, 99]);
    const closesAt = new Date(Date.now() - 2 * 3600_000);
    const drawAt = new Date(closesAt.getTime() + 3600_000);
    await backdate(db, c.id, closesAt, drawAt);
    const closeTime = new Date(closesAt.getTime() + 2000);

    expect(await competitionsDueToClose(db)).toEqual([c.id]);
    const commit = await closeCompetition(db, c.id, closeTime);
    expect(commit.tickets_sold).toBe(5);
    expect(commit.entries_hash).toBe(await fairdrawEntriesHash([3, 7, 12, 50, 99]));
    // The round is the first one at or after the advertised draw time.
    const closeUnix = Math.floor(closeTime.getTime() / 1000);
    expect(commit.drand_round).toBe(fairdrawRoundAfter(closeUnix, Math.ceil(drawAt.getTime() / 1000) - closeUnix));
    expect(fairdrawRoundTime(commit.drand_round)).toBeGreaterThanOrEqual(drawAt.getTime() / 1000);

    // Not before the advertised draw time.
    await expect(runDraw(db, c.id, { beacon, now: new Date(drawAt.getTime() - 1000) })).rejects.toBeInstanceOf(DrawNotDueError);
    // Not before the round exists, even if the clock says the draw is due.
    await expect(runDraw(db, c.id, { beacon, now: new Date(fairdrawRoundTime(commit.drand_round) * 1000 - 1000 + 1) })).rejects.toBeInstanceOf(BeaconNotReadyError);

    expect(await competitionsDueToDraw(db)).toEqual([c.id]);
    const out = await runDraw(db, c.id, { beacon });
    expect(out.record.winning_tickets).toHaveLength(2);
    const check = await fairdrawVerify(out.record, [7, 3, 50, 12, 99], RAND);
    expect(check.ok).toBe(true);

    const [comp] = await db.select().from(competitions).where(eq(competitions.id, c.id));
    expect(comp!.status).toBe('drawn');
    expect(comp!.closedAt!.getTime()).toBe(closeTime.getTime());
    expect(comp!.drawnAt).not.toBeNull();
    const ws = await db.select().from(winners).where(eq(winners.competitionId, c.id));
    expect(ws.map((w) => w.ticketNumber).sort()).toEqual([...out.record.winning_tickets].sort());
    expect(ws.every((w) => w.userId === u.id && !w.publicConsent && w.displayName === null)).toBe(true);
    expect((await verifyAuditChain(db)).ok).toBe(true);
  });

  it('draws at the advertised time even when nothing sold, with no winner', async () => {
    const c = await makeCompetition(db);
    const closesAt = new Date(Date.now() - 3600_000);
    await backdate(db, c.id, closesAt);
    const commit = await closeCompetition(db, c.id, new Date(closesAt.getTime() + 1000));
    expect(commit.tickets_sold).toBe(0);
    const out = await runDraw(db, c.id, { beacon });
    expect(out.record.winning_tickets).toEqual([]);
  });

  it('excludes wrong skill answers from the draw and refunds them; unpaid reservations lapse', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { skillQuestion: { question: 'What is 2 + 2?', options: ['3', '4'], correctIndex: 1 } });
    const o = await addPaidTickets(db, c.id, u.id, [1]);
    // Ticket 2 answered the question wrongly (answers are recorded when the ticket is created and never change).
    await db.insert(tickets).values({ competitionId: c.id, number: 2, userId: u.id, orderId: o.id, source: 'paid', allocation: 'random', status: 'active', answerCorrect: false });
    await db.insert(tickets).values({ competitionId: c.id, number: 9, userId: u.id, orderId: o.id, source: 'paid', allocation: 'random', status: 'reserved', reservedUntil: new Date(Date.now() + 600_000) });
    const closesAt = new Date(Date.now() - 3600_000);
    await backdate(db, c.id, closesAt);
    const commit = await closeCompetition(db, c.id, new Date(closesAt.getTime() + 1000));
    expect(commit.tickets_sold).toBe(1);
    const [d] = await db.select().from(draws).where(eq(draws.competitionId, c.id));
    expect(d!.ticketList).toEqual([1]);
    const rs = await db.select().from(refunds);
    expect(rs).toHaveLength(1);
    expect(rs[0]!.amountPence).toBe(250);
    const statuses = await db.select({ n: tickets.number, s: tickets.status }).from(tickets).where(eq(tickets.competitionId, c.id));
    expect(Object.fromEntries(statuses.map((t) => [t.n, t.s]))).toEqual({ 1: 'active', 2: 'ineligible', 9: 'expired' });
  });

  it('closes early when sold out but still draws at the advertised time', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { maxTickets: 4, perPersonCap: 4 });
    await addPaidTickets(db, c.id, u.id, [1, 2, 3, 4]);
    expect(await competitionsDueToClose(db)).toEqual([c.id]);
    const commit = await closeCompetition(db, c.id);
    expect(fairdrawRoundTime(commit.drand_round)).toBeGreaterThanOrEqual(c.drawAt.getTime() / 1000);
    await expect(runDraw(db, c.id, { beacon })).rejects.toBeInstanceOf(DrawNotDueError);
  });

  it('postal entries go into the draw with the same chance', async () => {
    const admin = await makeUser(db, { role: 'admin' });
    const c = await makeCompetition(db);
    const r = await recordPostalEntry(db, { id: admin.id, role: 'admin' }, { competitionId: c.id, fullName: 'Pat Post', email: 'pat@example.test', postalAddress: '1 High Street, Leeds', answerIndex: null, receivedAt: new Date() });
    expect(r.status).toBe('accepted');
    const closesAt = new Date(Date.now() - 3600_000);
    await backdate(db, c.id, closesAt);
    const commit = await closeCompetition(db, c.id, new Date(closesAt.getTime() + 1000));
    expect(commit.tickets_sold).toBe(1);
    const out = await runDraw(db, c.id, { beacon });
    expect(out.winners[0]!.postalEntryId).toBe(r.entryId);
  });
});
