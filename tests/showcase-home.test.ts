/** Showtime v2 stage 2: the showcase home page's queries and sections show only real, privacy-safe numbers. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, isNotNull } from 'drizzle-orm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { addPaidTickets, backdate, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { competitions, instantWins, orders, tickets } from '../src/lib/db/schema';
import { createCompetition, publishCompetition } from '../src/lib/competitions/service';
import { instantRows } from '../src/lib/competitions/instant';
import { closeCompetition, runDraw } from '../src/lib/draw/service';
import { setWinnerConsent } from '../src/lib/account/service';
import { instantPrizeSummary, nextDraw, recentWins, siteStats } from '../src/lib/public/home';
import { cardBadges, filterFlags } from '../src/components/CompetitionCard';
import { filterCounts } from '../src/components/home/filters';
import { ProofBand } from '../src/components/home/ProofBand';
import { WinnersMarquee } from '../src/components/home/WinnersMarquee';
import { Hero } from '../src/components/home/Hero';
import { FilterableGrid } from '../src/components/home/FilterableGrid';
import { formatAgo } from '../src/lib/time';
import { resetEnvCache } from '../src/lib/env';

const H = 3600_000;
const RAND = 'fe290beca10872ef2fb164d2aa4442de4566183ec51c56ff3cd603d930e54fdd';
const beacon = async (round: number) => ({ round, randomness: RAND, signature: 'ab', relays: ['https://a', 'https://b'] });

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});
afterEach(() => {
  delete process.env.DEMO_MODE;
  resetEnvCache();
});

/** A live competition with two instant prize tiers, committed at publishing. */
async function instantComp(title = 'Instant test') {
  const owner = await makeUser(db, { role: 'owner' });
  const now = Date.now();
  const c = await createCompetition(db, { id: owner.id, role: 'owner' }, {
    slug: `instant-${Math.random().toString(36).slice(2, 8)}`,
    title,
    prizeDescription: 'A test prize with instant wins.',
    prizeValuePence: 10_000,
    ticketPricePence: 100,
    maxTickets: 20,
    perPersonCap: 20,
    opensAt: new Date(now - H),
    closesAt: new Date(now + H),
    drawAt: new Date(now + H),
    instantPrizes: [
      { title: 'Big instant', valuePence: 5000, count: 1 },
      { title: 'Small instant', valuePence: 500, count: 3 },
    ],
  });
  await publishCompetition(db, { id: owner.id, role: 'owner' }, c.id);
  const [live] = await db.select().from(competitions).where(eq(competitions.id, c.id));
  return live!;
}

async function enter(competitionId: string, userId: string, numbers: number[]) {
  const [o] = await db.insert(orders).values({ userId, status: 'paid', totalPence: numbers.length * 100, provider: 'test', expiresAt: new Date(Date.now() + H), paidAt: new Date() }).returning();
  await db.insert(tickets).values(numbers.map((n) => ({ competitionId, number: n, userId, orderId: o!.id, source: 'paid' as const, allocation: 'random' as const, status: 'active' as const })));
}

/** A drawn competition with two winners: `consenting` agrees to show their name, `quiet` does not. */
async function drawnComp() {
  const consenting = await makeUser(db, { firstName: 'Robin', lastName: 'Keeling' });
  const quiet = await makeUser(db, { firstName: 'Morgan', lastName: 'Hidden' });
  const c = await makeCompetition(db, { title: 'Main prize', winnerCount: 2, maxTickets: 4, perPersonCap: 2 });
  await addPaidTickets(db, c.id, consenting.id, [1, 2]);
  await addPaidTickets(db, c.id, quiet.id, [3, 4]);
  const closesAt = new Date(Date.now() - 2 * H);
  await backdate(db, c.id, closesAt, new Date(closesAt.getTime() + H));
  await closeCompetition(db, c.id, new Date(closesAt.getTime() + 2000));
  await runDraw(db, c.id, { beacon });
  await setWinnerConsent(db, consenting.id, c.id, true);
  return { c, consenting, quiet };
}

describe('recentWins', () => {
  it('shows consented names only, and never an email or a full name', async () => {
    const { consenting, quiet } = await drawnComp();
    const wins = await recentWins(20, db);
    const main = wins.filter((w) => w.kind === 'draw');
    expect(main).toHaveLength(2);
    expect(main.map((w) => w.name).sort()).toEqual(['Robin K.', null].sort());
    const text = JSON.stringify(wins);
    for (const u of [consenting, quiet]) expect(text).not.toContain(u.email);
    expect(text).not.toContain('Keeling');
    expect(text).not.toContain('Morgan');
    expect(text).not.toContain('Hidden');
    for (const w of main) expect(w.prize).toBe('Main prize');
  });

  it('lists instant wins only where a ticket won them, by ticket number', async () => {
    const c = await instantComp();
    const rows = await instantRows(db, c.id);
    const winning = rows[0]!.ticketNumber;
    const losing = Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => !rows.some((r) => r.ticketNumber === n));
    const u = await makeUser(db);
    await enter(c.id, u.id, [winning, losing[0]!, losing[1]!]);
    const wins = await recentWins(20, db);
    expect(wins).toHaveLength(1);
    expect(wins[0]).toMatchObject({ kind: 'instant', ticket: winning, name: null, prize: rows[0]!.title, slug: c.slug });
    const won = await db.select().from(instantWins).where(and(eq(instantWins.competitionId, c.id), isNotNull(instantWins.wonTicketId)));
    expect(won.map((w) => w.ticketNumber)).toEqual([winning]);
    expect(JSON.stringify(wins)).not.toContain(u.email);
  });

  it('honours the limit, newest first', async () => {
    await drawnComp();
    const c = await instantComp();
    const u = await makeUser(db);
    await enter(c.id, u.id, Array.from({ length: 20 }, (_, i) => i + 1));
    const all = await recentWins(20, db);
    expect(all).toHaveLength(6);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.at.getTime()).toBeGreaterThanOrEqual(all[i]!.at.getTime());
    expect(await recentWins(3, db)).toHaveLength(3);
  });
});

