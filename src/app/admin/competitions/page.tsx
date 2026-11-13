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
import { desc } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { competitions } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { FlashMessage } from '@/components/Flash';
import { formatUk } from '@/lib/time';

export const metadata = { title: 'Competitions' };

export default async function AdminCompetitions({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireStaff(PERMISSIONS.postal);
  const manage = (PERMISSIONS.competitions as readonly string[]).includes(s.user.role);
  const rows = await getDb().select().from(competitions).orderBy(desc(competitions.createdAt)).limit(200);
  return (
    <>
      <h1>Competitions</h1>
      <FlashMessage searchParams={await searchParams} />
      {manage ? <p><Link className="button" href="/admin/competitions/new">New competition</Link></p> : null}
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Closes</th><th scope="col">Draw</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{manage ? <Link href={`/admin/competitions/${c.id}`}>{c.title}</Link> : c.title}</td>
                <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                <td>{formatUk(c.closesAt)}</td>
                <td>{formatUk(c.drawAt)}</td>
                <td>{c.status === 'live' ? <Link href={`/admin/competitions/${c.id}/postal`}>Postal entries</Link> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
