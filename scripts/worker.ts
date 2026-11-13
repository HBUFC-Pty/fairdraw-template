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
/**
 * The scheduled worker. Runs as its own process (the `worker` service in docker-compose.yml): one cycle every 15
 * seconds and the retention job every night at 03:30 UK time. The work itself is in src/lib/worker.ts, which the
 * serverless trigger (src/app/api/cron/tick/route.ts) shares. Only one cycle runs at a time (Postgres advisory lock).
 */
import cron from 'node-cron';
import { sql } from 'drizzle-orm';
import { getDb } from '../src/lib/db';
import { env } from '../src/lib/env';
import { runRetention, runTick } from '../src/lib/worker';

env(); // fail fast on bad configuration
await getDb().execute(sql`SELECT 1`);
console.info('worker started');
cron.schedule('*/15 * * * * *', () => void runTick());
cron.schedule('30 3 * * *', () => void runRetention(), { timezone: 'Europe/London' });
await runTick();
