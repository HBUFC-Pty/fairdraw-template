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
    <div className="checkout-page">
      <h1>Test payment</h1>
      <div className="checkout-panel">
        <p className="notice warn">This is the test payment provider for local development. No money moves.</p>
        <div className="checkout-total">
          <p className="micro-label">Order total</p>
          <p className="checkout-amount num">{formatPence(o.totalPence)}</p>
          <p className="checkout-status">Status: <span className="chip chip-glass">{o.status}</span></p>
        </div>
        {o.status === 'pending' ? (
          <>
            <p className="micro-hint">Choose the kind of card to simulate. Credit and unknown cards are subject to the DCMS credit card rule.</p>
            <div className="pay-options">
              {(['debit', 'credit', 'prepaid', 'unknown'] as const).map((f) => (
                <form action={testPayAction} key={f}>
                  <input type="hidden" name="orderId" value={o.id} />
                  <input type="hidden" name="outcome" value={f} />
                  <button type="submit" className={f === 'debit' ? 'lg' : 'secondary'}>Pay with a {f === 'unknown' ? 'card of unknown type' : `${f} card`} (test)</button>
                </form>
              ))}
            </div>
            <form action={testPayAction} className="pay-fail">
              <input type="hidden" name="orderId" value={o.id} />
              <input type="hidden" name="outcome" value="fail" />
              <button type="submit" className="secondary sm">Simulate a failed payment</button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
