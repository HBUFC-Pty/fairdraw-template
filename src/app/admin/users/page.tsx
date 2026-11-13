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
