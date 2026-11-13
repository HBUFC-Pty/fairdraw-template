import { beforeEach, describe, expect, it } from 'vitest';
import { makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { cancelPendingIncrease, getLimits, isDecrease, setLimit } from '../src/lib/limits/spend';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

describe('spend limits', () => {
  it('decreases apply now; increases wait 24 hours', async () => {
    const u = await makeUser(db);
    const t0 = new Date('2026-11-13T10:00:00Z');
    expect(await setLimit(db, u.id, 'month', 10_000, t0)).toEqual({ applied: 'now' });
    expect((await getLimits(db, u.id, t0)).month.limitPence).toBe(10_000);
    expect(await setLimit(db, u.id, 'month', 5_000, t0)).toEqual({ applied: 'now' });
    const inc = await setLimit(db, u.id, 'month', 20_000, t0);
    expect(inc.applied).toBe('later');
    let l = (await getLimits(db, u.id, new Date(t0.getTime() + 23 * 3600_000))).month;
    expect(l.limitPence).toBe(5_000);
    expect(l.pending?.limitPence).toBe(20_000);
    l = (await getLimits(db, u.id, new Date(t0.getTime() + 24 * 3600_000))).month;
    expect(l.limitPence).toBe(20_000);
    expect(l.pending).toBeNull();
  });

  it('removing a limit is an increase; £0 is allowed and immediate', async () => {
    const u = await makeUser(db);
    const t0 = new Date('2026-11-13T10:00:00Z');
    await setLimit(db, u.id, 'day', 1000, t0);
    expect((await setLimit(db, u.id, 'day', null, t0)).applied).toBe('later');
    expect((await getLimits(db, u.id, t0)).day.limitPence).toBe(1000);
    expect((await getLimits(db, u.id, new Date(t0.getTime() + 86400_000))).day.limitPence).toBeNull();
    expect(await setLimit(db, u.id, 'week', 0, t0)).toEqual({ applied: 'now' });
    expect((await getLimits(db, u.id, t0)).week.limitPence).toBe(0);
    await expect(setLimit(db, u.id, 'week', -1, t0)).rejects.toThrow();
  });

  it('a pending increase can be cancelled, and a decrease cancels it', async () => {
    const u = await makeUser(db);
    const t0 = new Date('2026-11-13T10:00:00Z');
    await setLimit(db, u.id, 'month', 1000, t0);
    await setLimit(db, u.id, 'month', 3000, t0);
    expect(await cancelPendingIncrease(db, u.id, 'month', t0)).toBe(true);
    expect((await getLimits(db, u.id, new Date(t0.getTime() + 2 * 86400_000))).month.limitPence).toBe(1000);
    await setLimit(db, u.id, 'month', 3000, t0);
    await setLimit(db, u.id, 'month', 500, t0);
    expect((await getLimits(db, u.id, new Date(t0.getTime() + 2 * 86400_000))).month.limitPence).toBe(500);
  });

  it('isDecrease', () => {
    expect(isDecrease(null, 100)).toBe(true);
    expect(isDecrease(100, 50)).toBe(true);
    expect(isDecrease(100, 100)).toBe(true);
    expect(isDecrease(100, 150)).toBe(false);
    expect(isDecrease(100, null)).toBe(false);
    expect(isDecrease(null, null)).toBe(true);
  });
});
