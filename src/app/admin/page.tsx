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
