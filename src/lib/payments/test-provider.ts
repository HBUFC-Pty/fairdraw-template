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
