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
import { clientIp } from '@/lib/web/request';
import { normalisePath, recordPageView, referrerHost, skipReason } from '@/lib/stats';

/**
 * Counts one page view for the optional visit counter (src/lib/stats.ts), sent by src/components/PageCounter.tsx.
 * 404 unless STATS_TOKEN is set. Only this site's own pages can report (Origin check), nothing is returned, no cookie is
 * read or set, and a failure is ignored so counting never affects a visitor.
 */
export const dynamic = 'force-dynamic';

const body = z.object({ p: z.string().max(512), r: z.string().max(2048).optional() });

export async function POST(req: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const e = env();
  if (!e.STATS_TOKEN) return new Response('Not found', { status: 404, headers });
  const app = new URL(e.APP_URL);
  if (req.headers.get('origin') !== app.origin) return new Response(null, { status: 403, headers });
  try {
    if (skipReason(req.headers)) return new Response(null, { status: 204, headers });
    const text = await req.text();
    if (text.length > 4096) return new Response(null, { status: 204, headers });
    const parsed = body.safeParse(JSON.parse(text));
    const path = parsed.success ? normalisePath(parsed.data.p) : null;
    if (!parsed.success || !path) return new Response(null, { status: 204, headers });
    await recordPageView(getDb(), {
      path,
      referrerHost: referrerHost(parsed.data.r, app.hostname),
      ip: await clientIp(),
      userAgent: (req.headers.get('user-agent') ?? '').slice(0, 512),
    });
  } catch {
    // Counting is best effort: a bad body or a database hiccup is not the visitor's problem.
  }
  return new Response(null, { status: 204, headers });
}
