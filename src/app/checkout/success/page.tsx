import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';

export const metadata = { title: 'Thank you' };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireUser();
  const id = (await searchParams).order;
  const [o] = typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id) ? await getDb().select().from(orders).where(eq(orders.id, id)) : [];
  const mine = o && o.userId === s.user.id ? o : null;
  return (
    <>
      <h1>Thank you</h1>
      {mine?.status === 'paid' ? (
        <p>Your payment is confirmed and your tickets are entered. You can see them, with their entry codes, in <Link href="/account">your account</Link>.</p>
      ) : (
        <p>
          We are waiting for the payment provider to confirm your payment. This usually takes a few seconds. Your tickets appear in{' '}
          <Link href="/account">your account</Link> once it is confirmed. If the payment does not go through, the reserved numbers are released.
        </p>
      )}
    </>
  );
}
