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
import { getDb } from '@/lib/db';
import { pruneVisitCounts, statsSnapshot } from '@/lib/stats';

/**
 * Live traffic totals from the optional visit counter (src/lib/stats.ts), for the operator's own dashboard.
 * GET with "Authorization: Bearer <STATS_TOKEN>". With STATS_TOKEN unset (the default) the endpoint answers 404, so it
 * only exists where the operator has turned the counter on. Counts only: never addresses, browsers, hashes or names.
 */
export const dynamic = 'force-dynamic';

function authorised(header: string | null, token: string) {
  const given = Buffer.from(header ?? '');
  const want = Buffer.from(`Bearer ${token}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function GET(req: Request) {
  const token = env().STATS_TOKEN;
  const headers = { 'Cache-Control': 'no-store' };
  if (!token) return new Response('Not found', { status: 404, headers });
  if (!authorised(req.headers.get('authorization'), token)) return new Response('Unauthorised', { status: 401, headers });
  const db = getDb();
  // Keeps the 48 hour limit close on hosts whose scheduled work runs only every few hours.
  await pruneVisitCounts(db).catch(() => undefined);
  return Response.json(await statsSnapshot(db), { headers });
}
