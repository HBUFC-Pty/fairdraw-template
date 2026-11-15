import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addPaidTickets, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { pageViews, pageVisitors } from '../src/lib/db/schema';
import { env, resetEnvCache } from '../src/lib/env';
import {
  STATS_PRIVACY_SECTION,
  floorMinute,
  normalisePath,
  privacyMarkdown,
  pruneVisitCounts,
  recordPageView,
  referrerHost,
  skipReason,
  statsSnapshot,
  visitorHash,
} from '../src/lib/stats';
import { runRetention } from '../src/lib/retention';
import { loadContent } from '../src/lib/content/load';

const state = vi.hoisted(() => ({ db: undefined as unknown, ip: '203.0.113.7' }));
vi.mock('@/lib/db', () => ({ getDb: () => state.db }));
vi.mock('@/lib/web/request', () => ({ clientIp: async () => state.ip }));

const TOKEN = 's'.repeat(40);
const IP = '203.0.113.7';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/150.0';
const MIN = 60_000;
const H = 3600_000;

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
  state.db = db;
  state.ip = IP;
});
afterEach(() => {
  delete process.env.STATS_TOKEN;
  resetEnvCache();
});

function statsOn() {
  process.env.STATS_TOKEN = TOKEN;
  resetEnvCache();
}

const view = (over: Partial<{ path: string; referrerHost: string; ip: string; userAgent: string }> = {}) => ({
  path: '/',
  referrerHost: '',
  ip: IP,
  userAgent: UA,
  ...over,
});

async function getStats(auth?: string) {
  const { GET } = await import('@/app/api/stats/route');
  return GET(new Request('http://localhost/api/stats', { headers: auth ? { authorization: auth } : {} }));
}

async function postView(body: unknown, headers: Record<string, string> = {}) {
  const { POST } = await import('@/app/api/stats/view/route');
  return POST(
    new Request('http://localhost:3000/api/stats/view', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: { origin: 'http://localhost:3000', 'user-agent': UA, ...headers },
    }),
  );
}

