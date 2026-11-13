import { getDb } from '@/lib/db';
import { getProviderByName } from '@/lib/payments';
import { handleWebhook } from '@/lib/payments/webhook';

/**
 * Payment provider webhooks: /api/webhooks/stripe, /api/webhooks/test, or your acquirer's name. The signature is
 * checked against the exact raw body before anything else happens. Not subject to the Origin check: providers post
 * from their own servers, so the signature is what authenticates the request.
 */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const name = (await ctx.params).provider;
  const provider = /^[a-z-]{1,40}$/.test(name) ? getProviderByName(name) : null;
  if (!provider) return new Response('unknown provider', { status: 404 });
  const raw = await req.text();
  const r = await handleWebhook(getDb(), provider, raw, req.headers);
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'text/plain' } });
}
