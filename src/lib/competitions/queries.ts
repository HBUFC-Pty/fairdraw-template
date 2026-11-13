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
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { postalEntries, tickets, users } from '../db/schema';

/** Ticket numbers currently held (reserved or active) in a competition. */
export async function takenNumbers(db: Db, competitionId: string): Promise<Set<number>> {
  const rows = await db
    .select({ n: tickets.number })
    .from(tickets)
    .where(and(eq(tickets.competitionId, competitionId), inArray(tickets.status, ['reserved', 'active'])));
  return new Set(rows.map((r) => r.n));
}

export async function activeCount(db: Db, competitionId: string): Promise<number> {
  const [r] = await db
    .select({ c: sql<string>`count(*)` })
    .from(tickets)
    .where(and(eq(tickets.competitionId, competitionId), eq(tickets.status, 'active')));
  return Number(r?.c ?? 0);
}

/**
 * Entries one person holds in a competition, for the per-person cap: paid tickets (reserved or active) on their
 * account plus accepted postal entries under the same email address. Paid and free entries share one cap.
 */
export async function entriesHeld(db: Db, competitionId: string, person: { userId?: string | null; email: string }): Promise<number> {
  const email = person.email.trim().toLowerCase();
  let userId = person.userId ?? null;
  if (!userId) {
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    userId = u?.id ?? null;
  }
  const [r] = await db
    .select({ c: sql<string>`count(*)` })
    .from(tickets)
    .leftJoin(postalEntries, eq(postalEntries.id, tickets.postalEntryId))
    .where(
      and(
        eq(tickets.competitionId, competitionId),
        inArray(tickets.status, ['reserved', 'active']),
        userId
          ? sql`(${tickets.userId} = ${userId} OR lower(${postalEntries.email}) = ${email})`
          : sql`lower(${postalEntries.email}) = ${email}`,
      ),
    );
  return Number(r?.c ?? 0);
}
