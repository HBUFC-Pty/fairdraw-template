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
/** Read-only queries for public pages. Nothing here returns names, emails or addresses. */
import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { competitions, draws, tickets, winners } from '../db/schema';
import { env } from '../env';
import { fairdrawEntryCode } from '../fairdraw/entry-codes';

export type Competition = typeof competitions.$inferSelect;

export async function soldCount(competitionId: string): Promise<number> {
  const [r] = await getDb()
    .select({ c: sql<string>`count(*)` })
    .from(tickets)
    .where(and(eq(tickets.competitionId, competitionId), eq(tickets.status, 'active')));
  return Number(r?.c ?? 0);
}

export async function liveCompetitions() {
  const rows = await getDb()
    .select()
    .from(competitions)
    .where(eq(competitions.status, 'live'))
    .orderBy(asc(competitions.closesAt));
  return Promise.all(rows.map(async (c) => ({ c, sold: await soldCount(c.id) })));
}

export async function competitionBySlug(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const [c] = await getDb().select().from(competitions).where(eq(competitions.slug, slug));
  if (!c || c.status === 'draft' || c.status === 'cancelled') return null;
  const [d] = await getDb().select().from(draws).where(eq(draws.competitionId, c.id));
  const ws = await getDb().select().from(winners).where(eq(winners.competitionId, c.id)).orderBy(asc(winners.position));
  return { c, draw: d ?? null, sold: d ? d.ticketsSold : await soldCount(c.id), winners: ws.map((w) => ({ position: w.position, ticket: w.ticketNumber, name: w.publicConsent ? w.displayName : null })) };
}

export async function finishedCompetitions(limit = 200) {
  const rows = await getDb()
    .select({ c: competitions, d: draws })
    .from(competitions)
    .innerJoin(draws, eq(draws.competitionId, competitions.id))
    .orderBy(desc(draws.scheduledDrawAt))
    .limit(limit);
  const ids = rows.map((r) => r.c.id);
  const ws = ids.length ? await getDb().select().from(winners).where(inArray(winners.competitionId, ids)).orderBy(asc(winners.position)) : [];
  return rows.map((r) => ({
    ...r,
    winners: ws.filter((w) => w.competitionId === r.c.id).map((w) => ({ ticket: w.ticketNumber, name: w.publicConsent ? w.displayName : null })),
  }));
}

/**
 * The public entry list: ticket number and a short code per ticket, never a name. Before the close it lists the
 * active tickets; from the close it lists exactly the committed (frozen) list.
 */
export async function publicEntryList(c: Competition, committed: number[] | null) {
  const secret = env().ENTRY_CODE_SECRET;
  const rows = await getDb()
    .select({ number: tickets.number, orderId: tickets.orderId, postalEntryId: tickets.postalEntryId, status: tickets.status, source: tickets.source })
    .from(tickets)
    .where(and(eq(tickets.competitionId, c.id), inArray(tickets.status, ['active', 'refunded', 'ineligible'])))
    .orderBy(asc(tickets.number));
  const wanted = committed ? new Set(committed) : null;
  return rows
    .filter((r) => (wanted ? wanted.has(r.number) : r.status === 'active'))
    .map((r) => ({ ticket: r.number, code: fairdrawEntryCode(secret, c.id, r.number, r.orderId ?? r.postalEntryId ?? ''), free: r.source === 'postal' }));
}
