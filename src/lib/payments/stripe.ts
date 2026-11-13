/**
 * Stripe adapter: Checkout Sessions and signed webhooks. Works in test mode with sk_test_ keys.
 * Stripe often declines prize-competition merchants: read docs/payments.md before relying on it.
 */
import Stripe from 'stripe';
import type { CreateCheckoutInput, CreateCheckoutResult, PaymentEvent, PaymentProvider, PaymentStatus, RefundResult } from './types';
import { WebhookSignatureError } from './types';

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
    stripeClient?: Stripe,
  ) {
    this.stripe = stripeClient ?? new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000 });
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: input.orderId,
        customer_email: input.customerEmail,
        metadata: { order_id: input.orderId },
        payment_intent_data: { metadata: { order_id: input.orderId } },
        line_items: input.lines.map((l) => ({
          quantity: l.quantity,
          price_data: { currency: input.currency, unit_amount: l.unitPence, product_data: { name: l.name } },
        })),
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        expires_at: Math.floor(input.expiresAt.getTime() / 1000),
      },
      { idempotencyKey: `checkout-${input.orderId}` },
    );
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { redirectUrl: session.url, providerRef: session.id };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
    const signature = headers.get('stripe-signature');
    if (!signature) throw new WebhookSignatureError('missing Stripe-Signature header');
    let event: Stripe.Event;
    try {
      // Rejects a wrong signature and anything older than five minutes (Stripe's default tolerance).
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (e) {
      throw new WebhookSignatureError((e as Error).message);
    }
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const s = event.data.object;
      const orderId = s.client_reference_id ?? s.metadata?.order_id;
      if (!orderId) return { kind: 'ignored', eventId: event.id, type: event.type };
      if (s.payment_status !== 'paid') return { kind: 'ignored', eventId: event.id, type: `${event.type}:${s.payment_status}` };
      const paymentRef = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? '');
      return { kind: 'payment_succeeded', eventId: event.id, orderId, providerRef: s.id, paymentRef, amountPence: s.amount_total ?? 0 };
    }
    if (event.type === 'checkout.session.async_payment_failed') {
      const s = event.data.object;
      const orderId = s.client_reference_id ?? s.metadata?.order_id;
      if (!orderId) return { kind: 'ignored', eventId: event.id, type: event.type };
      return { kind: 'payment_failed', eventId: event.id, orderId, providerRef: s.id };
    }
    if (event.type === 'checkout.session.expired') {
      const s = event.data.object;
      const orderId = s.client_reference_id ?? s.metadata?.order_id;
      if (!orderId) return { kind: 'ignored', eventId: event.id, type: event.type };
      return { kind: 'checkout_expired', eventId: event.id, orderId, providerRef: s.id };
    }
    return { kind: 'ignored', eventId: event.id, type: event.type };
  }

  async refund(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<RefundResult> {
    const r = await this.stripe.refunds.create({ payment_intent: paymentRef, amount: amountPence }, { idempotencyKey: `refund-${idempotencyKey}` });
    const status = r.status === 'succeeded' ? 'succeeded' : r.status === 'failed' || r.status === 'canceled' ? 'failed' : 'pending';
    return { refundRef: r.id, status };
  }

  async getStatus(providerRef: string): Promise<PaymentStatus> {
    const s = await this.stripe.checkout.sessions.retrieve(providerRef);
    if (s.payment_status === 'paid') return 'paid';
    if (s.status === 'expired') return 'expired';
    if (s.status === 'open') return 'pending';
    return 'unknown';
  }
}
