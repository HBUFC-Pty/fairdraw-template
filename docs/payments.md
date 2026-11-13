# Payments

Checkout talks to one interface, `PaymentProvider` (`src/lib/payments/types.ts`). The template ships two adapters:
**Stripe** (Checkout Sessions with signed webhooks, works in test mode) and a **test** adapter for local development.
Stubs for specialist UK acquirers are in `src/lib/payments/acquirers/`.

## Read this first: Stripe and prize competitions

Stripe frequently refuses prize-competition and raffle merchants, and sometimes closes accounts after they start
trading, which can freeze your funds. Do not rely on Stripe (or any processor) for a live site until you have
**written confirmation** from them that your business model, as described in your terms, is acceptable. Many UK
operators use specialist acquirers instead. Whichever you use, name it in your privacy notice
(`PAYMENT_PROCESSOR_NAME`): FairDraw's rubric checks this.

## The interface

```ts
interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CreateCheckoutInput): Promise<{ redirectUrl: string; providerRef: string }>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>; // throws WebhookSignatureError
  refund(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<RefundResult>;
  getStatus(providerRef: string): Promise<'pending' | 'paid' | 'failed' | 'expired' | 'unknown'>;
}
```

`verifyWebhook` turns the provider's notification into a normalised `PaymentEvent`:

- `payment_succeeded` with `orderId`, `providerRef`, `paymentRef` and the `amountPence` actually captured
- `payment_failed`, `checkout_expired`
- `ignored` for anything else (acknowledged, no effect)

`applyPaymentEvent` (`src/lib/checkout/service.ts`) then, in one transaction:

- records the event id in `webhook_events`, so a repeated delivery is processed once;
- refuses to activate tickets if the amount differs from the order total (the payment is refunded);
- activates reserved tickets, or refunds tickets whose reservation lapsed or whose competition has closed.

Refunds are queued in the `refunds` table and sent by the worker; each refund's id is the idempotency key.

## Stripe in test mode

1. Create a Stripe account and stay in test mode. Copy the `sk_test_...` key.
2. In `.env`: `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY=sk_test_...`, `PAYMENT_PROCESSOR_NAME=Stripe`.
3. Forward webhooks locally with the Stripe CLI:
   `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   and put the `whsec_...` secret it prints in `STRIPE_WEBHOOK_SECRET`.
4. In production, add a webhook endpoint at `https://your-domain/api/webhooks/stripe` with these events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`.
5. Pay with Stripe's test card numbers, then check the order and tickets in your account.

## The test provider

`PAYMENT_PROVIDER=test` sends the player to a page on your own site with a "pay" button, which posts a webhook signed
with HMAC-SHA256 (keyed from `APP_SECRET`) to `/api/webhooks/test`, so the real webhook path is exercised. It is
**refused in production**: the app will not start with `NODE_ENV=production` and `PAYMENT_PROVIDER=test` unless
`TEST_PAYMENTS_ALLOWED_IN_PRODUCTION=true`, which you should only ever set on a private staging server.

## Specialist UK acquirers

Acquirers often used by UK prize-competition operators include Cashflows, DNA Payments, Acquired and Trust Payments.
This template does **not** describe their APIs: nothing about them has been verified for it. The stubs in
`src/lib/payments/acquirers/` implement the interface and throw "not implemented".

To finish one:

1. Get a merchant account approved for prize competitions, in writing.
2. Get the acquirer's developer documentation and sandbox credentials.
3. Implement `createCheckout` with their hosted payment page (keeps card data off your servers and your PCI scope
   small), passing the order id so the notification can be matched.
4. Implement `verifyWebhook` exactly as they document authenticity checks. Map success to `payment_succeeded` with
   the captured amount.
5. Implement `refund` (partial refunds, idempotent) and `getStatus`.
6. Add the provider to the switch in `src/lib/payments/index.ts`, its settings to `src/lib/env.ts` and `.env.example`,
   and a webhook route (see `src/app/api/webhooks/`).
7. Write tests (below), then test end to end in their sandbox, including a refund, before taking real money.
8. Update the privacy notice with the processor's name.

## Adapter checklist

- [ ] Signature checked over the **raw** request body, before any JSON parsing
- [ ] Comparison in constant time (`crypto.timingSafeEqual`); old or replayed notifications refused if the scheme has
      a timestamp
- [ ] Throws `WebhookSignatureError` on any failure (the route answers 400 and changes nothing)
- [ ] Event ids are unique per event, so `webhook_events` makes processing idempotent
- [ ] `amountPence` is the amount captured, so mismatches are caught
- [ ] Refunds pass the idempotency key through, so a retry never refunds twice
- [ ] Secrets come from environment variables only
- [ ] Tests mirroring `tests/webhooks.test.ts`: valid signature accepted, wrong or missing signature rejected, tampered
      body rejected, duplicate event processed once, wrong amount not activated
