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
import 'server-only';
import { and, eq, isNotNull } from 'drizzle-orm';
import { getDb } from '../db';
import { instantWins, tickets } from '../db/schema';
import { INSTANT_METHOD, instantRows, type InstantRecord } from '../competitions/instant';
import type { Competition } from './queries';

/**
 * What the public sees of a competition's instant prizes. Before the close: the commitment, how many of each prize
 * have been won, and the winning ticket numbers so far (never the unwon numbers). From the advertised close, when the
 * entries are fixed (drizzle/0004): the salt and the full list too, so anyone can check the commitment.
 */
export async function publicInstant(c: Competition, now = new Date()) {
  if (!c.instantPrizes.length || !c.instantCommit || !c.instantSalt || !c.instantCommittedAt) return null;
  const rows = await instantRows(getDb(), c.id);
  const closed = c.status === 'closed' || c.status === 'drawn' || now >= c.closesAt;
  const tiers = c.instantPrizes.map((t, i) => ({ ...t, won: rows.filter((r) => r.tier === i && r.wonTicketId !== null).length }));
  const won = rows.filter((r) => r.wonTicketId !== null).map((r) => ({ ticket: r.ticketNumber, title: r.title, valuePence: r.valuePence, wonAt: r.wonAt! }));
  const record: InstantRecord | null = closed
    ? {
        method: INSTANT_METHOD,
        commit: c.instantCommit,
        committed_at: c.instantCommittedAt.toISOString(),
        salt: c.instantSalt,
        prizes: rows.map((r) => ({ ticket: r.ticketNumber, tier: r.tier, title: r.title, value_pence: r.valuePence, won: r.wonTicketId !== null })),
      }
    : null;
  return { commit: c.instantCommit, committedAt: c.instantCommittedAt, closed, tiers, won, record };
}

/** A player's own instant wins, newest first. */
export async function myInstantWins(userId: string) {
  return getDb()
    .select({ competitionId: instantWins.competitionId, ticket: instantWins.ticketNumber, title: instantWins.title, valuePence: instantWins.valuePence, wonAt: instantWins.wonAt })
    .from(instantWins)
    .innerJoin(tickets, eq(tickets.id, instantWins.wonTicketId))
    .where(and(eq(tickets.userId, userId), isNotNull(instantWins.wonTicketId)));
}
