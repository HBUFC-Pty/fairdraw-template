import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { addPaidTickets, backdate, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { orders, users, winners } from '../src/lib/db/schema';
import { deleteAccount, exportUserData, publicWinnerName, setWinnerConsent } from '../src/lib/account/service';
import { closeCompetition, runDraw } from '../src/lib/draw/service';
import { runRetention } from '../src/lib/retention';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

const beacon = async (round: number) => ({ round, randomness: 'fe290beca10872ef2fb164d2aa4442de4566183ec51c56ff3cd603d930e54fdd', signature: 'ab', relays: ['a', 'b'] });

describe('account data rights', () => {
  it('exports the player data as JSON with entry codes', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db);
    await addPaidTickets(db, c.id, u.id, [4, 5]);
    const data = await exportUserData(db, u.id);
    expect(data.account.email).toBe(u.email);
    expect(data.tickets).toHaveLength(2);
    expect(data.tickets[0]!.entry_code).toMatch(/^[0-9a-f]{10}$/);
    expect(JSON.stringify(data)).not.toContain('argon2');
  });

  it('deletion erases personal data but keeps financial records', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db);
    await addPaidTickets(db, c.id, u.id, [4]);
    await deleteAccount(db, u.id);
    const [after] = await db.select().from(users).where(eq(users.id, u.id));
    expect(after!.email).toBe(`deleted-${u.id}@invalid`);
    expect([after!.firstName, after!.lastName, after!.dateOfBirth, after!.passwordHash]).toEqual([null, null, null, null]);
    expect(await db.select().from(orders).where(eq(orders.userId, u.id))).toHaveLength(1);
  });

  it('winner names are shown only with consent, as first name and initial', async () => {
    expect(publicWinnerName('Sam', 'Taylor')).toBe('Sam T.');
    expect(publicWinnerName('Mary Ann', 'de Vries')).toBe('Mary D.');
    const u = await makeUser(db);
    const c = await makeCompetition(db);
    await addPaidTickets(db, c.id, u.id, [1]);
    const closesAt = new Date(Date.now() - 3600_000);
    await backdate(db, c.id, closesAt);
    await closeCompetition(db, c.id, new Date(closesAt.getTime() + 1000));
    await runDraw(db, c.id, { beacon });
    let [w] = await db.select().from(winners).where(eq(winners.competitionId, c.id));
    expect(w!.displayName).toBeNull();
    await setWinnerConsent(db, u.id, c.id, true);
    [w] = await db.select().from(winners).where(eq(winners.competitionId, c.id));
    expect(w!.displayName).toBe('Sam T.');
    await deleteAccount(db, u.id);
    [w] = await db.select().from(winners).where(eq(winners.competitionId, c.id));
    expect(w!.displayName).toBeNull();
  });

  it('retention removes stale unverified sign-ups', async () => {
    const old = await makeUser(db, { emailVerifiedAt: null, createdAt: new Date(Date.now() - 40 * 86400_000) });
    const fresh = await makeUser(db, { emailVerifiedAt: null });
    const res = await runRetention(db);
    expect(res.unverifiedDeleted).toBe(1);
    expect(await db.select().from(users).where(eq(users.id, old.id))).toHaveLength(0);
    expect(await db.select().from(users).where(eq(users.id, fresh.id))).toHaveLength(1);
  });
});