describe('visit counter: counting', () => {
  it('is off by default', () => {
    expect(env().STATS_TOKEN).toBeUndefined();
  });

  it('refuses a STATS_TOKEN shorter than 32 characters', () => {
    process.env.STATS_TOKEN = 'short';
    resetEnvCache();
    expect(() => env()).toThrow(/STATS_TOKEN/);
  });

  it('upserts one row per minute and page', async () => {
    const now = new Date('2026-11-15T12:00:30Z');
    await recordPageView(db, view(), now);
    await recordPageView(db, view(), new Date(now.getTime() + 20_000));
    await recordPageView(db, view({ path: '/results' }), now);
    await recordPageView(db, view(), new Date(now.getTime() + MIN));
    const rows = (await db.select().from(pageViews)).map((r) => ({ ...r, minute: r.minute.toISOString() }));
    expect(rows).toHaveLength(3);
    expect(rows).toContainEqual({ minute: '2026-11-15T12:00:00.000Z', path: '/', referrerHost: '', views: 2 });
    expect(rows).toContainEqual({ minute: '2026-11-15T12:00:00.000Z', path: '/results', referrerHost: '', views: 1 });
    expect(rows).toContainEqual({ minute: '2026-11-15T12:01:00.000Z', path: '/', referrerHost: '', views: 1 });
  });

  it('skips prefetches, bots and browsers that ask not to be tracked', () => {
    const h = (o: Record<string, string>) => new Headers({ 'user-agent': UA, ...o });
    expect(skipReason(h({}))).toBeNull();
    expect(skipReason(h({ 'next-router-prefetch': '1' }))).toBe('prefetch');
    expect(skipReason(h({ purpose: 'prefetch' }))).toBe('prefetch');
    expect(skipReason(h({ 'sec-purpose': 'prefetch;prerender' }))).toBe('prefetch');
    expect(skipReason(h({ 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }))).toBe('bot');
    expect(skipReason(h({ 'user-agent': 'curl/8.10.1' }))).toBe('bot');
    expect(skipReason(h({ 'user-agent': 'Mozilla/5.0 HeadlessChrome/140.0' }))).toBe('bot');
    expect(skipReason(new Headers())).toBe('bot');
    expect(skipReason(h({ 'sec-gpc': '1' }))).toBe('opted-out');
    expect(skipReason(h({ dnt: '1' }))).toBe('opted-out');
  });

  it('never stores the IP address or browser, only a daily keyed hash', async () => {
    const now = new Date('2026-11-15T12:00:00Z');
    await recordPageView(db, view(), now);
    const all = JSON.stringify([await db.select().from(pageViews), await db.select().from(pageVisitors)]);
    expect(all).not.toContain(IP);
    expect(all).not.toContain('Firefox');
    expect(all).not.toContain('Mozilla');
    const [v] = await db.select().from(pageVisitors);
    expect(v!.visitor).toMatch(/^[0-9a-f]{32}$/);
    expect(v!.visitor).toBe(visitorHash(env().APP_SECRET, now, IP, UA));
    // The key changes every UK day, so codes from different days cannot be linked.
    expect(visitorHash(env().APP_SECRET, new Date('2026-11-16T12:00:00Z'), IP, UA)).not.toBe(v!.visitor);
  });

  it('counts distinct visitors per minute', async () => {
    const now = new Date('2026-11-15T12:00:10Z');
    await recordPageView(db, view(), now);
    await recordPageView(db, view({ path: '/results' }), now);
    await recordPageView(db, view({ ip: '198.51.100.9' }), now);
    await recordPageView(db, view(), new Date(now.getTime() + MIN));
    const s = await statsSnapshot(db, new Date(now.getTime() + MIN));
    expect(s.minutes.at(-2)).toEqual({ t: '2026-11-15T12:00:00.000Z', views: 3, visitors: 2 });
    expect(s.minutes.at(-1)).toEqual({ t: '2026-11-15T12:01:00.000Z', views: 1, visitors: 1 });
    expect(s.active_5m).toBe(2);
    expect(s.today.views).toBe(4);
    expect(s.today.visitors).toBe(2);
  });

  it('keeps only the path, with ids and long segments replaced, and skips API, admin and static files', () => {
    expect(normalisePath('/competitions/gem-5000?ref=abc#top')).toBe('/competitions/gem-5000');
    expect(normalisePath('/checkout/test/3f1c2a4e-0b8d-4a51-9a7e-2a4c6f8d1e09')).toBe('/checkout/test/:id');
    expect(normalisePath('/results/')).toBe('/results');
    expect(normalisePath('/')).toBe('/');
    expect(normalisePath('/api/stats')).toBeNull();
    expect(normalisePath('/admin/users/1')).toBeNull();
    expect(normalisePath('/_next/static/chunk.js')).toBeNull();
    expect(normalisePath('/favicon.ico')).toBeNull();
    expect(normalisePath('https://evil.example/')).toBeNull();
    expect(normalisePath('//evil.example/')).toBeNull();
    expect(normalisePath('/<script>')).toBeNull();
    expect(normalisePath(42)).toBeNull();
  });

  it('keeps only the referring host, never this site', () => {
    expect(referrerHost('https://www.google.com/search?q=prize', 'demo.example.co.uk')).toBe('www.google.com');
    expect(referrerHost('https://demo.example.co.uk/results', 'demo.example.co.uk')).toBe('');
    expect(referrerHost('https://www.demo.example.co.uk/', 'demo.example.co.uk')).toBe('');
    expect(referrerHost('not a url', 'demo.example.co.uk')).toBe('');
    expect(referrerHost(undefined, 'demo.example.co.uk')).toBe('');
  });
});

describe('visit counter: retention', () => {
  it('deletes rows older than 48 hours, in the prune and in the retention job', async () => {
    const now = new Date('2026-11-15T12:00:00Z');
    await recordPageView(db, view(), new Date(now.getTime() - 49 * H));
    await recordPageView(db, view(), new Date(now.getTime() - 47 * H));
    await pruneVisitCounts(db, now);
    expect(await db.select().from(pageViews)).toHaveLength(1);
    expect(await db.select().from(pageVisitors)).toHaveLength(1);
    await runRetention(db, new Date(now.getTime() + 2 * H));
    expect(await db.select().from(pageViews)).toHaveLength(0);
    expect(await db.select().from(pageVisitors)).toHaveLength(0);
  });
});

