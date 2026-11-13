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
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { retentionIfDue, runTick } from '@/lib/worker';

/**
 * Serverless trigger for the scheduled work, for hosts that cannot run the worker process (docs/deploy-vercel.md).
 * POST with "Authorization: Bearer <CRON_SECRET>"; called every 5 minutes by .github/workflows/tick.yml. With
 * CRON_SECRET unset (every Docker install) the endpoint answers 404, so it only exists where it is configured.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(header: string | null, secret: string) {
  const given = Buffer.from(header ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function POST(req: Request) {
  const secret = env().CRON_SECRET;
  const headers = { 'Cache-Control': 'no-store' };
  if (!secret) return new Response('Not found', { status: 404, headers });
  if (!authorised(req.headers.get('authorization'), secret)) return new Response('Unauthorised', { status: 401, headers });
  const ran = await runTick();
  const retention = ran ? await retentionIfDue() : false;
  return Response.json({ ok: true, ran, retention }, { headers });
}
