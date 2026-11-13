import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { normaliseEmail } from '@/lib/auth/service';

export const metadata = { title: 'Player support' };

/** Exact email lookup only: no browsing or searching the player list. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff(PERMISSIONS.users);
  const q = (await searchParams).email;
  const email = typeof q === 'string' ? normaliseEmail(q).slice(0, 254) : '';
  const [u] = email ? await getDb().select({ id: users.id }).from(users).where(eq(users.email, email)) : [];
  return (
    <>
      <h1>Player support</h1>
      <form className="stack" method="get">
        <label>Find a player by their exact email address<input name="email" type="email" defaultValue={email} required /></label>
        <button type="submit">Find</button>
      </form>
      {email ? (u ? <p><Link href={`/admin/users/${u.id}`}>Open the record</Link> (opening it is recorded in the audit log)</p> : <p>No account with that email.</p>) : null}
    </>
  );
}
