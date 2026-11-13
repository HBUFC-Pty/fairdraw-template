import { env } from '../env';
import { StripeProvider } from './stripe';
import { TestProvider } from './test-provider';
import type { PaymentProvider } from './types';

let provider: PaymentProvider | undefined;

/** The configured payment provider (PAYMENT_PROVIDER). To add an acquirer, see docs/payments.md. */
export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  const e = env();
  switch (e.PAYMENT_PROVIDER) {
    case 'stripe':
      if (!e.STRIPE_SECRET_KEY || !e.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required');
      provider = new StripeProvider(e.STRIPE_SECRET_KEY, e.STRIPE_WEBHOOK_SECRET);
      break;
    case 'test':
      provider = new TestProvider(e.APP_SECRET, e.APP_URL);
      break;
  }
  return provider;
}

export function getProviderByName(name: string): PaymentProvider | null {
  const p = getPaymentProvider();
  return p.name === name ? p : null;
}
