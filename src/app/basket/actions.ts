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
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { assertSameOrigin, field } from '@/lib/web/request';
import { flashUrl } from '@/lib/web/flash';
import { requireUser } from '@/lib/web/session';
import { abandonOrder, addToBasket, CheckoutError, placeOrder, recordCheckoutRef, removeFromBasket } from '@/lib/checkout/service';
import { getPaymentProvider } from '@/lib/payments';
import { hit, RATE_RULES } from '@/lib/rate-limit';
import { TestProvider } from '@/lib/payments/test-provider';
import { handleWebhook } from '@/lib/payments/webhook';

const addSchema = z.object({
  competitionId: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]{1,80}$/),
  quantity: z.coerce.number().int().min(1).max(100_000),
  numbers: z.string().max(5000).regex(/^[0-9,\s]*$/, 'Numbers can only contain digits and commas.'),
  answer: z.union([z.literal(''), z.coerce.number().int().min(0).max(10)]),
});

export async function addToBasketAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireUser();
  const parsed = addSchema.safeParse({ competitionId: field(fd, 'competitionId'), slug: field(fd, 'slug'), quantity: field(fd, 'quantity'), numbers: field(fd, 'numbers'), answer: field(fd, 'answer') });
  if (!parsed.success) redirect(flashUrl(`/competitions/${encodeURIComponent(field(fd, 'slug').slice(0, 80))}`, { error: parsed.error.issues[0]?.message ?? 'Please check the form.' }));
  const { competitionId, slug, quantity, numbers, answer } = parsed.data;
  const chosen = numbers.split(/[\s,]+/).filter(Boolean).map(Number);
  try {
    await addToBasket(getDb(), s.user.id, { competitionId, quantity, chosenNumbers: chosen.length ? chosen : null, answerIndex: answer === '' ? null : answer });
  } catch (e) {
    if (e instanceof CheckoutError) redirect(flashUrl(`/competitions/${slug}`, { error: e.message }));
    throw e;
  }
  redirect(flashUrl('/basket', { notice: 'Added to your basket.' }));
}

export async function removeFromBasketAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireUser();
  const id = z.uuid().safeParse(field(fd, 'competitionId'));
  if (id.success) await removeFromBasket(getDb(), s.user.id, id.data);
  redirect('/basket');
}

export async function checkoutAction() {
  await assertSameOrigin();
  const s = await requireUser();
  const db = getDb();
  if (!(await hit(db, `checkout:${s.user.id}`, RATE_RULES.checkout))) redirect(flashUrl('/basket', { error: 'Too many checkout attempts. Wait a few minutes.' }));
  const provider = getPaymentProvider();
  let order;
  try {
    order = await placeOrder(db, s.user.id, { provider: provider.name, reservationMinutes: env().RESERVATION_MINUTES });
  } catch (e) {
    if (e instanceof CheckoutError) redirect(flashUrl('/basket', { error: e.message }));
    throw e;
  }
  let url: string;
  try {
    const base = env().APP_URL;
    const r = await provider.createCheckout({
      orderId: order.orderId,
      totalPence: order.totalPence,
      currency: 'gbp',
      lines: order.lines,
      customerEmail: order.email,
      successUrl: `${base}/checkout/success?order=${order.orderId}`,
      cancelUrl: `${base}/checkout/cancelled?order=${order.orderId}`,
      expiresAt: order.expiresAt,
    });
    await recordCheckoutRef(db, order.orderId, r.providerRef);
    url = r.redirectUrl;
  } catch (e) {
    console.error('checkout creation failed', e);
    await abandonOrder(db, order.orderId);
    redirect(flashUrl('/basket', { error: 'We could not start the payment. Nothing has been charged. Please try again.' }));
  }
  redirect(url);
}

/** Local development only: simulate the payment provider's signed webhook for the test provider. */
export async function testPayAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireUser();
  const provider = getPaymentProvider();
  if (!(provider instanceof TestProvider)) redirect('/basket');
  const id = z.uuid().safeParse(field(fd, 'orderId'));
  if (!id.success) redirect('/basket');
  const [o] = await getDb().select().from(orders).where(eq(orders.id, id.data));
  if (!o || o.userId !== s.user.id) redirect('/basket');
  const outcome = field(fd, 'outcome') === 'fail' ? 'payment_failed' : 'payment_succeeded';
  const { body, signature } = provider.makeEvent(o.id, o.totalPence, outcome);
  await handleWebhook(getDb(), provider, body, new Headers({ 'x-test-signature': signature }));
  redirect(outcome === 'payment_failed' ? `/checkout/cancelled?order=${o.id}` : `/checkout/success?order=${o.id}`);
}
