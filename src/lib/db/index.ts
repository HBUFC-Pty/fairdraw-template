import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export { schema };

/** Any Drizzle Postgres database or transaction using this schema (node-postgres in production, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

let pool: Pool | undefined;
let db: Db | undefined;

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 10) });
  }
  return pool;
}

export function getDb(): Db {
  if (!db) db = drizzle(getPool(), { schema }) as unknown as Db;
  return db;
}
