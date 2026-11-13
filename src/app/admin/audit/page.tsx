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
