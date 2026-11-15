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
/** Showtime v2 stage 1: short prices and times, honest progress, the basket badge count and the tile card. */
import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatPriceShort } from '../src/lib/money';
import { formatUkShort } from '../src/lib/time';
import { resetEnvCache } from '../src/lib/env';
import { formatPercent, percentSold, progressClass, ticketsLeft } from '../src/components/CompetitionFacts';
import { spokenRemaining } from '../src/components/Countdown';
import { TileCard } from '../src/components/CompetitionCard';
import { basketCount } from '../src/lib/public/basket-count';
import { basketItems } from '../src/lib/db/schema';
import type { Competition } from '../src/lib/public/queries';
import { makeCompetition, makeUser, testDb } from './helpers/db';

afterEach(() => {
  delete process.env.DEMO_MODE;
  resetEnvCache();
});

describe('formatPriceShort', () => {
  it('shows pounds, pence and demo points briefly', () => {
    expect(formatPriceShort(299)).toBe('£2.99');
    expect(formatPriceShort(500)).toBe('£5');
    expect(formatPriceShort(1250)).toBe('£12.50');
    expect(formatPriceShort(99)).toBe('99p');
    expect(formatPriceShort(5)).toBe('5p');
    process.env.DEMO_MODE = 'true';
    resetEnvCache();
    expect(formatPriceShort(5)).toBe('5 pts');
    expect(formatPriceShort(2500)).toBe('2,500 pts');
  });
});

describe('formatUkShort', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  it('says today, tomorrow or the day, in UK time', () => {
    expect(formatUkShort(new Date('2026-11-15T19:45:00Z'), now)).toBe('Today 19:45');
    expect(formatUkShort(new Date('2026-11-16T20:00:00Z'), now)).toBe('Tomorrow 20:00');
    expect(formatUkShort(new Date('2026-11-22T20:00:00Z'), now)).toBe('Sun 22 Nov 20:00');
    expect(formatUkShort(new Date('2027-01-03T20:00:00Z'), now)).toBe('Sun 3 Jan 2027 20:00');
  });
  it('uses UK calendar days across the clock change', () => {
    // 00:30 BST on Sunday 25 October 2026; the clocks go back at 02:00 that night.
    const early = new Date('2026-10-24T23:30:00Z');
    expect(formatUkShort(new Date('2026-10-25T23:30:00Z'), early)).toBe('Today 23:30');
    expect(formatUkShort(new Date('2026-10-26T00:30:00Z'), early)).toBe('Tomorrow 00:30');
    // Summer time: 19:45 BST is 18:45 UTC.
    expect(formatUkShort(new Date('2026-07-01T18:45:00Z'), new Date('2026-07-01T08:00:00Z'))).toBe('Today 19:45');
    // Spring forward (29 March 2026): 23:30 GMT on the Saturday, then the next UK day.
    const sat = new Date('2026-03-28T23:30:00Z');
    expect(formatUkShort(new Date('2026-03-29T22:59:00Z'), sat)).toBe('Tomorrow 23:59');
  });
});

describe('honest progress', () => {
  it('floors the share sold, so it never shows more than was sold', () => {
    expect(percentSold(46, 200)).toBe(23);
    expect(percentSold(57, 100)).toBe(57);
    expect(percentSold(7, 200)).toBe(3.5);
    expect(percentSold(1, 3)).toBe(33.3);
    expect(percentSold(199, 200)).toBe(99.5);
    expect(percentSold(0, 100)).toBe(0);
    expect(percentSold(100, 100)).toBe(100);
    expect(formatPercent(3.5)).toBe('3.5');
    expect(formatPercent(3)).toBe('3');
    expect(formatPercent(46.9)).toBe('46');
    expect(ticketsLeft(46, 200)).toBe(154);
    expect(ticketsLeft(210, 200)).toBe(0);
  });

  it('never gives a bar wider than the true percentage', () => {
    for (const max of [3, 7, 100, 200, 999, 2000, 50_000]) {
      for (let sold = 0; sold <= max; sold += Math.max(1, Math.floor(max / 97))) {
        const width = Number(progressClass(sold, max).slice(2));
        expect(Number.isInteger(width)).toBe(true);
        // Integer maths, so float rounding in the test cannot hide a bar that is too wide.
        expect(width * max).toBeLessThanOrEqual(sold * 100);
        expect((width + 1) * max).toBeGreaterThan(sold * 100);
      }
    }
    expect(progressClass(1999, 2000)).toBe('pc99');
    expect(progressClass(2000, 2000)).toBe('pc100');
  });
});

