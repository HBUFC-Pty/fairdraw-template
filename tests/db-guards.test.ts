/** The database itself refuses to alter a committed draw, redo a draw, rewrite the audit log or extend a competition. */
import { beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { addPaidTickets, backdate, expectDbError, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { auditLog, competitions, draws, tickets, winners } from '../src/lib/db/schema';
import { closeCompetition, runDraw } from '../src/lib/draw/service';
import { appendAudit } from '../src/lib/audit';
import { fairdrawRoundTime } from '../src/lib/fairdraw/draw';

const RAND = 'fe290beca10872ef2fb164d2aa4442de4566183ec51c56ff3cd603d930e54fdd';
const beacon = async (round: number) => ({ round, randomness: RAND, signature: 'ab', relays: ['https://a', 'https://b'] });

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

async function closedCompetition() {
  const u = await makeUser(db);
  const c = await makeCompetition(db);
  await addPaidTickets(db, c.id, u.id, [1, 2, 3, 4, 5]);
  const closesAt = new Date(Date.now() - 3600_000);
  await backdate(db, c.id, closesAt);
  // Closed (by the worker) one second after the close time, an hour ago, so the committed round now exists.
  await closeCompetition(db, c.id, new Date(closesAt.getTime() + 1000));
  return { u, c };
}

describe('commitment immutability (database triggers)', () => {
  it('a committed ticket list, hash or round cannot be changed', async () => {
    const { c } = await closedCompetition();
    await expectDbError(db.update(draws).set({ ticketList: [1, 2, 3] }).where(eq(draws.competitionId, c.id)));
    await expectDbError(db.update(draws).set({ entriesHash: 'x' }).where(eq(draws.competitionId, c.id)));
    await expectDbError(db.update(draws).set({ drandRound: 1 }).where(eq(draws.competitionId, c.id)));
    await expectDbError(db.delete(draws).where(eq(draws.competitionId, c.id)));
  });

  it('no ticket can be added or reactivated after the commitment', async () => {
    const { u, c } = await closedCompetition();
    await expectDbError(addPaidTickets(db, c.id, u.id, [6]));
    await expectDbError(db.update(tickets).set({ number: 99 }).where(eq(tickets.competitionId, c.id)));
    await expectDbError(db.delete(tickets).where(eq(tickets.competitionId, c.id)));
  });

  it('a commitment must list exactly the active tickets', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db);
    await addPaidTickets(db, c.id, u.id, [1, 2, 3]);
    await backdate(db, c.id, new Date(Date.now() - 3600_000));
    await expectDbError(
      db.insert(draws).values({
        competitionId: c.id, closedAtText: 'x', closeUnix: 1, ticketsSold: 2, maxTickets: 100, entriesHash: 'x', drandChain: 'x', drandRound: 1,
        ticketList: [1, 2], scheduledDrawAt: c.drawAt,
      }),
      'must equal the active tickets',
    );
  });

  it('cannot commit before the close time unless sold out', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { maxTickets: 3, perPersonCap: 3 });
    await addPaidTickets(db, c.id, u.id, [1, 2]);
    await expectDbError(closeCompetition(db, c.id));
    await addPaidTickets(db, c.id, u.id, [3]);
    const commit = await closeCompetition(db, c.id);
    expect(commit.tickets_sold).toBe(3);
  });

  it('a draw cannot be made before its round exists, and cannot be redone or altered', async () => {
    const { c } = await closedCompetition();
    const [d] = await db.select().from(draws).where(eq(draws.competitionId, c.id));
    expect(fairdrawRoundTime(d!.drandRound)).toBeLessThan(Date.now() / 1000);
    const first = await runDraw(db, c.id, { beacon });
    expect(first.alreadyDrawn).toBe(false);
    await expectDbError(db.update(draws).set({ randomness: 'f'.repeat(64) }).where(eq(draws.competitionId, c.id)), 'already been made');
    await expectDbError(db.update(draws).set({ winningTickets: [1] }).where(eq(draws.competitionId, c.id)));
    const again = await runDraw(db, c.id, { beacon: async () => ({ round: d!.drandRound, randomness: 'f'.repeat(64), signature: 'ab', relays: ['a', 'b'] }) });
    expect(again.alreadyDrawn).toBe(true);
    expect(again.record.winning_tickets).toEqual(first.record.winning_tickets);
    await expectDbError(db.update(winners).set({ ticketNumber: 999 }).where(eq(winners.competitionId, c.id)));
    await expectDbError(db.delete(winners).where(eq(winners.competitionId, c.id)));
  });

  it('a result for a future round is refused by the database', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db);
    await addPaidTickets(db, c.id, u.id, [1, 2]);
    // Close now, but with the advertised draw an hour away: the committed round is in the future.
    await backdate(db, c.id, new Date(Date.now() - 1000), new Date(Date.now() + 3600_000));
    await closeCompetition(db, c.id);
    await expectDbError(runDraw(db, c.id, { beacon }));
    await expectDbError(
      db.update(draws).set({ randomness: RAND, winningTickets: [1], drawnAt: new Date() }).where(eq(draws.competitionId, c.id)),
      'does not exist yet',
    );
  });

  it('winners must be in the committed list', async () => {
    const { c } = await closedCompetition();
    const [d] = await db.select().from(draws).where(eq(draws.competitionId, c.id));
    await expectDbError(
      db.update(draws).set({ randomness: RAND, winningTickets: [77], drawnAt: new Date() }).where(eq(draws.competitionId, d!.competitionId)),
      'committed list',
    );
  });
});

