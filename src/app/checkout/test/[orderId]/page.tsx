import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { getPaymentProvider } from '@/lib/payments';
import { TestProvider } from '@/lib/payments/test-provider';
import { formatPence } from '@/lib/money';
import { testPayAction } from '../../../basket/actions';

export const metadata = { title: 'Test payment' };

/** Local development only. The test provider is refused in production (src/lib/env.ts). */
export default async function TestPayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const s = await requireUser();
  if (!(getPaymentProvider() instanceof TestProvider)) notFound();
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(orderId)) notFound();
  const [o] = await getDb().select().from(orders).where(eq(orders.id, orderId));
  if (!o || o.userId !== s.user.id) notFound();
  return (
    <>
      <h1>Test payment</h1>
      <p className="notice warn">This is the test payment provider for local development. No money moves.</p>
      <p>Order total: <strong>{formatPence(o.totalPence)}</strong>. Status: {o.status}.</p>
      {o.status === 'pending' ? (
        <>
          <form action={testPayAction}>
            <input type="hidden" name="orderId" value={o.id} />
            <button type="submit">Pay (test)</button>
          </form>
          <form action={testPayAction}>
            <input type="hidden" name="orderId" value={o.id} />
            <input type="hidden" name="outcome" value="fail" />
            <button type="submit" className="secondary">Simulate a failed payment</button>
          </form>
        </>
      ) : null}
    </>
  );
}
