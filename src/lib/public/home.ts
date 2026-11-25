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
 * Read-only queries for the showcase home page (brand.layout.home "showcase"). Every number they return is counted
 * from the database: nothing is rounded up, padded or invented. Nothing here returns an email or a full name: a main
 * draw winner's display name appears only when they consented to it (winners.public_consent), and instant wins only
 * ever show the ticket number.
 */
import 'server-only';
import { and, asc, count, desc, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm';
import { getDb, type Db } from '../db';
import { competitions, draws, instantWins, winners } from '../db/schema';
import type { Competition } from './queries';

export type RecentWin = {
  kind: 'draw' | 'instant';
  /** What was won: the competition title for a main draw, the instant prize title for an instant win. */
  prize: string;
  ticket: number;
  /** The winner's consented display name (main draws only), otherwise null. */
  name: string | null;
  at: Date;
  slug: string;
};

/**
 * The latest wins, newest first: main draw winners (from made draws) and instant prizes won (only rows with a winning
 * ticket). Names only with consent; never an email.
 */
export async function recentWins(limit = 20, db: Db = getDb()): Promise<RecentWin[]> {
  const main = await db
    .select({
      prize: competitions.title,
      slug: competitions.slug,
      ticket: winners.ticketNumber,
      consent: winners.publicConsent,
      displayName: winners.displayName,
      at: draws.drawnAt,
    })
    .from(winners)
    .innerJoin(competitions, eq(competitions.id, winners.competitionId))
    .innerJoin(draws, eq(draws.competitionId, winners.competitionId))
    .where(isNotNull(draws.drawnAt))
    .orderBy(desc(draws.drawnAt), asc(winners.position))
    .limit(limit);
  const instant = await db
    .select({ prize: instantWins.title, slug: competitions.slug, ticket: instantWins.ticketNumber, at: instantWins.wonAt })
    .from(instantWins)
    .innerJoin(competitions, eq(competitions.id, instantWins.competitionId))
    .where(and(isNotNull(instantWins.wonTicketId), isNotNull(instantWins.wonAt)))
    .orderBy(desc(instantWins.wonAt))
    .limit(limit);
  const out: RecentWin[] = [
    ...main.map((r) => ({ kind: 'draw' as const, prize: r.prize, slug: r.slug, ticket: r.ticket, name: r.consent && r.displayName ? r.displayName : null, at: r.at! })),
    ...instant.map((r) => ({ kind: 'instant' as const, prize: r.prize, slug: r.slug, ticket: r.ticket, name: null, at: r.at! })),
  ];
  return out.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export type InstantPrizeTile = {
  slug: string;
  competition: string;
  title: string;
  valuePence: number;
  count: number;
  won: number;
  left: number;
  /** 0 for a competition's lowest value tier, rising to 2 for its top tier (picks the coin, gem or star art). */
  rank: 0 | 1 | 2;
};

/**
 * The instant prizes still to be won in live competitions, one tile per prize tier, most valuable first. The same
 * figures as the competition page (publicInstant): `count` from the competition's tiers, `won` from instant_wins rows
 * with a winning ticket, and `left` is exactly count minus won.
 */
export async function instantPrizeSummary(live: Competition[], db: Db = getDb()): Promise<InstantPrizeTile[]> {
  const comps = live.filter((c) => c.instantPrizes.length > 0 && c.instantCommit);
  if (!comps.length) return [];
  const rows = await db
    .select({ competitionId: instantWins.competitionId, tier: instantWins.tier, won: sql<number>`count(${instantWins.wonTicketId})::int` })
    .from(instantWins)
    .where(inArray(instantWins.competitionId, comps.map((c) => c.id)))
    .groupBy(instantWins.competitionId, instantWins.tier);
  const out: InstantPrizeTile[] = [];
  for (const c of comps) {
    const values = [...new Set(c.instantPrizes.map((t) => t.valuePence))].sort((a, b) => a - b);
    c.instantPrizes.forEach((t, i) => {
      const won = Number(rows.find((r) => r.competitionId === c.id && r.tier === i)?.won ?? 0);
      const pos = values.indexOf(t.valuePence);
      const rank = (values.length === 1 ? 2 : pos === values.length - 1 ? 2 : pos === 0 ? 0 : 1) as 0 | 1 | 2;
      out.push({ slug: c.slug, competition: c.title, title: t.title, valuePence: t.valuePence, count: t.count, won, left: Math.max(0, t.count - won), rank });
    });
  }
  return out.sort((a, b) => b.valuePence - a.valuePence || a.competition.localeCompare(b.competition));
}

export type SiteStats = { drawsMade: number; instantWon: number; liveNow: number };

/** Exact counts for the proof band: draws made (with their randomness), instant prizes won, and live competitions. */
export async function siteStats(db: Db = getDb()): Promise<SiteStats> {
  const [d] = await db.select({ n: count() }).from(draws).where(isNotNull(draws.randomness));
  const [w] = await db.select({ n: count() }).from(instantWins).where(isNotNull(instantWins.wonTicketId));
  const [l] = await db.select({ n: count() }).from(competitions).where(eq(competitions.status, 'live'));
  return { drawsMade: Number(d?.n ?? 0), instantWon: Number(w?.n ?? 0), liveNow: Number(l?.n ?? 0) };
}

/** The next draw due: the earliest future draw time among live and closed (awaiting draw) competitions, or null. */
export async function nextDraw(now = new Date(), db: Db = getDb()): Promise<Competition | null> {
  const [c] = await db
    .select()
    .from(competitions)
    .where(and(inArray(competitions.status, ['live', 'closed']), gt(competitions.drawAt, now)))
    .orderBy(asc(competitions.drawAt))
    .limit(1);
  return c ?? null;
}
