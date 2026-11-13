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
import { desc } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { auditLog } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { verifyAuditChain } from '@/lib/audit';

export const metadata = { title: 'Audit log' };

export default async function AuditPage() {
  await requireStaff(PERMISSIONS.audit);
  const chain = await verifyAuditChain(getDb());
  const rows = await getDb().select().from(auditLog).orderBy(desc(auditLog.id)).limit(300);
  return (
    <>
      <h1>Audit log</h1>
      <p className={chain.ok ? 'notice' : 'notice err'}>
        {chain.ok ? `Hash chain intact: all ${chain.entries} entries verify.` : `Hash chain broken at entry ${chain.firstBadId}: ${chain.reason}. Investigate immediately (docs/gdpr/breach-procedure.md).`}
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">#</th><th scope="col">When (UTC)</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Details</th><th scope="col">Hash</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num">{r.id}</td><td>{r.at}</td><td>{r.actorRole}{r.actorId ? <><br /><code>{r.actorId.slice(0, 8)}</code></> : null}</td>
                <td>{r.action}</td><td>{r.targetType} <code>{r.targetId.slice(0, 12)}</code></td><td><code>{JSON.stringify(r.details)}</code></td><td><code>{r.hash.slice(0, 12)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
