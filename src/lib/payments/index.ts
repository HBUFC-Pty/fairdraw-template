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
