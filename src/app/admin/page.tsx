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
import { sql } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { verifyAuditChain } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/admin/service';
import { FlashMessage } from '@/components/Flash';

export const metadata = { title: 'Admin' };

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireStaff();
  const role = s.user.role;
  const can = (k: keyof typeof PERMISSIONS) => (PERMISSIONS[k] as readonly string[]).includes(role);
  const counts = (await getDb().execute(sql`
    SELECT (SELECT count(*) FROM competitions WHERE status = 'live') AS live,
           (SELECT count(*) FROM refunds WHERE status IN ('pending', 'failed')) AS refunds,
           (SELECT count(*) FROM competitions WHERE status = 'closed') AS awaiting`)) as unknown as { rows: { live: string; refunds: string; awaiting: string }[] };
  const c = counts.rows[0]!;
  const chain = can('audit') ? await verifyAuditChain(getDb()) : null;
  return (
    <>
      <h1>Admin</h1>
      <FlashMessage searchParams={await searchParams} />
      <p>Signed in as {s.user.email} ({role}). Every action here is recorded in the audit log.</p>
      <ul>
        {can('competitions') ? <li><Link href="/admin/competitions">Competitions</Link>: {c.live} live, {c.awaiting} closed and awaiting their draw</li> : null}
        {can('postal') && !can('competitions') ? <li><Link href="/admin/competitions">Record postal entries</Link></li> : null}
        {can('refunds') ? <li><Link href="/admin/refunds">Refunds</Link>: {c.refunds} pending or failed</li> : null}
        {can('users') ? <li><Link href="/admin/users">Player support</Link></li> : null}
        {can('audit') ? <li><Link href="/admin/audit">Audit log</Link>: {chain?.ok ? `chain intact (${chain.entries} entries)` : `CHAIN BROKEN at entry ${chain?.firstBadId}`}</li> : null}
        {can('staff') ? <li><Link href="/admin/staff">Staff and roles</Link></li> : null}
      </ul>
      <p className="muted">Closing, committing and drawing happen automatically, on time, in the worker. Nobody can trigger, delay or redo a draw from here.</p>
    </>
  );
}
