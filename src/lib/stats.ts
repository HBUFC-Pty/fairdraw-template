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
/**
 * An optional, first-party, cookieless visit counter. Off unless the operator sets STATS_TOKEN (see .env.example and
 * the privacy notice, which then says what is counted). When it is on:
 *
 * - every page a browser shows (a full load or a move within the site) is reported by src/components/PageCounter.tsx
 *   to POST /api/stats/view, which calls recordPageView: one row per minute, page and referring site, with a count;
 * - unique visitors are counted per minute with a keyed hash (HMAC-SHA256, with a key made from APP_SECRET and the
 *   UK date, so it changes every day) of the IP address and browser. Only the hash is stored, never the IP address,
 *   the browser or anything else about the visitor, and no cookie is set;
 * - prefetches, bots and browsers that send Global Privacy Control or Do Not Track are not counted;
 * - the table size has a hard limit, because anyone outside a browser can fake a report: each connection may report
 *   RATE_RULES.pageView views per 10 minutes (keyed by viewRateKey, a daily keyed hash of the IP address alone), and each
 *   minute keeps at most MAX_PAGE_ROWS_PER_MINUTE page rows (the rest are counted as OTHER_PAGE) and at most
 *   MAX_VISITORS_PER_MINUTE visitors;
 * - rows are deleted after 48 hours (pruneVisitCounts, from the scheduled work);
 * - GET /api/stats (bearer STATS_TOKEN) returns totals only, built by statsSnapshot.
 */
import { and, count, gte, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';
import type { Db } from './db';
import { pageViews, pageVisitors, tickets, users } from './db/schema';
import { env } from './env';
import { hmacHex } from './crypto';
import { fromUkLocalInput, ukDate } from './time';
import { fictionalWhere } from './demo';

export const STATS_RETENTION_HOURS = 48;

/**
 * What the privacy notice says while the counter is on (src/app/privacy/page.tsx adds it after the cookies section).
 * Keep it in step with what this file does.
 */
export const STATS_PRIVACY_SECTION = `### Visit counts

We count visits to this site ourselves, so we can see how busy it is. For each page you open we record the page's
address (never anything after a "?"), the minute, and the name of the website that sent you here, if any (for example
www.google.com).

To count how many different people visit without using a cookie, we also store a scrambled code made from your IP
address and your browser's details, using a secret key that changes every day. The visit counter never stores your IP
address or your browser's details themselves, and codes from different days cannot be linked to each other. To stop
anyone flooding the counter, we also keep a scrambled code made the same way from your IP address alone,
for up to a day, to limit how many visits one connection can report. We set no cookie and store nothing on your device
for this.

These counts are deleted after 48 hours, are never shared with anyone, and are used only for our own traffic figures.
Our lawful basis is our legitimate interest in knowing how busy our site is. If your browser sends a Global Privacy
Control or Do Not Track signal, we do not count your visits at all.
`;
const MIN = 60_000;

/** Page and referring site rows kept per minute. Views beyond them still count, under OTHER_PAGE. */
export const MAX_PAGE_ROWS_PER_MINUTE = 100;
/** Distinct visitors counted per minute. Busier minutes show this many. */
export const MAX_VISITORS_PER_MINUTE = 500;
/** Where views go once a minute has MAX_PAGE_ROWS_PER_MINUTE rows. Never a real path: normalisePath refuses "(". */
export const OTHER_PAGE = '(other)';

/** The notice, with the visit counter section after the cookies section while the counter is on (src/lib/stats.ts). */
export function privacyMarkdown(source: string, counting: boolean): string {
  if (!counting) return source;
  const at = source.indexOf('\n### Public entry lists');
  return at === -1 ? `${source.trimEnd()}\n\n${STATS_PRIVACY_SECTION}` : `${source.slice(0, at)}\n${STATS_PRIVACY_SECTION}${source.slice(at)}`;
}

export function statsEnabled(): boolean {
  return Boolean(env().STATS_TOKEN);
}

export function floorMinute(d: Date): Date {
  return new Date(Math.floor(d.getTime() / MIN) * MIN);
}

/** The visitor hash: HMAC-SHA256 keyed by APP_SECRET and the UK date, over the IP address and browser. */
export function visitorHash(secret: string, now: Date, ip: string, userAgent: string): string {
  const key = hmacHex(secret, `visit-counter:${ukDate(now)}`);
  return hmacHex(key, `${ip}\n${userAgent}`).slice(0, 32);
}

/** The rate limit key for one connection's reports: a daily keyed hash of the IP address alone, never the address. */
export function viewRateKey(secret: string, now: Date, ip: string): string {
  const key = hmacHex(secret, `visit-counter-rate:${ukDate(now)}`);
  return `view:${hmacHex(key, ip).slice(0, 32)}`;
}

const BOT = /bot|crawl|spider|slurp|scrap|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|httpclient|okhttp|go-http|java\/|axios|node-fetch|undici|monitor|uptime|pingdom|scan/i;

export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT.test(userAgent);
}

