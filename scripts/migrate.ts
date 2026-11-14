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
/** Apply database migrations. Runs automatically when the app container starts (see Dockerfile). */
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Prefer a direct connection where the host gives one (Neon): migrations should not run through a pooler.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const folder = process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), 'drizzle');
const pool = new Pool({ connectionString: url, max: 1 });
for (let attempt = 1; ; attempt++) {
  try {
    await pool.query('SELECT 1');
    break;
  } catch (e) {
    if (attempt >= 30) throw e;
    console.info(`waiting for the database (${attempt})`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
await migrate(drizzle(pool), { migrationsFolder: folder });
console.info('migrations applied');
await pool.end();
