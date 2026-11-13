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
type FundingType = 'credit' | 'debit' | 'prepaid' | 'unknown';

interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CreateCheckoutInput): Promise<{ redirectUrl: string; providerRef: string }>; // authorise only
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>; // throws WebhookSignatureError
  capture(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<{ status: 'succeeded' | 'failed' }>;
  cancel(paymentRef: string, idempotencyKey: string): Promise<void>; // release the hold, take nothing
  refund(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<RefundResult>;
  getStatus(providerRef: string): Promise<'pending' | 'authorised' | 'paid' | 'failed' | 'expired' | 'unknown'>;
}
```

`verifyWebhook` turns the provider's notification into a normalised `PaymentEvent`:

- `payment_authorised` with `orderId`, `providerRef`, `paymentRef`, the `amountPence` held, the card's `funding` type
  and its `brand` (never a card number)
- `payment_failed`, `checkout_expired`
- `ignored` for anything else (acknowledged, no effect)

## Authorise, check, then capture: the DCMS credit card rule

Clause 1.3 of the DCMS Voluntary Code of Good Practice for Prize Draw Operators (Open Government Licence v3.0) says:

> 1.3 Operators should not accept credit card payments in excess of £250 per month per player (“credit card limit”). Operators should not accept any credit card payments whatsoever for any instant win prize draws. To ensure a smooth transition, operators who currently accept credit card payments should not accept credit card payments beyond this credit card limit, or accept credit card payments for any instant win prize draws, by the implementation date.  This includes any payments made to operators by credit card through a money service business.

A card's funding type is only known once the player has entered it, so every payment is **authorised first and
captured afterwards**:

1. Checkout only authorises the payment (a hold on the card).
2. The signed webhook reports the funding type. `applyPaymentEvent` (`src/lib/checkout/service.ts`), in one
   transaction that locks the player's account row (so two orders at once cannot both fit under the limit):
   - records the event id in `webhook_events`, so a repeated delivery is processed once, and only ever decides an order
     that is still pending;
   - works out which reserved tickets can still be entered (a late payment loses tickets that went to someone else or
     whose competition closed) and sets the capture amount to their price;
   - applies the rule in `src/lib/checkout/credit-card-rule.ts`: for `credit` or `unknown` funding, refuse if the order
     contains an instant win prize draw, or if the player's credit-funded payments this calendar month (UK time) plus
     this one would exceed the limit. `debit` and `prepaid` are not credit cards;
   - records the decision (`capturing` or `cancelling`), the funding type, brand and amounts.
3. `settleOrder` then captures (and enters the tickets) or cancels (releases the hold and the tickets). If the
   provider call fails, the worker retries every 15 seconds; the order id is the idempotency key.
4. A declined player sees and is emailed a plain explanation asking them to pay by debit card.

Interpretation, from the text: the clause says "per month" without saying calendar or rolling, so the template uses
the **calendar month in Europe/London**. "Per player" means per player account, across all their cards. A payment
counts when it is captured; a later refund does not give the allowance back, because the payment was accepted.
`unknown` funding counts as credit. The limit (`creditCardMonthlyCapPounds` in `config/site.json`) can be lowered but
not raised above £250, and the instant win ban (`instantWinCreditCardBan`) cannot be switched off. A database trigger
(`drizzle/0003_instant_win_guard.sql`) refuses to capture a credit or unknown payment that breaks either rule at the
£250 figure. Players see their remaining allowance in their account and the rule on the basket page; staff see
monthly totals per player under Admin, Credit card payments.

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
5. Pay with Stripe's test card numbers, then check the order and tickets in your account. Stripe's testing page lists
   cards by funding type (https://docs.stripe.com/testing), so you can try a debit card and a credit card over the
   limit.

How the Stripe adapter does it (checked against Stripe's documentation on 13 November 2026):

- Checkout Sessions are created with `payment_intent_data.capture_method = "manual"`, Stripe's documented way to
  separate authorisation and capture with Checkout
  (https://docs.stripe.com/payments/place-a-hold-on-a-payment-method), and `allowed_payment_method_types = ["card"]`
  so the funding type is always reported. (Stripe's current API, used by the pinned `stripe` package, replaces the older
  `payment_method_types` parameter with `allowed_payment_method_types`.)
- With manual capture a completed session is `payment_status: "unpaid"` and its PaymentIntent is `requires_capture`.
  On `checkout.session.completed` the adapter retrieves the PaymentIntent with its latest charge and reads
  `payment_method_details.card.funding`, which Stripe documents as `credit`, `debit`, `prepaid` or `unknown`
  (https://docs.stripe.com/api/cards/object), and the card brand.
- Capture uses `amount_to_capture` (a partial capture releases the rest automatically); cancel cancels the
  PaymentIntent. Stripe says an online card authorisation is usually valid for 7 days, and for some Visa transactions
  4 days and 18 hours. The site captures within seconds of the webhook and the worker retries within minutes, well
  inside that window; if an authorisation has expired, the capture reports failure and the tickets are released.

## The test provider

`PAYMENT_PROVIDER=test` sends the player to a page on your own site where they choose to pay with a debit, credit,
prepaid or unknown card (or fail). That builds a webhook signed with HMAC-SHA256 (keyed from `APP_SECRET`) and runs it
through the real webhook path, so the authorise, check, capture or release flow and the credit card rule can be tried
locally. It is
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
   small), **authorising only** (no automatic capture), passing the order id so the notification can be matched.
4. Implement `verifyWebhook` exactly as they document authenticity checks. Map a successful authorisation to
   `payment_authorised` with the amount held and the card's **funding type**. If the acquirer cannot tell you the
   funding type, report `unknown`: it counts as credit, so in effect you accept debit cards only once a player reaches
   the credit card limit (and never for instant wins). Never report `debit` by guesswork.
5. Implement `capture`, `cancel` (both idempotent), `refund` (partial refunds, idempotent) and `getStatus`.
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
- [ ] Checkout only authorises; `capture` and `cancel` are idempotent and `capture` never takes more than was held
- [ ] `funding` comes from the acquirer's own data, or is `unknown`
- [ ] `amountPence` is the amount authorised, so mismatches are caught (the hold is released, nothing is taken)
- [ ] Refunds pass the idempotency key through, so a retry never refunds twice
- [ ] Secrets come from environment variables only
- [ ] Tests mirroring `tests/webhooks.test.ts`: valid signature accepted, wrong or missing signature rejected, tampered
      body rejected, duplicate event processed once, wrong amount not activated, funding mapped (see also
      `tests/credit-card-rule.test.ts`)