/** Why a request is not counted, or null when it is. */
export function skipReason(h: Headers): 'prefetch' | 'bot' | 'opted-out' | null {
  if (h.has('next-router-prefetch') || h.get('purpose') === 'prefetch' || /prefetch/i.test(h.get('sec-purpose') ?? '')) return 'prefetch';
  if (isBot(h.get('user-agent'))) return 'bot';
  if (h.get('sec-gpc') === '1' || h.get('dnt') === '1') return 'opted-out';
  return null;
}

/**
 * The page to count, or null when it should not be counted. The path only (no query string), with ids and other long
 * segments replaced, so nothing personal is kept. API routes, Next.js files, admin pages and static files are skipped.
 */
export function normalisePath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.length > 512) return null;
  const path = raw.split(/[?#]/)[0]!;
  if (/^\/(api|_next|admin)(\/|$)/.test(path) || /\.[a-z0-9]{1,5}$/i.test(path)) return null;
  const segments = path
    .split('/')
    .slice(1)
    .map((s) => (/^[0-9a-f-]{32,36}$/i.test(s) || /^\d{6,}$/.test(s) ? ':id' : s.length > 64 ? ':long' : s));
  if (segments.some((s) => !/^[\w:.~%-]*$/.test(s))) return null;
  return `/${segments.join('/')}`.replace(/(.)\/$/, '$1').slice(0, 200);
}

/** The referring site's host name, or '' for none, this site itself, or anything that is not a plain host name. */
export function referrerHost(raw: unknown, ownHost: string): string {
  if (typeof raw !== 'string' || !raw || raw.length > 2048) return '';
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return '';
  }
  const own = ownHost.toLowerCase().replace(/^www\./, '');
  if (!/^[a-z0-9.-]{1,100}$/.test(host) || host.replace(/^www\./, '') === own) return '';
  return host;
}

export interface PageView {
  path: string;
  referrerHost: string;
  ip: string;
  userAgent: string;
}

/**
 * Count one page view and its visitor, in one statement. Callers must catch errors: counting never breaks a page.
 * Each minute keeps at most MAX_PAGE_ROWS_PER_MINUTE page rows (a new page or referring site after that is counted
 * under OTHER_PAGE) and MAX_VISITORS_PER_MINUTE visitors, so faked reports cannot grow the tables without limit. Both
 * counts use the primary key index on minute. Concurrent reports can pass a limit by a few rows, never more.
 */
export async function recordPageView(db: Db, v: PageView, now = new Date(), secret = env().APP_SECRET) {
  const minute = floorMinute(now).toISOString();
  const visitor = visitorHash(secret, now, v.ip, v.userAgent);
  await db.execute(sql`
    WITH visitor AS (
      INSERT INTO page_visitors (minute, visitor)
      SELECT ${minute}::timestamptz, ${visitor}
      WHERE (SELECT count(*) FROM page_visitors WHERE minute = ${minute}::timestamptz) < ${MAX_VISITORS_PER_MINUTE}
      ON CONFLICT DO NOTHING
    ),
    target AS (
      SELECT EXISTS (
        SELECT 1 FROM page_views
        WHERE minute = ${minute}::timestamptz AND path = ${v.path} AND referrer_host = ${v.referrerHost}
      ) OR (SELECT count(*) FROM page_views WHERE minute = ${minute}::timestamptz) < ${MAX_PAGE_ROWS_PER_MINUTE} AS keep
    )
    INSERT INTO page_views (minute, path, referrer_host, views)
    SELECT ${minute}::timestamptz,
      CASE WHEN keep THEN ${v.path} ELSE ${OTHER_PAGE} END,
      CASE WHEN keep THEN ${v.referrerHost} ELSE '' END,
      1
    FROM target
    ON CONFLICT (minute, path, referrer_host) DO UPDATE SET views = page_views.views + 1`);
}

/** Delete counter rows older than 48 hours (the scheduled work calls this). */
export async function pruneVisitCounts(db: Db, now = new Date()) {
  const cutoff = new Date(now.getTime() - STATS_RETENTION_HOURS * 3600_000);
  await db.delete(pageViews).where(sql`${pageViews.minute} < ${cutoff.toISOString()}`);
  await db.delete(pageVisitors).where(sql`${pageVisitors.minute} < ${cutoff.toISOString()}`);
}

