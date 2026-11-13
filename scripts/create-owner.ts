/**
 * Make an existing, email-confirmed account the site owner. Usage:
 *   pnpm tsx scripts/create-owner.ts you@example.com          (development)
 *   docker compose exec app node dist/create-owner.mjs you@example.com   (production)
 * Sign up through the website first. The owner must then set up two-factor authentication before using admin pages.
 */
import { eq } from 'drizzle-orm';
import { getDb, getPool } from '../src/lib/db';
import { sessions, users } from '../src/lib/db/schema';
import { appendAudit } from '../src/lib/audit';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('usage: create-owner <email>');
  process.exit(1);
}
const db = getDb();
const [u] = await db.select().from(users).where(eq(users.email, email));
if (!u || u.deletedAt) {
  console.error('No account with that email. Sign up on the website first.');
  process.exit(1);
}
if (!u.emailVerifiedAt) {
  console.error('Confirm the email address first (use the link in the sign-up email).');
  process.exit(1);
}
await db.update(users).set({ role: 'owner' }).where(eq(users.id, u.id));
await db.delete(sessions).where(eq(sessions.userId, u.id));
await appendAudit(db, { id: null, role: 'system' }, { action: 'staff.set_role', targetType: 'user', targetId: u.id, details: { from: u.role, to: 'owner', via: 'create-owner script' } });
console.info(`${email} is now an owner. Log in and set up two-factor authentication.`);
await getPool().end();
