import type { Db } from '../db';
import { applyPaymentEvent } from '../checkout/service';
import type { PaymentProvider } from './types';
import { WebhookSignatureError } from './types';

/** Verify and apply one webhook. Returns the HTTP status to answer with. */
export async function handleWebhook(db: Db, provider: PaymentProvider, rawBody: string, headers: Headers): Promise<{ status: number; body: string }> {
  if (rawBody.length > 1_000_000) return { status: 413, body: 'too large' };
  let event;
  try {
    event = await provider.verifyWebhook(rawBody, headers);
  } catch (e) {
    if (e instanceof WebhookSignatureError) return { status: 400, body: 'invalid signature' };
    return { status: 400, body: 'invalid event' };
  }
  const outcome = await applyPaymentEvent(db, provider.name, event);
  return { status: 200, body: outcome };
}