export interface StatsSnapshot {
  generated_at: string;
  minutes: { t: string; views: number; visitors: number }[];
  active_5m: number;
  today: { views: number; visitors: number; signups: number; tickets: number };
  top_pages_60m: { path: string; views: number }[];
  top_referrers_60m: { host: string; views: number }[];
}

function rowsOf<T>(r: unknown): T[] {
  return (r as { rows: T[] }).rows;
}

/** The totals GET /api/stats returns. Counts only: no hashes, addresses or names. */
export async function statsSnapshot(db: Db, now = new Date()): Promise<StatsSnapshot> {
  const current = floorMinute(now).getTime();
  const iso = (t: number) => new Date(t).toISOString();
  const dayStart = iso(current - 1439 * MIN);
  const hourStart = iso(current - 59 * MIN);
  const todayStart = fromUkLocalInput(`${ukDate(now)}T00:00`);

  const viewsPerMinute = rowsOf<{ m: string | Date; n: string | number }>(
    await db.execute(sql`SELECT minute AS m, sum(views) AS n FROM page_views WHERE minute >= ${dayStart} GROUP BY minute`),
  );
  const visitorsPerMinute = rowsOf<{ m: string | Date; n: string | number }>(
    await db.execute(sql`SELECT minute AS m, count(*) AS n FROM page_visitors WHERE minute >= ${dayStart} GROUP BY minute`),
  );
  const views = new Map(viewsPerMinute.map((r) => [new Date(r.m).getTime(), Number(r.n)]));
  const visitors = new Map(visitorsPerMinute.map((r) => [new Date(r.m).getTime(), Number(r.n)]));
  const minutes = Array.from({ length: 1440 }, (_, i) => {
    const t = current - (1439 - i) * MIN;
    return { t: iso(t), views: views.get(t) ?? 0, visitors: visitors.get(t) ?? 0 };
  });

  const [active] = rowsOf<{ n: string | number }>(
    await db.execute(sql`SELECT count(DISTINCT visitor) AS n FROM page_visitors WHERE minute >= ${iso(current - 4 * MIN)}`),
  );
  const [todayViews] = rowsOf<{ n: string | number | null }>(
    await db.execute(sql`SELECT coalesce(sum(views), 0) AS n FROM page_views WHERE minute >= ${todayStart.toISOString()}`),
  );
  const [todayVisitors] = rowsOf<{ n: string | number }>(
    await db.execute(sql`SELECT count(DISTINCT visitor) AS n FROM page_visitors WHERE minute >= ${todayStart.toISOString()}`),
  );
  // Real accounts and entries only: the demo's fictional players (src/lib/demo.ts) are left out.
  const fictional = db.select({ id: users.id }).from(users).where(fictionalWhere);
  const [signups] = await db
    .select({ n: count() })
    .from(users)
    .where(and(gte(users.createdAt, todayStart), sql`${users.role} = 'player'`, notInArray(users.id, fictional)));
  const [entered] = await db
    .select({ n: count() })
    .from(tickets)
    .where(
      and(
        gte(tickets.createdAt, todayStart),
        inArray(tickets.status, ['active', 'ineligible', 'refunded']),
        or(isNull(tickets.userId), notInArray(tickets.userId, fictional)),
      ),
    );

  const topPages = rowsOf<{ path: string; n: string | number }>(
    await db.execute(sql`
      SELECT path, sum(views) AS n FROM page_views WHERE minute >= ${hourStart}
      GROUP BY path ORDER BY n DESC, path LIMIT 10`),
  );
  const topReferrers = rowsOf<{ host: string; n: string | number }>(
    await db.execute(sql`
      SELECT referrer_host AS host, sum(views) AS n FROM page_views WHERE minute >= ${hourStart} AND referrer_host <> ''
      GROUP BY referrer_host ORDER BY n DESC, referrer_host LIMIT 10`),
  );

  return {
    generated_at: now.toISOString(),
    minutes,
    active_5m: Number(active?.n ?? 0),
    today: {
      views: Number(todayViews?.n ?? 0),
      visitors: Number(todayVisitors?.n ?? 0),
      signups: signups?.n ?? 0,
      tickets: entered?.n ?? 0,
    },
    top_pages_60m: topPages.map((r) => ({ path: r.path, views: Number(r.n) })),
    top_referrers_60m: topReferrers.map((r) => ({ host: r.host, views: Number(r.n) })),
  };
}
