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
/**
 * Test payment provider for local development. Sends the player to a page on this site with a "pay" button, which
 * posts a webhook signed with HMAC-SHA256 to /api/webhooks/test, so the same webhook path as a real provider is
 * exercised. Refused in production (see src/lib/env.ts).
 */
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { safeEqual } from '../crypto';
import type { CreateCheckoutInput, CreateCheckoutResult, PaymentEvent, PaymentProvider, PaymentStatus, RefundResult } from './types';
import { WebhookSignatureError } from './types';

const bodySchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(['payment_succeeded', 'payment_failed']),
  orderId: z.uuid(),
  amountPence: z.number().int().min(0),
  timestamp: z.number().int(),
});

export class TestProvider implements PaymentProvider {
  readonly name = 'test';
  constructor(
    private readonly secret: string,
    private readonly appUrl: string,
  ) {}

  sign(rawBody: string): string {
    return createHmac('sha256', this.secret).update(`test-webhook:${rawBody}`).digest('hex');
  }

  /** Build a signed webhook body, as the test checkout page does. */
  makeEvent(orderId: string, amountPence: number, type: 'payment_succeeded' | 'payment_failed' = 'payment_succeeded', now = new Date()) {
    const body = JSON.stringify({ id: `test_evt_${orderId}_${type}`, type, orderId, amountPence, timestamp: Math.floor(now.getTime() / 1000) });
    return { body, signature: this.sign(body) };
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    return { redirectUrl: `${this.appUrl}/checkout/test/${input.orderId}`, providerRef: `test_${input.orderId}` };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
    const sig = headers.get('x-test-signature');
    if (!sig || !safeEqual(sig, this.sign(rawBody))) throw new WebhookSignatureError('bad test signature');
    const b = bodySchema.parse(JSON.parse(rawBody));
    if (Math.abs(Date.now() / 1000 - b.timestamp) > 300) throw new WebhookSignatureError('test webhook too old');
    if (b.type === 'payment_failed') return { kind: 'payment_failed', eventId: b.id, orderId: b.orderId, providerRef: `test_${b.orderId}` };
    return { kind: 'payment_succeeded', eventId: b.id, orderId: b.orderId, providerRef: `test_${b.orderId}`, paymentRef: `test_pay_${b.orderId}`, amountPence: b.amountPence };
  }

  async refund(paymentRef: string, _amountPence: number, idempotencyKey: string): Promise<RefundResult> {
    return { refundRef: `test_refund_${idempotencyKey}`, status: 'succeeded' };
  }

  async getStatus(): Promise<PaymentStatus> {
    return 'unknown';
  }
}
