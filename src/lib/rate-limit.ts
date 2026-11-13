/**
 * Postgres-backed fixed-window rate limiting. Used on login, sign-up, password reset, email verification resend,
 * 2FA and checkout. Works across several app instances because the counter lives in the database.
 */
import { sql } from 'drizzle-orm';
import type { Db } from './db';

export interface RateRule {
  limit: number;
  windowSeconds: number;
}

export const RATE_RULES = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  loginEmail: { limit: 5, windowSeconds: 15 * 60 },
  signup: { limit: 5, windowSeconds: 60 * 60 },
  reset: { limit: 5, windowSeconds: 60 * 60 },
  verifyResend: { limit: 5, windowSeconds: 60 * 60 },
  totp: { limit: 10, windowSeconds: 15 * 60 },
  checkout: { limit: 20, windowSeconds: 10 * 60 },
} satisfies Record<string, RateRule>;

/** Count one attempt against `key`. Returns false when the limit for the current window is exceeded. */
export async function hit(db: Db, key: string, rule: RateRule, now = new Date()): Promise<boolean> {
  const windowStart = new Date(Math.floor(now.getTime() / (rule.windowSeconds * 1000)) * rule.windowSeconds * 1000);
  const rows = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, ${windowStart.toISOString()}, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count`);
  const count = Number((rows as unknown as { rows: { count: number }[] }).rows[0]?.count ?? 0);
  return count <= rule.limit;
}

/** Remove windows older than a day (called by the retention job). */
export async function pruneRateLimits(db: Db, now = new Date()) {
  await db.execute(sql`DELETE FROM rate_limits WHERE window_start < ${new Date(now.getTime() - 86400_000).toISOString()}`);
}
