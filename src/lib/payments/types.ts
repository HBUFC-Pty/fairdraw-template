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
 * The payment provider interface. Checkout code talks only to this interface, so adding a UK acquirer that accepts
 * prize-competition merchants means writing one adapter. See docs/payments.md.
 *
 * Every payment is authorised first and captured (or released) afterwards. Between the two, the site checks the card's
 * funding type: DCMS Voluntary Code clause 1.3 caps credit card payments at £250 per player per month and bans them for
 * instant win prize draws (src/lib/checkout/credit-card-rule.ts). An adapter that cannot report the funding type must
 * report "unknown", which is treated as credit; an operator using such an adapter in effect accepts debit cards only
 * above the cap.
 */

/** As card networks report it. "unknown" is treated as credit. */
export type FundingType = 'credit' | 'debit' | 'prepaid' | 'unknown';

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
  | {
      /** The amount is held on the player's card but not yet taken. The site now captures or cancels it. */
      kind: 'payment_authorised';
      eventId: string;
      orderId: string;
      providerRef: string;
      paymentRef: string;
      amountPence: number;
      funding: FundingType;
      /** Card brand, if the provider gives it (for example "visa"). Never a card number. */
      brand: string | null;
    }
  | { kind: 'payment_failed'; eventId: string; orderId: string; providerRef: string }
  | { kind: 'checkout_expired'; eventId: string; orderId: string; providerRef: string }
  | { kind: 'ignored'; eventId: string; type: string };

export type PaymentStatus = 'pending' | 'authorised' | 'paid' | 'failed' | 'expired' | 'unknown';

export interface RefundResult {
  refundRef: string;
  status: 'succeeded' | 'pending' | 'failed';
}

export interface CaptureResult {
  /** "failed" means the authorisation can no longer be captured (for example it expired); do not retry. */
  status: 'succeeded' | 'failed';
}

export interface PaymentProvider {
  readonly name: string;
  /** Start a checkout that only AUTHORISES the payment (manual capture). Never capture automatically. */
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  /**
   * Check the signature on a webhook and turn it into a PaymentEvent, including the card's funding type. Must throw
   * WebhookSignatureError when the signature is missing, wrong or too old. `rawBody` is the exact bytes received.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
  /** Take up to the authorised amount. `idempotencyKey` must make retries safe. Throw on a temporary failure. */
  capture(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<CaptureResult>;
  /** Release an authorisation without taking any money. Must be safe to call twice. */
  cancel(paymentRef: string, idempotencyKey: string): Promise<void>;
  /** Refund part or all of a captured payment. `idempotencyKey` must make retries safe. */
  refund(paymentRef: string, amountPence: number, idempotencyKey: string): Promise<RefundResult>;
  getStatus(providerRef: string): Promise<PaymentStatus>;
}

export class WebhookSignatureError extends Error {}