describe('siteStats', () => {
  it('counts draws made, instant prizes won and live competitions exactly', async () => {
    expect(await siteStats(db)).toEqual({ drawsMade: 0, instantWon: 0, liveNow: 0 });
    await drawnComp();
    const c = await instantComp();
    await makeCompetition(db);
    const rows = await instantRows(db, c.id);
    const u = await makeUser(db);
    await enter(c.id, u.id, [rows[0]!.ticketNumber, rows[1]!.ticketNumber]);
    expect(await siteStats(db)).toEqual({ drawsMade: 1, instantWon: 2, liveNow: 2 });
  });
});

describe('instantPrizeSummary', () => {
  it('leaves exactly count minus won for each tier, top tier first', async () => {
    const c = await instantComp('Prize A');
    const rows = await instantRows(db, c.id);
    const small = rows.filter((r) => r.tier === 1);
    const u = await makeUser(db);
    await enter(c.id, u.id, [small[0]!.ticketNumber, small[1]!.ticketNumber]);
    const [fresh] = await db.select().from(competitions).where(eq(competitions.id, c.id));
    const tiles = await instantPrizeSummary([fresh!], db);
    expect(tiles.map((t) => [t.title, t.count, t.won, t.left, t.rank])).toEqual([
      ['Big instant', 1, 0, 1, 2],
      ['Small instant', 3, 2, 1, 0],
    ]);
    for (const t of tiles) expect(t.left).toBe(t.count - t.won);
  });

  it('is empty for competitions without instant prizes', async () => {
    const c = await makeCompetition(db);
    expect(await instantPrizeSummary([c], db)).toEqual([]);
  });
});

describe('nextDraw', () => {
  it('is the earliest future draw time among live and closed competitions', async () => {
    const now = new Date();
    expect(await nextDraw(now, db)).toBeNull();
    const later = await makeCompetition(db, { closesAt: new Date(now.getTime() + 5 * H) });
    const sooner = await makeCompetition(db, { closesAt: new Date(now.getTime() + 2 * H) });
    await makeCompetition(db, { closesAt: new Date(now.getTime() + H), status: 'draft' });
    expect((await nextDraw(now, db))?.id).toBe(sooner.id);
    expect((await nextDraw(new Date(now.getTime() + 3 * H), db))?.id).toBe(later.id);
  });
});

describe('badges and filters', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  const comp = (opensH: number, closesH: number, instant = false) => ({
    opensAt: new Date(now.getTime() + opensH * H),
    closesAt: new Date(now.getTime() + closesH * H),
    maxTickets: 100,
    instantPrizes: instant ? [{ title: 'x', valuePence: 1, count: 1 }] : [],
  });

  it('cardBadges keeps its rules', () => {
    expect(cardBadges(comp(1, 48), 0, now)).toEqual(['Coming soon']);
    expect(cardBadges(comp(-48, 23), 80, now)).toEqual(['Almost sold out', 'Ending soon']);
    expect(cardBadges(comp(-48, 25), 100, now)).toEqual(['Sold out']);
    expect(cardBadges(comp(-2, 24), 10, now)).toEqual(['Ending soon', 'New']);
    expect(cardBadges(comp(-25, 72), 79, now)).toEqual([]);
  });

  it('filter counts come from the same 24 hour rules as the badges', () => {
    const items = [
      { c: comp(-2, 3, true), sold: 5 },
      { c: comp(-30, 20), sold: 5 },
      { c: comp(-30, 30, true), sold: 5 },
      { c: comp(-1, 72), sold: 0 },
      { c: comp(2, 72, true), sold: 0 },
    ];
    const counts = filterCounts(items, now);
    expect(counts).toEqual({ all: 5, ending: 2, instant: 3, new: 2 });
    for (const { c, sold } of items) {
      const b = cardBadges(c, sold, now);
      expect(filterFlags(c, sold, now)).toEqual({ ending: b.includes('Ending soon'), instant: c.instantPrizes.length > 0, new: b.includes('New') });
    }
  });
});