describe('competition terms are fixed once live', () => {
  it('refuses extensions, price changes, cap changes and backwards status moves', async () => {
    const c = await makeCompetition(db);
    await expectDbError(db.update(competitions).set({ closesAt: new Date(c.closesAt.getTime() + 86400_000) }).where(eq(competitions.id, c.id)));
    await expectDbError(db.update(competitions).set({ drawAt: new Date(c.drawAt.getTime() + 86400_000) }).where(eq(competitions.id, c.id)));
    await expectDbError(db.update(competitions).set({ ticketPricePence: 1 }).where(eq(competitions.id, c.id)));
    await expectDbError(db.update(competitions).set({ perPersonCap: 50 }).where(eq(competitions.id, c.id)));
    await expectDbError(db.update(competitions).set({ prizeValuePence: 1 }).where(eq(competitions.id, c.id)));
    await expectDbError(db.update(competitions).set({ status: 'cancelled' }).where(eq(competitions.id, c.id)));
    await expectDbError(db.update(competitions).set({ status: 'draft' }).where(eq(competitions.id, c.id)));
    await expectDbError(db.update(competitions).set({ status: 'closed' }).where(eq(competitions.id, c.id)), 'commitment');
    await expectDbError(db.delete(competitions).where(eq(competitions.id, c.id)), 'stay online');
    await db.update(competitions).set({ summary: 'Fixed a typo' }).where(eq(competitions.id, c.id));
  });

  it('drafts can still be edited, cancelled and deleted', async () => {
    const c = await makeCompetition(db, { status: 'draft' });
    await db.update(competitions).set({ ticketPricePence: 199 }).where(eq(competitions.id, c.id));
    await db.delete(competitions).where(eq(competitions.id, c.id));
  });
});

describe('audit log is append-only', () => {
  it('refuses update, delete and truncate', async () => {
    await appendAudit(db, { id: null, role: 'system' }, { action: 'test', targetType: 't', targetId: '1' });
    await expectDbError(db.update(auditLog).set({ action: 'changed' }), 'append-only');
    await expectDbError(db.delete(auditLog), 'append-only');
    await expectDbError(db.execute(sql`TRUNCATE audit_log`), 'append-only');
  });
});
