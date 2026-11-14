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
  // Demo sites only: every visitor sign-up on the whole site, per day (src/lib/demo.ts).
  demoSignupsSiteWide: { limit: 300, windowSeconds: 24 * 60 * 60 },
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
