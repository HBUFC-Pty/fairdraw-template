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
