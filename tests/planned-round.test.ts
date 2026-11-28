import { beforeEach, describe, expect, it } from 'vitest';
import { addPaidTickets, backdate, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { closeCompetition } from '../src/lib/draw/service';
import { plannedRound, PLANNED_ROUND_MIN_GAP_S } from '../src/lib/competitions/planned-round';
import { fairdrawRoundTime } from '../src/lib/fairdraw/draw';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

describe('the drand round named while entries are open', () => {
  it('is exactly the round the close commits to (and the database accepts), on time or up to 90 seconds late', async () => {
    const u = await makeUser(db);
    const closesAt = new Date(Date.UTC(2026, 10, 20, 19, 45, 0));
    const drawAt = new Date(closesAt.getTime() + 3600_000);
    const planned = plannedRound(closesAt, drawAt)!;
    expect(planned).not.toBeNull();
    // Published at or just after the advertised draw time, never before it.
    expect(fairdrawRoundTime(planned.round)).toBeGreaterThanOrEqual(drawAt.getTime() / 1000);
    expect(fairdrawRoundTime(planned.round)).toBeLessThan(drawAt.getTime() / 1000 + 9);
    expect(planned.publishedAt.getTime()).toBe(fairdrawRoundTime(planned.round) * 1000);
    for (const lateMs of [0, 1500, 59_000, 89_000]) {
      const c = await makeCompetition(db);
      await addPaidTickets(db, c.id, u.id, [4, 9, 2]);
      await backdate(db, c.id, closesAt, drawAt);
      const commit = await closeCompetition(db, c.id, new Date(closesAt.getTime() + lateMs));
      expect(commit.drand_round).toBe(planned.round);
    }
  });

  it('is unchanged when a competition sells out and closes early', async () => {
    const u = await makeUser(db);
    const closesAt = new Date(Date.now() + 3 * 3600_000);
    const drawAt = new Date(closesAt.getTime() + 600_000);
    const c = await makeCompetition(db, { maxTickets: 3, perPersonCap: 3, closesAt, drawAt });
    await addPaidTickets(db, c.id, u.id, [1, 2, 3]);
    const commit = await closeCompetition(db, c.id);
    expect(commit.drand_round).toBe(plannedRound(closesAt, drawAt)!.round);
  });

  it('names no round when the draw is under two minutes after the close, since the close moment could still move it', () => {
    const t = new Date(Date.UTC(2026, 10, 20, 19, 45, 0));
    expect(plannedRound(t, t)).toBeNull();
    expect(plannedRound(t, new Date(t.getTime() + (PLANNED_ROUND_MIN_GAP_S - 1) * 1000))).toBeNull();
    expect(plannedRound(t, new Date(t.getTime() + PLANNED_ROUND_MIN_GAP_S * 1000))).not.toBeNull();
  });

  it('moves, as the rules require, only when the close comes less than 30 seconds before the draw time', async () => {
    const u = await makeUser(db);
    const closesAt = new Date(Date.UTC(2026, 10, 20, 19, 45, 0));
    const drawAt = new Date(closesAt.getTime() + 300_000);
    const c = await makeCompetition(db);
    await addPaidTickets(db, c.id, u.id, [5]);
    await backdate(db, c.id, closesAt, drawAt);
    const commit = await closeCompetition(db, c.id, new Date(drawAt.getTime() - 10_000));
    expect(commit.drand_round).not.toBe(plannedRound(closesAt, drawAt)!.round);
    expect(fairdrawRoundTime(commit.drand_round)).toBeGreaterThanOrEqual(drawAt.getTime() / 1000);
  });
});
