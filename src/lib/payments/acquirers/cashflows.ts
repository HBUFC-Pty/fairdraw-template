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
 * Cashflows adapter: STUB. Fill in from Cashflows's own developer documentation and your merchant agreement.
 * This file deliberately contains no details of Cashflows's API: none have been verified for this template.
 * See docs/payments.md for what a finished adapter must do and how to test it.
 */
import type { CaptureResult, CreateCheckoutInput, CreateCheckoutResult, PaymentEvent, PaymentProvider, PaymentStatus, RefundResult } from '../types';

export interface CashflowsConfig {
  // Add the credentials your Cashflows account gives you. Read them from environment variables, never hard-code them.
  [key: string]: string;
}

export class CashflowsProvider implements PaymentProvider {
  readonly name = 'cashflows';
  constructor(private readonly config: CashflowsConfig) {}

  async createCheckout(_input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    // Create a hosted payment page (or equivalent) for _input.totalPence in GBP that only AUTHORISES the payment
    // (no automatic capture), carrying _input.orderId so the webhook can be matched to the order, and return its URL
    // and the provider's reference.
    throw new Error('Cashflows adapter not implemented');
  }

  async verifyWebhook(_rawBody: string, _headers: Headers): Promise<PaymentEvent> {
    // Verify the notification's authenticity exactly as Cashflows documents it (for example a signature header checked
    // in constant time). Throw WebhookSignatureError when it fails. Map a successful authorisation to
    // 'payment_authorised' with the amount held and the card's funding type (credit, debit or prepaid). If Cashflows
    // cannot tell you the funding type, report 'unknown': it is treated as credit, so above the DCMS credit card
    // limit the operator in effect accepts debit cards only. Never guess 'debit'.
    throw new Error('Cashflows adapter not implemented');
  }

  async capture(_paymentRef: string, _amountPence: number, _idempotencyKey: string): Promise<CaptureResult> {
    // Capture up to the authorised amount. Return 'failed' only when the authorisation can never be captured.
    throw new Error('Cashflows adapter not implemented');
  }

  async cancel(_paymentRef: string, _idempotencyKey: string): Promise<void> {
    // Release (void) the authorisation without taking any money. Must be safe to call twice.
    throw new Error('Cashflows adapter not implemented');
  }

  async refund(_paymentRef: string, _amountPence: number, _idempotencyKey: string): Promise<RefundResult> {
    throw new Error('Cashflows adapter not implemented');
  }

  async getStatus(_providerRef: string): Promise<PaymentStatus> {
    throw new Error('Cashflows adapter not implemented');
  }
}
