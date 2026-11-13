import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { PERMISSIONS, supportView } from '@/lib/admin/service';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';

export const metadata = { title: 'Player' };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff(PERMISSIONS.users);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const v = await supportView(getDb(), { id: s.user.id, role: s.user.role }, id);
  if (!v) notFound();
  const now = new Date();
  return (
    <>
      <h1>{v.email}</h1>
      <dl className="facts">
        <dt>First name</dt><dd>{v.firstName ?? '(deleted)'}</dd>
        <dt>Role</dt><dd>{v.role}</dd>
        <dt>Email confirmed</dt><dd>{v.emailVerified ? 'yes' : 'no'}</dd>
        <dt>Age check</dt><dd>{v.ageChecked} (18+)</dd>
        <dt>Two-factor</dt><dd>{v.twoFactor ? 'on' : 'off'}</dd>
        <dt>Break</dt><dd>{v.breakUntil && v.breakUntil > now ? `until ${formatUk(v.breakUntil)}` : 'none'}</dd>
        <dt>Self-exclusion</dt><dd>{v.selfExcludedUntil && v.selfExcludedUntil > now ? `until ${formatUk(v.selfExcludedUntil)}` : 'none'}</dd>
        <dt>Joined</dt><dd>{formatUk(v.createdAt)}</dd>
        <dt>Deleted</dt><dd>{v.deleted ? 'yes' : 'no'}</dd>
      </dl>
      <p className="muted">Support can see what is needed to help. Breaks and self-exclusions cannot be lifted from here.</p>
      <h2>Orders</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Order</th><th scope="col">Date</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead>
          <tbody>{v.orders.map((o) => <tr key={o.id}><td className="mono">{o.id}</td><td>{formatUk(o.createdAt)}</td><td className="num">{formatPence(o.totalPence)}</td><td>{o.status}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
