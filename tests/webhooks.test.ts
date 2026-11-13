import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { StripeProvider } from '../src/lib/payments/stripe';
import { TestProvider } from '../src/lib/payments/test-provider';
import { WebhookSignatureError } from '../src/lib/payments/types';

const WHSEC = 'whsec_test_secret_for_unit_tests';
const stripe = new Stripe('sk_test_dummy');
// The webhook handler reads the PaymentIntent (and its charge's card funding) from Stripe: stub that call.
let fakePi: Record<string, unknown> = {};
Object.assign(stripe.paymentIntents, { retrieve: async () => fakePi });
const provider = new StripeProvider('sk_test_dummy', WHSEC, stripe);
const piWith = (funding: string | null, status = 'requires_capture') => ({
  id: 'pi_1',
  status,
  amount_capturable: status === 'requires_capture' ? 750 : 0,
  amount_received: status === 'succeeded' ? 750 : 0,
  latest_charge: { id: 'ch_1', payment_method_details: funding === null ? { type: 'paypal' } : { type: 'card', card: { funding, brand: 'visa', last4: '4242' } } },
});
const ORDER = '6f1d8c56-3a5c-4b8e-9a59-2a1f6f0d9b11';

function stripeEvent(type: string, object: Record<string, unknown>, id = 'evt_1') {
  return JSON.stringify({ id, object: 'event', type, api_version: '2025-01-01', created: Math.floor(Date.now() / 1000), data: { object } });
}

function signed(body: string, opts: { secret?: string; timestamp?: number } = {}) {
  const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret: opts.secret ?? WHSEC, timestamp: opts.timestamp });
  return new Headers({ 'stripe-signature': header });
}

// With manual capture a completed session is "unpaid" until the site captures it.
const session = { id: 'cs_test_1', object: 'checkout.session', client_reference_id: ORDER, metadata: { order_id: ORDER }, payment_status: 'unpaid', payment_intent: 'pi_1', amount_total: 750 };

describe('Stripe webhook signatures', () => {
  it('accepts a correctly signed checkout.session.completed', async () => {
    fakePi = piWith('debit');
    const body = stripeEvent('checkout.session.completed', session);
    const ev = await provider.verifyWebhook(body, signed(body));
    expect(ev).toEqual({ kind: 'payment_authorised', eventId: 'evt_1', orderId: ORDER, providerRef: 'cs_test_1', paymentRef: 'pi_1', amountPence: 750, funding: 'debit', brand: 'visa' });
  });

  it('reads the funding type, and reports anything unrecognised or missing as unknown (treated as credit)', async () => {
    const body = stripeEvent('checkout.session.completed', session);
    for (const [funding, expected] of [['credit', 'credit'], ['prepaid', 'prepaid'], ['unknown', 'unknown'], ['charge_card', 'unknown'], [null, 'unknown']] as const) {
      fakePi = piWith(funding);
      const ev = await provider.verifyWebhook(body, signed(body));
      expect(ev.kind === 'payment_authorised' && ev.funding).toBe(expected);
    }
  });

  it('rejects a missing, wrong or stale signature, and a tampered body', async () => {
    const body = stripeEvent('checkout.session.completed', session);
    await expect(provider.verifyWebhook(body, new Headers())).rejects.toBeInstanceOf(WebhookSignatureError);
    await expect(provider.verifyWebhook(body, signed(body, { secret: 'whsec_wrong' }))).rejects.toBeInstanceOf(WebhookSignatureError);
    await expect(provider.verifyWebhook(body, signed(body, { timestamp: Math.floor(Date.now() / 1000) - 3600 }))).rejects.toBeInstanceOf(WebhookSignatureError);
    const tampered = body.replace('750', '1');
    await expect(provider.verifyWebhook(tampered, signed(body))).rejects.toBeInstanceOf(WebhookSignatureError);
  });

  it('does not treat a session whose payment was not authorised as a payment', async () => {
    fakePi = piWith('debit', 'requires_payment_method');
    const body = stripeEvent('checkout.session.completed', session);
    expect((await provider.verifyWebhook(body, signed(body))).kind).toBe('ignored');
  });

  it('maps expiry and async failure, and ignores other events', async () => {
    const exp = stripeEvent('checkout.session.expired', { ...session, payment_status: 'unpaid' }, 'evt_2');
    expect((await provider.verifyWebhook(exp, signed(exp))).kind).toBe('checkout_expired');
    const fail = stripeEvent('checkout.session.async_payment_failed', session, 'evt_3');
    expect((await provider.verifyWebhook(fail, signed(fail))).kind).toBe('payment_failed');
    const other = stripeEvent('customer.created', { id: 'cus_1', object: 'customer' }, 'evt_4');
    expect(await provider.verifyWebhook(other, signed(other))).toEqual({ kind: 'ignored', eventId: 'evt_4', type: 'customer.created' });
  });
});

describe('test provider webhook signatures', () => {
  const p = new TestProvider('x'.repeat(40), 'http://localhost:3000');
  it('accepts its own signature and rejects others', async () => {
    const { body, signature } = p.makeEvent(ORDER, 500, { funding: 'credit' });
    const ev = await p.verifyWebhook(body, new Headers({ 'x-test-signature': signature }));
    expect(ev.kind === 'payment_authorised' && ev.funding).toBe('credit');
    await expect(p.verifyWebhook(body, new Headers({ 'x-test-signature': 'nope' }))).rejects.toBeInstanceOf(WebhookSignatureError);
    await expect(p.verifyWebhook(body.replace('500', '5'), new Headers({ 'x-test-signature': signature }))).rejects.toBeInstanceOf(WebhookSignatureError);
    const other = new TestProvider('y'.repeat(40), 'http://localhost:3000');
    await expect(other.verifyWebhook(body, new Headers({ 'x-test-signature': signature }))).rejects.toBeInstanceOf(WebhookSignatureError);
  });
  it('rejects a stale event', async () => {
    const { body, signature } = p.makeEvent(ORDER, 500, { now: new Date(Date.now() - 3600_000) });
    await expect(p.verifyWebhook(body, new Headers({ 'x-test-signature': signature }))).rejects.toBeInstanceOf(WebhookSignatureError);
  });
});
