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
