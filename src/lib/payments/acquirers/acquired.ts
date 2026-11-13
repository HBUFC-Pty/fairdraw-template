/**
 * Acquired adapter: STUB. Fill in from Acquired's own developer documentation and your merchant agreement.
 * This file deliberately contains no details of Acquired's API: none have been verified for this template.
 * See docs/payments.md for what a finished adapter must do and how to test it.
 */
import type { CreateCheckoutInput, CreateCheckoutResult, PaymentEvent, PaymentProvider, PaymentStatus, RefundResult } from '../types';

export interface AcquiredConfig {
  // Add the credentials your Acquired account gives you. Read them from environment variables, never hard-code them.
  [key: string]: string;
}

export class AcquiredProvider implements PaymentProvider {
  readonly name = 'acquired';
  constructor(private readonly config: AcquiredConfig) {}

  async createCheckout(_input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    // Create a hosted payment page (or equivalent) for _input.totalPence in GBP, carrying _input.orderId so the
    // webhook can be matched to the order, and return its URL and the provider's reference.
    throw new Error('Acquired adapter not implemented');
  }

  async verifyWebhook(_rawBody: string, _headers: Headers): Promise<PaymentEvent> {
    // Verify the notification's authenticity exactly as Acquired documents it (for example a signature header checked
    // in constant time). Throw WebhookSignatureError when it fails. Map success to 'payment_succeeded' with the
    // amount actually captured, so the order total can be checked.
    throw new Error('Acquired adapter not implemented');
  }

  async refund(_paymentRef: string, _amountPence: number, _idempotencyKey: string): Promise<RefundResult> {
    throw new Error('Acquired adapter not implemented');
  }

  async getStatus(_providerRef: string): Promise<PaymentStatus> {
    throw new Error('Acquired adapter not implemented');
  }
}
