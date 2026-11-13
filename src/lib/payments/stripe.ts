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
 * Stripe adapter: Checkout Sessions with manual capture, and signed webhooks. Works in test mode with sk_test_ keys.
 * Stripe often declines prize-competition merchants: read docs/payments.md before relying on it.
 *
 * Why manual capture: a card's funding type (credit, debit, prepaid) is only known once the player has entered it.
 * Checkout authorises the payment (payment_intent_data.capture_method = "manual", see
 * https://docs.stripe.com/payments/place-a-hold-on-a-payment-method); the webhook reads the funding type from the
 * PaymentIntent's charge; the site then captures it or cancels it under the DCMS credit card rule. An online card
 * authorisation normally lasts 7 days (4 days 18 hours for some Visa transactions); the site settles within seconds and
 * the worker retries within minutes.
 */
import Stripe from 'stripe';
import type { CaptureResult, CreateCheckoutInput, CreateCheckoutResult, FundingType, PaymentEvent, PaymentProvider, PaymentStatus, RefundResult } from './types';
import { WebhookSignatureError } from './types';

const FUNDING: readonly FundingType[] = ['credit', 'debit', 'prepaid', 'unknown'];

export function toFunding(value: string | null | undefined): FundingType {
  return FUNDING.includes(value as FundingType) ? (value as FundingType) : 'unknown';
}

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
        // Cards only (including wallets such as Apple Pay), so the funding type is known. Other methods, such as buy now
        // pay later, are credit in substance.
        allowed_payment_method_types: ['card'],
        client_reference_id: input.orderId,
        customer_email: input.customerEmail,
        metadata: { order_id: input.orderId },
        payment_intent_data: { capture_method: 'manual', metadata: { order_id: input.orderId } },
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
      const piId = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
      if (!orderId || !piId) return { kind: 'ignored', eventId: event.id, type: event.type };
      // With manual capture a completed session is "unpaid" and its PaymentIntent is "requires_capture".
      const pi = await this.stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
      if (pi.status !== 'requires_capture' && pi.status !== 'succeeded') return { kind: 'ignored', eventId: event.id, type: `${event.type}:${pi.status}` };
      const charge = typeof pi.latest_charge === 'object' && pi.latest_charge ? pi.latest_charge : null;
      const card = charge?.payment_method_details?.card;
      return {
        kind: 'payment_authorised',
        eventId: event.id,
        orderId,
        providerRef: s.id,
        paymentRef: pi.id,
        amountPence: pi.status === 'requires_capture' ? pi.amount_capturable : pi.amount_received,
        funding: toFunding(card?.funding),
        brand: card?.brand ?? null,
      };
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

  async capture(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<CaptureResult> {
    const pi = await this.stripe.paymentIntents.retrieve(paymentRef);
    if (pi.status === 'succeeded') return { status: 'succeeded' };
    if (pi.status !== 'requires_capture') return { status: 'failed' };
    // A partial capture releases the rest of the hold automatically.
    const done = await this.stripe.paymentIntents.capture(paymentRef, { amount_to_capture: amountPence }, { idempotencyKey: `capture-${idempotencyKey}` });
    return { status: done.status === 'succeeded' ? 'succeeded' : 'failed' };
  }

  async cancel(paymentRef: string, idempotencyKey: string): Promise<void> {
    const pi = await this.stripe.paymentIntents.retrieve(paymentRef);
    if (pi.status === 'canceled') return;
    if (pi.status === 'succeeded') {
      // Captured by mistake (for example a session created outside this site): give the money back in full.
      await this.stripe.refunds.create({ payment_intent: paymentRef }, { idempotencyKey: `cancel-refund-${idempotencyKey}` });
      return;
    }
    await this.stripe.paymentIntents.cancel(paymentRef, {}, { idempotencyKey: `cancel-${idempotencyKey}` });
  }

  async refund(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<RefundResult> {
    const r = await this.stripe.refunds.create({ payment_intent: paymentRef, amount: amountPence }, { idempotencyKey: `refund-${idempotencyKey}` });
    const status = r.status === 'succeeded' ? 'succeeded' : r.status === 'failed' || r.status === 'canceled' ? 'failed' : 'pending';
    return { refundRef: r.id, status };
  }

  async getStatus(providerRef: string): Promise<PaymentStatus> {
    const s = await this.stripe.checkout.sessions.retrieve(providerRef, { expand: ['payment_intent'] });
    const pi = typeof s.payment_intent === 'object' ? s.payment_intent : null;
    if (pi?.status === 'requires_capture') return 'authorised';
    if (pi?.status === 'succeeded') return 'paid';
    if (s.status === 'expired') return 'expired';
    if (s.status === 'open') return 'pending';
    return 'unknown';
  }
}
