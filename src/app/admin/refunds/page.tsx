import { desc } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { refunds } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { FlashMessage } from '@/components/Flash';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import { refundAction } from '../actions';

export const metadata = { title: 'Refunds' };

export default async function RefundsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff(PERMISSIONS.refunds);
  const rows = await getDb().select().from(refunds).orderBy(desc(refunds.createdAt)).limit(200);
  return (
    <>
      <h1>Refunds</h1>
      <FlashMessage searchParams={await searchParams} />
      <form className="stack" action={refundAction}>
        <label>Order id<input name="orderId" required pattern="[0-9a-f-]{36}" /></label>
        <label>Amount (£)<input name="amount" required inputMode="decimal" /></label>
        <label>Reason<input name="reason" required minLength={3} maxLength={300} /></label>
        <label><input type="checkbox" name="release" value="yes" /> Also release the order&apos;s tickets from competitions that have not closed yet</label>
        <p className="muted">Tickets in competitions that have already closed stay in the frozen draw list; only the money is refunded.</p>
        <button type="submit">Issue refund</button>
      </form>
      <h2>Recent refunds</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Created</th><th scope="col">Order</th><th scope="col">Amount</th><th scope="col">Reason</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{formatUk(r.createdAt)}</td><td className="mono">{r.orderId}</td><td className="num">{formatPence(r.amountPence)}</td><td>{r.reason}</td><td>{r.status}{r.error ? `: ${r.error}` : ''}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
