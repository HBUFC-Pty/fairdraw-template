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
 * Scheduled retention job (runs daily from the worker). Deletes or anonymises personal data when its retention period
 * ends. The periods here must match the privacy notice and docs/gdpr/retention.md.
 */
import { and, isNull, lt, sql } from 'drizzle-orm';
import type { Db } from './db';
import { exclusions, users, webhookEvents } from './db/schema';
import { pruneTokensAndSessions } from './auth/service';
import { pruneRateLimits } from './rate-limit';
import { deleteAccount } from './account/service';

export const RETENTION = {
  unverifiedAccountDays: 30,
  postalEntryDetailsDaysAfterDraw: 180,
  webhookEventDays: 90,
  inactiveAccountYears: 3,
  financialRecordYears: 6,
} as const;

export async function runRetention(db: Db, now = new Date()) {
  const day = 86400_000;
  await pruneTokensAndSessions(db, now);
  await pruneRateLimits(db, now);
  await db.delete(webhookEvents).where(lt(webhookEvents.receivedAt, new Date(now.getTime() - RETENTION.webhookEventDays * day)));
  await db.delete(exclusions).where(lt(exclusions.until, now));

  // Unverified sign-ups with no orders: delete outright after 30 days.
  const unverified = await db.execute<{ id: string }>(sql`
    SELECT u.id FROM users u
    WHERE u.email_verified_at IS NULL AND u.deleted_at IS NULL
      AND u.created_at < ${new Date(now.getTime() - RETENTION.unverifiedAccountDays * day).toISOString()}
      AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM postal_entries p WHERE p.recorded_by = u.id)`);
  const unverifiedIds = (unverified as unknown as { rows: { id: string }[] }).rows.map((r) => r.id);
  if (unverifiedIds.length) await db.delete(users).where(sql`${users.id} IN (${sql.join(unverifiedIds.map((id) => sql`${id}`), sql`, `)})`);

  // Postal entry names and addresses: removed 180 days after the competition was drawn (the ticket stays).
  await db.execute(sql`
    UPDATE postal_entries p SET full_name = NULL, postal_address = NULL, email = NULL, anonymised_at = ${now.toISOString()}
    FROM competitions c
    WHERE c.id = p.competition_id AND p.anonymised_at IS NULL AND c.drawn_at IS NOT NULL
      AND c.drawn_at < ${new Date(now.getTime() - RETENTION.postalEntryDetailsDaysAfterDraw * day).toISOString()}`);

  // Player accounts inactive for 3 years: anonymised (financial records stay, as for a deletion request).
  const inactive = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        sql`${users.role} = 'player'`,
        sql`coalesce(${users.lastLoginAt}, ${users.createdAt}) < ${new Date(now.getTime() - RETENTION.inactiveAccountYears * 365 * day).toISOString()}`,
        sql`(${users.selfExcludedUntil} IS NULL OR ${users.selfExcludedUntil} < ${now.toISOString()})`,
      ),
    );
  for (const u of inactive) await deleteAccount(db, u.id, now);

  // Orders, refunds and tickets are financial and draw records. Once an account is anonymised they are linked only to
  // an anonymous id, so nothing personal remains in them; they are kept for the statutory period (see the docs).
  return { unverifiedDeleted: unverifiedIds.length, inactiveAnonymised: inactive.length };
}
