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
 * Test payment provider for local development. Sends the player to a page on this site where they choose how to "pay"
 * (debit, credit, prepaid or unknown funding, or a failure). That page builds a webhook signed with HMAC-SHA256 and
 * runs it through the same webhook path as a real provider, so the authorise, check, capture or cancel flow and the
 * DCMS credit card rule are exercised locally. Refused in production (see src/lib/env.ts).
 */
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { safeEqual } from '../crypto';
import type { CaptureResult, CreateCheckoutInput, CreateCheckoutResult, FundingType, PaymentEvent, PaymentProvider, PaymentStatus, RefundResult } from './types';
import { WebhookSignatureError } from './types';

const bodySchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(['payment_authorised', 'payment_failed']),
  orderId: z.uuid(),
  amountPence: z.number().int().min(0),
  funding: z.enum(['credit', 'debit', 'prepaid', 'unknown']),
  timestamp: z.number().int(),
});

export class TestProvider implements PaymentProvider {
  readonly name = 'test';
  /** Calls made, for tests and the local test page. */
  readonly captures: { paymentRef: string; amountPence: number; key: string }[] = [];
  readonly cancels: { paymentRef: string; key: string }[] = [];
  /** Set to make the next capture fail (for tests). */
  failNextCapture: 'temporary' | 'final' | null = null;

  constructor(
    private readonly secret: string,
    private readonly appUrl: string,
  ) {}

  sign(rawBody: string): string {
    return createHmac('sha256', this.secret).update(`test-webhook:${rawBody}`).digest('hex');
  }

  /** Build a signed webhook body, as the test checkout page does. */
  makeEvent(orderId: string, amountPence: number, opts: { type?: 'payment_authorised' | 'payment_failed'; funding?: FundingType; now?: Date; id?: string } = {}) {
    const type = opts.type ?? 'payment_authorised';
    const funding = opts.funding ?? 'debit';
    const body = JSON.stringify({
      id: opts.id ?? `test_evt_${orderId}_${type}_${funding}`,
      type,
      orderId,
      amountPence,
      funding,
      timestamp: Math.floor((opts.now ?? new Date()).getTime() / 1000),
    });
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
    return {
      kind: 'payment_authorised',
      eventId: b.id,
      orderId: b.orderId,
      providerRef: `test_${b.orderId}`,
      paymentRef: `test_pay_${b.orderId}`,
      amountPence: b.amountPence,
      funding: b.funding,
      brand: 'testcard',
    };
  }

  async capture(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<CaptureResult> {
    if (this.failNextCapture) {
      const kind = this.failNextCapture;
      this.failNextCapture = null;
      if (kind === 'temporary') throw new Error('test provider: temporary capture failure');
      return { status: 'failed' };
    }
    if (!this.captures.some((c) => c.key === idempotencyKey)) this.captures.push({ paymentRef, amountPence, key: idempotencyKey });
    return { status: 'succeeded' };
  }

  async cancel(paymentRef: string, idempotencyKey: string): Promise<void> {
    if (!this.cancels.some((c) => c.key === idempotencyKey)) this.cancels.push({ paymentRef, key: idempotencyKey });
  }

  async refund(_paymentRef: string, _amountPence: number, idempotencyKey: string): Promise<RefundResult> {
    return { refundRef: `test_refund_${idempotencyKey}`, status: 'succeeded' };
  }

  async getStatus(): Promise<PaymentStatus> {
    return 'unknown';
  }
}
