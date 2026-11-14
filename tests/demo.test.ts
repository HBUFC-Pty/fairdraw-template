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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, isNull } from 'drizzle-orm';
import { makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { competitions, tickets, users } from '../src/lib/db/schema';
import { env, resetEnvCache } from '../src/lib/env';
import {
  DEMO_FICTIONAL_PLAYERS,
  DEMO_LONG_PRIZES,
  DEMO_QUICK_PRIZES,
  demoNextDueAt,
  demoSignUpDefaults,
  demoUpkeep,
  removeOldVisitors,
  topUpDemoCompetitions,
} from '../src/lib/demo';
import { capAboveTenPercent } from '../src/lib/competitions/allocation';
import { isValidDateOfBirth } from '../src/lib/auth/age';
import { nextDueAt } from '../src/lib/worker';

const H = 3600_000;
let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});
afterEach(() => {
  delete process.env.DEMO_MODE;
  process.env.PAYMENT_PROVIDER = 'test';
  resetEnvCache();
});

function demoOn() {
  process.env.DEMO_MODE = 'true';
  resetEnvCache();
}

/** A fixed sequence, so the tests do not depend on Math.random. */
function seq() {
  let i = 0;
  return () => (i++ * 0.37) % 1;
}

async function live() {
  return (await db.select().from(competitions).where(eq(competitions.status, 'live'))).sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
}

describe('demo mode', () => {
  it('is off by default and does nothing then', async () => {
    expect(env().DEMO_MODE).toBe(false);
    expect(await topUpDemoCompetitions(db)).toBe(0);
    expect(await demoUpkeep(db)).toEqual({ opened: 0, removed: 0 });
    expect(await demoNextDueAt(db)).toBeNull();
    expect(await db.select().from(competitions)).toHaveLength(0);
  });

  it('is refused with a real payment provider', () => {
    process.env.DEMO_MODE = 'true';
    process.env.PAYMENT_PROVIDER = 'stripe';
    resetEnvCache();
    expect(() => env()).toThrow(/DEMO_MODE needs PAYMENT_PROVIDER=test/);
  });

  it('sets itself up: fictional players who cannot log in, a quick draw and two longer competitions', async () => {
    demoOn();
    const now = new Date('2026-11-14T10:20:00Z');
    expect(await topUpDemoCompetitions(db, now, seq())).toBe(3);

    const fictional = await db.select().from(users);
    expect(fictional).toHaveLength(DEMO_FICTIONAL_PLAYERS);
    expect(fictional.every((u) => u.passwordHash === null && u.role === 'player' && u.email.endsWith('@example.test'))).toBe(true);

    const open = await live();
    expect(open).toHaveLength(3);
    // A new demo's first draw comes within the hour, on a quarter hour.
    expect(open[0]!.closesAt.toISOString()).toBe('2026-11-14T11:00:00.000Z');
    for (const c of open.slice(1)) {
      expect(c.closesAt.getTime() - now.getTime()).toBeGreaterThan(24 * H);
      expect(c.closesAt.getUTCMinutes()).toBe(0);
    }
    for (const c of open) {
      expect(c.drawAt.getTime()).toBe(c.closesAt.getTime());
      const sold = await db.select().from(tickets).where(and(eq(tickets.competitionId, c.id), eq(tickets.status, 'active')));
      expect(sold.length).toBeGreaterThan(0);
    }
    expect(await topUpDemoCompetitions(db, now, seq())).toBe(0);
  });

  it('opens the next quick competition once the last one has closed', async () => {
    demoOn();
    const now = new Date('2026-11-14T10:20:00Z');
    await topUpDemoCompetitions(db, now, seq());
    const after = new Date('2026-11-14T11:01:00Z');
    expect(await topUpDemoCompetitions(db, after, seq())).toBe(1);
    const next = (await live()).filter((c) => c.closesAt > after)[0]!;
    expect(next.closesAt.toISOString()).toBe('2026-11-14T15:00:00.000Z');
  });

  it('says when the scheduled work is next due, so a caller can let the database sleep', async () => {
    expect(await nextDueAt(db)).toBeNull();
    demoOn();
    const now = new Date('2026-11-14T10:20:00Z');
    expect((await nextDueAt(db, now))!.getTime()).toBe(now.getTime()); // nothing open: set up now
    await topUpDemoCompetitions(db, now, seq());
    const open = await live();
    // Next: the quick competition's close (its successor is opened in the same cycle).
    expect((await nextDueAt(db, now))!.getTime()).toBe(open[0]!.closesAt.getTime());
    // On its own, the demo's next job is a long competition coming within 12 hours of its close.
    expect((await demoNextDueAt(db, now))!.getTime()).toBe(open[1]!.closesAt.getTime() - 12 * H);
  });

  it('deletes visitors 24 hours after they sign up, and never the fictional players', async () => {
    demoOn();
    const now = new Date('2026-11-14T10:20:00Z');
    await topUpDemoCompetitions(db, now, seq());
    const old = await makeUser(db, { email: 'old.visitor@example.test', createdAt: new Date(now.getTime() - 25 * H) });
    const recent = await makeUser(db, { email: 'new.visitor@example.test', createdAt: new Date(now.getTime() - H) });
    expect((await demoNextDueAt(db, now))!.getTime()).toBe(old.createdAt.getTime() + 24 * H);

    expect(await removeOldVisitors(db, now)).toBe(1);
    const [gone] = await db.select().from(users).where(eq(users.id, old.id));
    expect(gone!.deletedAt).not.toBeNull();
    expect(gone!.email).toBe(`deleted-${old.id}@invalid`);
    const [kept] = await db.select().from(users).where(eq(users.id, recent.id));
    expect(kept!.deletedAt).toBeNull();
    const fictional = await db.select().from(users).where(and(isNull(users.passwordHash), isNull(users.deletedAt)));
    expect(fictional).toHaveLength(DEMO_FICTIONAL_PLAYERS);
  });

  it('suggests made-up, adult sign-up details', () => {
    const d = demoSignUpDefaults((n) => n - 1);
    expect(d.email).toMatch(/^[a-z]+\.\d{6}@example\.test$/);
    expect(isValidDateOfBirth(d.dateOfBirth, new Date('2026-11-14T10:20:00Z'))).toBe(true);
    expect(d.firstName.length).toBeGreaterThan(0);
  });

  it('uses fair demo prizes: caps at 10% of the maximum or less', () => {
    for (const p of [...DEMO_QUICK_PRIZES, ...DEMO_LONG_PRIZES]) expect(capAboveTenPercent(p.perPersonCap, p.maxTickets)).toBe(false);
  });
});