describe('home sections', () => {
  it('the proof band shows exact counts, never a plus, and leaves out zeros', () => {
    const html = renderToStaticMarkup(createElement(ProofBand, { stats: { drawsMade: 12, instantWon: 0, liveNow: 3 } }));
    expect(html).toContain('Draws made');
    expect(html).toContain('>12<');
    expect(html).not.toContain('Instant prizes won');
    expect(html).not.toContain('+');
    expect(html).toContain('Draw checks by FairDraw');
  });

  it('the winners strip shows a name only when given one, otherwise the ticket number', () => {
    const now = new Date('2026-11-15T12:00:00Z');
    const wins = [
      { kind: 'draw' as const, prize: 'Main prize', ticket: 3, name: 'Robin K.', at: new Date(now.getTime() - 2 * H), slug: 'a' },
      { kind: 'instant' as const, prize: '50 demo points', ticket: 128, name: null, at: new Date(now.getTime() - 5 * 60_000), slug: 'b' },
    ];
    const html = renderToStaticMarkup(createElement(WinnersMarquee, { wins, now, motion: true }));
    expect(html).toContain('Robin K. won Main prize');
    expect(html).toContain('Ticket 128 won 50 demo points');
    expect(html).toContain('2 hours ago');
    // Under four items the strip stays still: one copy, no pause button.
    expect(html.match(/class="mq-list/g)).toHaveLength(1);
    expect(html).not.toContain('Pause recent winners');
    expect(renderToStaticMarkup(createElement(WinnersMarquee, { wins: [], now, motion: true }))).toBe('');
  });

  it('the hero opens with the demo intro on demo sites and skips competitions that are not open', async () => {
    const now = new Date();
    const open = await makeCompetition(db, { title: 'Open prize' });
    const notYet = await makeCompetition(db, { title: 'Later prize', opensAt: new Date(now.getTime() + H), closesAt: new Date(now.getTime() + 5 * H) });
    const live = [{ c: open, sold: 0 }, { c: notYet, sold: 0 }];
    const demo = renderToStaticMarkup(createElement(Hero, { live, now, demo: true, siteName: 'Test', badges: true, autoplay: true }));
    expect(demo).toContain('Prize draws anyone can check');
    expect(demo).toContain('<h1 class="sr-only">Test: live competitions</h1>');
    expect(demo).toContain('Open prize');
    expect(demo).not.toContain('Later prize');
    expect(demo.match(/aria-roledescription="slide"/g)).toHaveLength(2);
    const real = renderToStaticMarkup(createElement(Hero, { live, now, demo: false, siteName: 'Test', badges: true, autoplay: true }));
    expect(real).toContain('<h1 class="sr-only">Test: live competitions</h1>');
    expect(real).not.toContain('Template demo');
    const none = renderToStaticMarkup(createElement(Hero, { live: [], now, demo: false, siteName: 'Test', badges: true, autoplay: true }));
    expect(none).toContain('No competitions are open right now');
  });

  it('asks for high fetch priority only for the image of the slide shown first', async () => {
    const now = new Date();
    const img = (n: number) => [{ url: `/images/p${n}.svg`, alt: `Prize ${n}` }];
    const live = await Promise.all([1, 2, 3].map(async (n) => ({ c: { ...(await makeCompetition(db, { title: `Prize ${n}` })), images: img(n) }, sold: 0 })));
    const high = (html: string) => (html.match(/<img[^>]*fetchpriority="high"[^>]*>/gi) ?? []);
    const real = renderToStaticMarkup(createElement(Hero, { live, now, demo: false, siteName: 'Test', badges: true, autoplay: true }));
    expect(high(real)).toHaveLength(1);
    expect(real.match(/<img[^>]*loading="lazy"[^>]*>/g)).toHaveLength(2);
    const demo = renderToStaticMarkup(createElement(Hero, { live, now, demo: true, siteName: 'Test', badges: true, autoplay: true }));
    expect(high(demo)).toHaveLength(1);
    expect(high(demo)[0]).toContain('stage-tickets.svg');
  });

  it('renders the filter pills on the server (disabled until the page runs), so they never push the grid down', () => {
    const html = renderToStaticMarkup(createElement(FilterableGrid, { counts: { all: 4, ending: 1, instant: 0, new: 2 } }, null));
    const pills = html.match(/<button[^>]*class="bare pill"[^>]*>/g) ?? [];
    expect(pills).toHaveLength(3); // All, Ending soon, New: a filter with no tiles is not offered
    expect(pills.every((t) => t.includes('disabled'))).toBe(true);
    expect(html).toContain('aria-pressed="true"');
  });

  it('formatAgo says how long ago in plain words', () => {
    const now = new Date('2026-11-15T12:00:00Z');
    expect(formatAgo(new Date(now.getTime() - 20_000), now)).toBe('just now');
    expect(formatAgo(new Date(now.getTime() - 60_000), now)).toBe('1 minute ago');
    expect(formatAgo(new Date(now.getTime() - 2 * H), now)).toBe('2 hours ago');
    expect(formatAgo(new Date(now.getTime() - 30 * H), now)).toBe('yesterday');
    expect(formatAgo(new Date(now.getTime() - 72 * H), now)).toBe('3 days ago');
  });
});