describe('countdown wording', () => {
  it('reads out whole minutes, not seconds', () => {
    expect(spokenRemaining('Closes in', 2 * 86400 + 4 * 3600 + 12 * 60 + 8)).toBe('Closes in 2 days 4 hours');
    expect(spokenRemaining('Closes in', 3600 + 60 + 5)).toBe('Closes in 1 hour 1 minute');
    expect(spokenRemaining('Closes in', 42 * 60 + 8)).toBe('Closes in 42 minutes');
    expect(spokenRemaining('Closes in', 20)).toBe('Closes in 1 minute');
  });
});

describe('tile card', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  const comp = (over: Partial<Competition> = {}): Competition =>
    ({
      id: 'c1',
      slug: 'sample',
      title: 'A prize',
      summary: 'A sentence that must not appear on a tile.',
      prizeDescription: '',
      prizeValuePence: 10_000,
      images: [{ url: '/images/demo-lakes.svg', alt: 'Lakes' }],
      ticketPricePence: 299,
      maxTickets: 200,
      perPersonCap: 20,
      winnerCount: 1,
      opensAt: new Date('2026-11-10T12:00:00Z'),
      closesAt: new Date('2026-11-15T19:45:00Z'),
      drawAt: new Date('2026-11-15T19:45:00Z'),
      instantPrizes: [],
      status: 'live',
      ...over,
    }) as Competition;

  it('shows numbers and chips, not sentences, with the real close time and exact share sold', () => {
    const html = renderToStaticMarkup(createElement(TileCard, { c: comp(), sold: 46, now }));
    expect(html).toContain('£2.99');
    expect(html).toContain('per ticket');
    expect(html).toContain('Today 19:45');
    expect(html).toContain('23% sold');
    expect(html).toContain('154 left');
    expect(html).toContain('class="pc23"');
    expect(html).toContain('href="/competitions/sample"');
    expect(html).not.toContain('must not appear');
    expect(html).not.toContain('Max 20');
    expect(html).not.toMatch(/style=/);
    expect(html).toContain('data-ending=""');
  });

  it('says when it opens, and shows sold out without a bar count', () => {
    const later = renderToStaticMarkup(createElement(TileCard, { c: comp({ opensAt: new Date('2026-11-16T20:00:00Z') }), sold: 0, now }));
    expect(later).toContain('Opens Tomorrow 20:00');
    expect(later).toContain('Opens soon');
    const gone = renderToStaticMarkup(createElement(TileCard, { c: comp(), sold: 200, now }));
    expect(gone).toContain('Sold out');
    expect(gone).not.toContain('left');
  });
});

describe('basket badge', () => {
  it('counts the tickets in one player basket only', async () => {
    const { db } = await testDb();
    const a = await makeUser(db);
    const b = await makeUser(db);
    const c1 = await makeCompetition(db);
    const c2 = await makeCompetition(db);
    expect(await basketCount(a.id, db)).toBe(0);
    await db.insert(basketItems).values([
      { userId: a.id, competitionId: c1.id, quantity: 3 },
      { userId: a.id, competitionId: c2.id, quantity: 10 },
      { userId: b.id, competitionId: c1.id, quantity: 7 },
    ]);
    expect(await basketCount(a.id, db)).toBe(13);
    expect(await basketCount(b.id, db)).toBe(7);
  });
});
