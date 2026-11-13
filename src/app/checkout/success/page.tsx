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
import { requireUser } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { declineMessage } from '@/lib/checkout/service';
import { creditCardCapPence } from '@/lib/site-config';
import { creditUsedThisMonth } from '@/lib/checkout/credit-card-rule';

export const metadata = { title: 'Thank you' };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireUser();
  const id = (await searchParams).order;
  const [o] = typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id) ? await getDb().select().from(orders).where(eq(orders.id, id)) : [];
  const mine = o && o.userId === s.user.id ? o : null;
  if (mine && mine.decision && mine.decision !== 'capture') {
    const used = await creditUsedThisMonth(getDb(), s.user.id);
    return (
      <>
        <h1>Payment not taken</h1>
        <p className="notice warn">{declineMessage(mine.decision, creditCardCapPence(), used)}</p>
        <p><Link href="/basket">Back to your basket</Link></p>
      </>
    );
  }
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
