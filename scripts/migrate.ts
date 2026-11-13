/** Apply database migrations. Runs automatically when the app container starts (see Dockerfile). */
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const url = process.env.DATABASE_URL;
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
