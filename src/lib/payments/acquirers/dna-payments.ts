/**
 * DnaPayments adapter: STUB. Fill in from DnaPayments's own developer documentation and your merchant agreement.
 * This file deliberately contains no details of DnaPayments's API: none have been verified for this template.
 * See docs/payments.md for what a finished adapter must do and how to test it.
 */
import type { CreateCheckoutInput, CreateCheckoutResult, PaymentEvent, PaymentProvider, PaymentStatus, RefundResult } from '../types';

export interface DnaPaymentsConfig {
  // Add the credentials your DnaPayments account gives you. Read them from environment variables, never hard-code them.
  [key: string]: string;
}

export class DnaPaymentsProvider implements PaymentProvider {
  readonly name = 'dna-payments';
  constructor(private readonly config: DnaPaymentsConfig) {}

  async createCheckout(_input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    // Create a hosted payment page (or equivalent) for _input.totalPence in GBP, carrying _input.orderId so the
    // webhook can be matched to the order, and return its URL and the provider's reference.
    throw new Error('DnaPayments adapter not implemented');
  }

  async verifyWebhook(_rawBody: string, _headers: Headers): Promise<PaymentEvent> {
    // Verify the notification's authenticity exactly as DnaPayments documents it (for example a signature header checked
    // in constant time). Throw WebhookSignatureError when it fails. Map success to 'payment_succeeded' with the
    // amount actually captured, so the order total can be checked.
    throw new Error('DnaPayments adapter not implemented');
  }

  async refund(_paymentRef: string, _amountPence: number, _idempotencyKey: string): Promise<RefundResult> {
    throw new Error('DnaPayments adapter not implemented');
  }

  async getStatus(_providerRef: string): Promise<PaymentStatus> {
    throw new Error('DnaPayments adapter not implemented');
  }
}
