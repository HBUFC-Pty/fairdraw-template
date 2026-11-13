import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { competitions, draws } from '../db/schema';

export async function drawBySlug(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const [r] = await getDb().select({ d: draws, c: competitions }).from(draws).innerJoin(competitions, eq(competitions.id, draws.competitionId)).where(eq(competitions.slug, slug));
  return r ?? null;
}

export const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' };
