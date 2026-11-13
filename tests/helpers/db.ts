import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';
import path from 'node:path';
import * as schema from '../../src/lib/db/schema';
import type { Db } from '../../src/lib/db';
import { hashPassword } from '../../src/lib/auth/password';

/** A fresh in-process Postgres with all migrations applied (including the fairness triggers). */
export async function testDb(): Promise<{ db: Db; client: PGlite }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../../drizzle') });
  return { db: db as unknown as Db, client };
}

let pwHash: string | undefined;

export async function makeUser(db: Db, over: Partial<typeof schema.users.$inferInsert> = {}) {
  pwHash ??= await hashPassword('correct horse battery staple');
  const [u] = await db
    .insert(schema.users)
    .values({
      email: `user${Math.random().toString(36).slice(2)}@example.test`,
      passwordHash: pwHash,
      firstName: 'Sam',
      lastName: 'Taylor',
      dateOfBirth: '1990-05-01',
      emailVerifiedAt: new Date(),
      ...over,
    })
    .returning();
  return u!;
}

/** A live competition. Times default to: opened an hour ago, closes in an hour, drawn at close. */
export async function makeCompetition(db: Db, over: Partial<typeof schema.competitions.$inferInsert> = {}) {
  const now = Date.now();
  const closesAt = over.closesAt ?? new Date(now + 3600_000);
  const [c] = await db
    .insert(schema.competitions)
    .values({
      slug: `comp-${Math.random().toString(36).slice(2)}`,
      title: 'Test prize',
      prizeDescription: 'A very nice test prize',
      prizeValuePence: 100_000,
      ticketPricePence: 250,
      maxTickets: 100,
      perPersonCap: 10,
      opensAt: new Date(now - 3600_000),
      closesAt,
      drawAt: over.drawAt ?? closesAt,
      status: 'live',
      ...over,
    })
    .returning();
  return c!;
}

/** Insert active paid tickets directly (as if paid), for draw tests. */
export async function addPaidTickets(db: Db, competitionId: string, userId: string, numbers: number[]) {
  const [o] = await db
    .insert(schema.orders)
    .values({ userId, status: 'paid', totalPence: numbers.length * 250, provider: 'test', expiresAt: new Date(Date.now() + 3600_000), paidAt: new Date() })
    .returning();
  await db.insert(schema.tickets).values(
    numbers.map((n) => ({ competitionId, number: n, userId, orderId: o!.id, source: 'paid' as const, allocation: 'chosen' as const, status: 'active' as const })),
  );
  return o!;
}

/** Move a competition's close into the past without tripping the "times are fixed once live" trigger. */
export async function backdate(db: Db, competitionId: string, closesAt: Date, drawAt: Date = closesAt) {
  await db.execute(sql`ALTER TABLE competitions DISABLE TRIGGER competitions_guard`);
  await db.execute(sql`UPDATE competitions SET opens_at = ${new Date(closesAt.getTime() - 86400_000).toISOString()}, closes_at = ${closesAt.toISOString()}, draw_at = ${drawAt.toISOString()} WHERE id = ${competitionId}`);
  await db.execute(sql`ALTER TABLE competitions ENABLE TRIGGER competitions_guard`);
}

/** Drizzle wraps database errors ("Failed query: ..."); look at the cause for the trigger's message. */
export async function expectDbError(p: Promise<unknown>, contains?: string) {
  let err: unknown;
  try {
    await p;
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`expected a database error${contains ? ` containing "${contains}"` : ''}, but the query succeeded`);
  const messages: string[] = [];
  for (let e = err as { message?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) messages.push(String(e.message));
  if (contains && !messages.some((m) => m.includes(contains))) throw new Error(`expected "${contains}" in: ${messages.join(' | ')}`);
}
