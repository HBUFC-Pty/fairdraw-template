/**
 * The payment provider interface. Checkout code talks only to this interface, so adding a UK acquirer that accepts
 * prize-competition merchants means writing one adapter. See docs/payments.md.
 */

export interface CheckoutLine {
  name: string;
  quantity: number;
  unitPence: number;
}

export interface CreateCheckoutInput {
  orderId: string;
  totalPence: number;
  currency: 'gbp';
  lines: CheckoutLine[];
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
}

export interface CreateCheckoutResult {
  /** Where to send the player to pay. */
  redirectUrl: string;
  /** The provider's id for this checkout (a Stripe Checkout Session id, for example). */
  providerRef: string;
}

/** A provider event, normalised. Only these kinds change order state; anything else is acknowledged and ignored. */
export type PaymentEvent =
  | { kind: 'payment_succeeded'; eventId: string; orderId: string; providerRef: string; paymentRef: string; amountPence: number }
  | { kind: 'payment_failed'; eventId: string; orderId: string; providerRef: string }
  | { kind: 'checkout_expired'; eventId: string; orderId: string; providerRef: string }
  | { kind: 'ignored'; eventId: string; type: string };

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'unknown';

export interface RefundResult {
  refundRef: string;
  status: 'succeeded' | 'pending' | 'failed';
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  /**
   * Check the signature on a webhook and turn it into a PaymentEvent. Must throw WebhookSignatureError when the
   * signature is missing, wrong or too old. `rawBody` is the exact bytes received, before any JSON parsing.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
  /** Refund part or all of a payment. `idempotencyKey` must make retries safe. */
  refund(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<RefundResult>;
  getStatus(providerRef: string): Promise<PaymentStatus>;
}

export class WebhookSignatureError extends Error {}