describe('GET /api/stats', () => {
  it('does not exist when STATS_TOKEN is unset', async () => {
    const r = await getStats(`Bearer ${TOKEN}`);
    expect(r.status).toBe(404);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });

  it('refuses a missing or wrong token', async () => {
    statsOn();
    expect((await getStats()).status).toBe(401);
    expect((await getStats(`Bearer ${'x'.repeat(40)}`)).status).toBe(401);
    expect((await getStats(TOKEN)).status).toBe(401);
  });

  it('returns the contract: 1,440 zero-filled minutes oldest first, today and the top lists', async () => {
    statsOn();
    const now = new Date();
    await recordPageView(db, view({ path: '/results', referrerHost: 'www.google.com' }), new Date(now.getTime() - 10 * MIN));
    await recordPageView(db, view(), now);
    const r = await getStats(`Bearer ${TOKEN}`);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const s = await r.json();
    expect(Object.keys(s).sort()).toEqual(['active_5m', 'generated_at', 'minutes', 'today', 'top_pages_60m', 'top_referrers_60m']);
    expect(new Date(s.generated_at).toISOString()).toBe(s.generated_at);
    expect(s.minutes).toHaveLength(1440);
    expect(Object.keys(s.minutes[0]).sort()).toEqual(['t', 'views', 'visitors']);
    const times = s.minutes.map((m: { t: string }) => Date.parse(m.t));
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBe(MIN);
    expect(times.at(-1)).toBe(floorMinute(new Date(s.generated_at)).getTime());
    expect(s.minutes.filter((m: { views: number }) => m.views > 0)).toHaveLength(2);
    expect(s.minutes[0]).toEqual({ t: s.minutes[0].t, views: 0, visitors: 0 });
    expect(s.active_5m).toBe(1);
    expect(Object.keys(s.today).sort()).toEqual(['signups', 'tickets', 'views', 'visitors']);
    expect(s.top_pages_60m).toEqual([
      { path: '/', views: 1 },
      { path: '/results', views: 1 },
    ]);
    expect(s.top_referrers_60m).toEqual([{ host: 'www.google.com', views: 1 }]);
    expect(JSON.stringify(s)).not.toContain(IP);
  });

  it("counts today's sign-ups and tickets, leaving out the demo's fictional players", async () => {
    const now = new Date();
    const player = await makeUser(db);
    await makeUser(db, { createdAt: new Date(now.getTime() - 50 * H) });
    await makeUser(db, { role: 'admin' });
    const fictional = await makeUser(db, { email: 'player1@example.test', passwordHash: null });
    const c = await makeCompetition(db);
    await addPaidTickets(db, c.id, player.id, [1, 2, 3]);
    await addPaidTickets(db, c.id, fictional.id, [4, 5]);
    const s = await statsSnapshot(db, now);
    expect(s.today.signups).toBe(1);
    expect(s.today.tickets).toBe(3);
  });
});

describe('POST /api/stats/view', () => {
  it('does not exist when STATS_TOKEN is unset, and counts nothing', async () => {
    expect((await postView({ p: '/' })).status).toBe(404);
    expect(await db.select().from(pageViews)).toHaveLength(0);
  });

  it('refuses reports from other sites', async () => {
    statsOn();
    expect((await postView({ p: '/' }, { origin: 'https://evil.example' })).status).toBe(403);
    expect(await db.select().from(pageViews)).toHaveLength(0);
  });

  it('counts a page view with the referring host, excluding this site', async () => {
    statsOn();
    expect((await postView({ p: '/competitions/gem?x=1', r: 'https://www.bing.com/search?q=gem' })).status).toBe(204);
    expect((await postView({ p: '/results', r: 'http://localhost:3000/' })).status).toBe(204);
    const rows = await db.select().from(pageViews);
    expect(rows.map((r) => [r.path, r.referrerHost]).sort()).toEqual([
      ['/competitions/gem', 'www.bing.com'],
      ['/results', ''],
    ]);
    expect(await db.select().from(pageVisitors)).toHaveLength(1);
  });

  it('skips bots, prefetches, opt-outs, API paths and bad bodies', async () => {
    statsOn();
    await postView({ p: '/' }, { 'user-agent': 'Googlebot/2.1' });
    await postView({ p: '/' }, { 'next-router-prefetch': '1' });
    await postView({ p: '/' }, { 'sec-gpc': '1' });
    await postView({ p: '/api/stats' });
    expect((await postView('not json')).status).toBe(204);
    expect(await db.select().from(pageViews)).toHaveLength(0);
  });
});

describe('privacy notice', () => {
  it('describes the counter only while it is on, after the cookies section', () => {
    const source = loadContent('privacy');
    expect(privacyMarkdown(source, false)).toBe(source);
    const on = privacyMarkdown(source, true);
    expect(on).toContain(STATS_PRIVACY_SECTION);
    expect(on.indexOf('### Visit counts')).toBeGreaterThan(on.indexOf('### Cookies'));
    expect(on.indexOf('### Visit counts')).toBeLessThan(on.indexOf('### Public entry lists'));
    for (const words of ['no cookie', 'IP address', 'deleted after 48 hours', 'never shared', 'Global Privacy']) expect(STATS_PRIVACY_SECTION).toContain(words);
    expect(privacyMarkdown('# Notice', true)).toBe(`# Notice\n\n${STATS_PRIVACY_SECTION}`);
  });
});
