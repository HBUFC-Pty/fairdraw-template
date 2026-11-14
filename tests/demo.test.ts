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
import { and, eq } from 'drizzle-orm';
import { testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { competitions, tickets, users } from '../src/lib/db/schema';
import { env, resetEnvCache } from '../src/lib/env';
import { DEMO_FICTIONAL_PLAYERS, DEMO_OPEN_TARGET, DEMO_PLAYER_EMAIL, DEMO_PLAYER_PASSWORD, DEMO_PRIZES, isSharedDemoAccount, topUpDemoCompetitions } from '../src/lib/demo';
import { verifyPassword } from '../src/lib/auth/password';
import { capAboveTenPercent } from '../src/lib/competitions/allocation';
import { nextDueAt } from '../src/lib/worker';

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
  return () => ((i++ * 0.37) % 1);
}

describe('demo mode', () => {
  it('is off by default and does nothing then', async () => {
    expect(env().DEMO_MODE).toBe(false);
    expect(isSharedDemoAccount(DEMO_PLAYER_EMAIL)).toBe(false);
    expect(await topUpDemoCompetitions(db)).toBe(0);
    expect(await db.select().from(competitions)).toHaveLength(0);
  });

  it('is refused with a real payment provider', () => {
    process.env.DEMO_MODE = 'true';
    process.env.PAYMENT_PROVIDER = 'stripe';
    resetEnvCache();
    expect(() => env()).toThrow(/DEMO_MODE needs PAYMENT_PROVIDER=test/);
  });

  it('locks only the shared demo account', () => {
    demoOn();
    expect(isSharedDemoAccount(DEMO_PLAYER_EMAIL)).toBe(true);
    expect(isSharedDemoAccount(' Player@Example.test ')).toBe(true);
    expect(isSharedDemoAccount('player1@example.test')).toBe(false);
    expect(isSharedDemoAccount('owner@example.test')).toBe(false);
  });

  it('sets itself up: the shared account, fictional players who cannot log in, and open competitions', async () => {
    demoOn();
    const now = new Date('2026-11-14T10:20:00Z');
    expect(await topUpDemoCompetitions(db, now, seq())).toBe(DEMO_OPEN_TARGET);

    const all = await db.select().from(users);
    const shared = all.find((u) => u.email === DEMO_PLAYER_EMAIL)!;
    expect(await verifyPassword(shared.passwordHash, DEMO_PLAYER_PASSWORD)).toBe(true);
    const fictional = all.filter((u) => u.email !== DEMO_PLAYER_EMAIL);
    expect(fictional).toHaveLength(DEMO_FICTIONAL_PLAYERS);
    expect(fictional.every((u) => u.passwordHash === null && u.role === 'player')).toBe(true);

    const live = await db.select().from(competitions).where(eq(competitions.status, 'live'));
    expect(live).toHaveLength(DEMO_OPEN_TARGET);
    const hours = live.map((c) => (c.closesAt.getTime() - now.getTime()) / 3600_000).sort((x, y) => x - y);
    expect(hours[0]).toBeGreaterThanOrEqual(1); // a new demo's first draw comes soon
    expect(hours[0]).toBeLessThanOrEqual(2);
    expect(hours[1]).toBeGreaterThan(24);
    for (const c of live) {
      expect(c.closesAt.getUTCMinutes()).toBe(0);
      expect(c.drawAt.getTime()).toBe(c.closesAt.getTime());
      const sold = await db.select().from(tickets).where(and(eq(tickets.competitionId, c.id), eq(tickets.status, 'active')));
      expect(sold.length).toBeGreaterThan(0);
    }
    expect(await db.select().from(tickets).where(eq(tickets.userId, shared.id))).toHaveLength(0);

    // The quick one is within 12 hours of closing, so one successor is made, then nothing until another gets close.
    expect(await topUpDemoCompetitions(db, now, seq())).toBe(1);
    expect(await topUpDemoCompetitions(db, now, seq())).toBe(0);
    expect(await db.select().from(users)).toHaveLength(all.length);
  });

  it('says when the scheduled work is next due, so a caller can let the database sleep', async () => {
    expect(await nextDueAt(db)).toBeNull();
    demoOn();
    const now = new Date('2026-11-14T10:20:00Z');
    expect((await nextDueAt(db, now))!.getTime()).toBe(now.getTime()); // nothing open: set up now
    await topUpDemoCompetitions(db, now, seq());
    await topUpDemoCompetitions(db, now, seq());
    const live = await db.select().from(competitions).where(eq(competitions.status, 'live'));
    const closes = live.map((c) => c.closesAt.getTime()).sort((x, y) => x - y);
    // Next: the quick competition's close, before the next one needs a successor (12 hours before it closes).
    expect((await nextDueAt(db, now))!.getTime()).toBe(closes[0]);
    expect(closes[1]! - 12 * 3600_000).toBeGreaterThan(closes[0]!);
  });

  it('uses fair demo prizes: caps at 10% of the maximum or less', () => {
    for (const p of DEMO_PRIZES) expect(capAboveTenPercent(p.perPersonCap, p.maxTickets)).toBe(false);
  });
});
