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
