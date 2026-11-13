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
