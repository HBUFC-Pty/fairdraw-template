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
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { jobRuns } from '@/lib/db/schema';

/**
 * Health check. 200 when the database answers. The worker's last run is reported too; add ?worker=1 (for an uptime
 * monitor) to get 503 when the scheduled worker has not run in the last 5 minutes. Docker's own healthcheck uses the
 * plain form, so a stopped worker does not take the website down.
 */
export async function GET(req: Request) {
  const strict = new URL(req.url).searchParams.get('worker') === '1';
  try {
    await getDb().execute(sql`SELECT 1`);
    const runs = await getDb().select().from(jobRuns);
    const tick = runs.find((r) => r.job === 'tick');
    const workerOk = Boolean(tick && Date.now() - tick.lastRunAt.getTime() < 5 * 60_000 && tick.lastOk);
    const body = { ok: strict ? workerOk : true, database: 'ok', worker: { ok: workerOk, last_run_at: tick?.lastRunAt ?? null } };
    return Response.json(body, { status: body.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ ok: false, database: 'unreachable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
