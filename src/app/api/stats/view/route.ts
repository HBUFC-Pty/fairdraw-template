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
import { z } from 'zod';
import { env } from '@/lib/env';
import { getDb } from '@/lib/db';
import { RATE_RULES, hit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/web/request';
import { normalisePath, recordPageView, referrerHost, skipReason, viewRateKey } from '@/lib/stats';

/**
 * Counts one page view for the optional visit counter (src/lib/stats.ts), sent by src/components/PageCounter.tsx.
 * 404 unless STATS_TOKEN is set. Only this site's own pages can report (Origin check), nothing is returned, no cookie is
 * read or set, and a failure is ignored so counting never affects a visitor. The Origin check only stops browsers, so
 * the body is read only up to MAX_BODY bytes, each connection is rate limited (by a daily keyed hash of its IP
 * address, never the address) and recordPageView caps the rows each minute can add.
 */
export const dynamic = 'force-dynamic';

const MAX_BODY = 4096;
const body = z.object({ p: z.string().max(512), r: z.string().max(2048).optional() });

/** The body as text, or null when it is larger than `max` bytes. Stops reading at the limit, so nothing larger is held. */
async function readCapped(req: Request, max: number): Promise<string | null> {
  const declared = req.headers.get('content-length');
  if (declared !== null && !(Number(declared) <= max)) return null;
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function POST(req: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const e = env();
  if (!e.STATS_TOKEN) return new Response('Not found', { status: 404, headers });
  const app = new URL(e.APP_URL);
  if (req.headers.get('origin') !== app.origin) return new Response(null, { status: 403, headers });
  try {
    if (skipReason(req.headers)) return new Response(null, { status: 204, headers });
    const text = await readCapped(req, MAX_BODY);
    if (text === null) return new Response(null, { status: 204, headers });
    const parsed = body.safeParse(JSON.parse(text));
    const path = parsed.success ? normalisePath(parsed.data.p) : null;
    if (!parsed.success || !path) return new Response(null, { status: 204, headers });
    const db = getDb();
    const ip = await clientIp();
    // Without a known address every visitor would share one limit, so then only the per-minute row caps apply.
    if (ip !== 'unknown' && !(await hit(db, viewRateKey(e.APP_SECRET, new Date(), ip), RATE_RULES.pageView))) {
      return new Response(null, { status: 204, headers });
    }
    await recordPageView(db, {
      path,
      referrerHost: referrerHost(parsed.data.r, app.hostname),
      ip,
      userAgent: (req.headers.get('user-agent') ?? '').slice(0, 512),
    });
  } catch {
    // Counting is best effort: a bad body or a database hiccup is not the visitor's problem.
  }
  return new Response(null, { status: 204, headers });
}
