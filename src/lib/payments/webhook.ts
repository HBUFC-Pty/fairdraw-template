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
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { orders, users } from '../db/schema';
import { declineMessage, processPaymentEvent } from '../checkout/service';
import { trySendMail } from '../mail';
import type { PaymentProvider } from './types';
import { WebhookSignatureError } from './types';

/** Verify and apply one webhook, then capture or release the payment. Returns the HTTP status to answer with. */
export async function handleWebhook(db: Db, provider: PaymentProvider, rawBody: string, headers: Headers): Promise<{ status: number; body: string }> {
  if (rawBody.length > 1_000_000) return { status: 413, body: 'too large' };
  let event;
  try {
    event = await provider.verifyWebhook(rawBody, headers);
  } catch (e) {
    if (e instanceof WebhookSignatureError) return { status: 400, body: 'invalid signature' };
    return { status: 400, body: 'invalid event' };
  }
  const { outcome, settled } = await processPaymentEvent(db, provider, event);
  if (outcome.kind === 'decided' && outcome.decision !== 'capture') {
    const text = declineMessage(outcome.decision, outcome.creditCapPence, outcome.creditUsedPence);
    const [o] = await db.select({ email: users.email }).from(orders).innerJoin(users, eq(users.id, orders.userId)).where(eq(orders.id, outcome.orderId));
    if (text && o) await trySendMail({ to: o.email, subject: 'Your payment was not taken', text });
  }
  return { status: 200, body: outcome.kind === 'decided' ? `${outcome.decision}:${settled}` : outcome.kind };
}
