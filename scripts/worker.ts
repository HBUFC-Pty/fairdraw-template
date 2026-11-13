/**
 * The scheduled worker. Runs as its own process (the `worker` service in docker-compose.yml).
 *
 * Every 15 seconds: expire unpaid orders, close competitions at their close time (or when sold out) and publish the
 * commitment, make due draws once the committed drand round exists, and send pending refunds.
 * Every night at 03:30 UK time: the retention job.
 *
 * Only one worker should run. A Postgres advisory lock makes a second copy wait rather than double up.
 */
import cron from 'node-cron';
import { eq, sql } from 'drizzle-orm';
import { getDb, getPool } from '../src/lib/db';
import { jobRuns, postalEntries, users, competitions } from '../src/lib/db/schema';
import { closeCompetition, competitionsDueToClose, competitionsDueToDraw, runDraw } from '../src/lib/draw/service';
import { expireStaleOrders, processRefunds } from '../src/lib/checkout/service';
import { getPaymentProvider } from '../src/lib/payments';
import { runRetention } from '../src/lib/retention';
import { sendMail, winnerMail } from '../src/lib/mail';
import { env } from '../src/lib/env';
import { configuredRelays, fetchBeacon } from '../src/lib/fairdraw/beacon';
import { formatUk } from '../src/lib/time';

const LOCK_KEY = 727275;

async function record(job: string, ok: boolean, error?: string) {
  const now = new Date();
  await getDb()
    .insert(jobRuns)
    .values({ job, lastRunAt: now, lastOk: ok, lastError: error ?? null })
    .onConflictDoUpdate({ target: jobRuns.job, set: { lastRunAt: now, lastOk: ok, lastError: error ?? null } });
}

async function notifyWinners(competitionId: string, ws: { ticket: number; userId: string | null; postalEntryId: string | null }[]) {
  const db = getDb();
  const [c] = await db.select().from(competitions).where(eq(competitions.id, competitionId));
  for (const w of ws) {
    let email: string | null = null;
    if (w.userId) [{ email } = { email: null }] = await db.select({ email: users.email }).from(users).where(eq(users.id, w.userId));
    else if (w.postalEntryId) [{ email } = { email: null }] = await db.select({ email: postalEntries.email }).from(postalEntries).where(eq(postalEntries.id, w.postalEntryId));
    if (email && !email.endsWith('@invalid')) {
      await sendMail(winnerMail(email, c!.title, w.ticket, `${env().APP_URL}/account`)).catch((e) => console.error(`winner email failed for ${competitionId}`, e));
    }
  }
}

let running = false;

async function tick() {
  if (running) return;
  running = true;
  const client = await getPool().connect();
  try {
    const { rows } = await client.query<{ ok: boolean }>('SELECT pg_try_advisory_lock($1) AS ok', [LOCK_KEY]);
    if (!rows[0]?.ok) return;
    try {
      const db = getDb();
      const errors: string[] = [];
      await expireStaleOrders(db).catch((e) => errors.push(`expire: ${e.message}`));

      for (const id of await competitionsDueToClose(db)) {
        try {
          const commit = await closeCompetition(db, id);
          console.info(`closed ${id}: ${commit.tickets_sold} tickets, hash ${commit.entries_hash}, drand round ${commit.drand_round}`);
        } catch (e) {
          errors.push(`close ${id}: ${(e as Error).message}`);
        }
      }

      const relays = configuredRelays(env().DRAND_RELAYS);
      for (const id of await competitionsDueToDraw(db)) {
        try {
          const out = await runDraw(db, id, { beacon: (round) => fetchBeacon(round, { relays }) });
          if (!out.alreadyDrawn) {
            const [c] = await db.select({ drawAt: competitions.drawAt, drawnAt: competitions.drawnAt }).from(competitions).where(eq(competitions.id, id));
            console.info(`drew ${id}: winners ${out.record.winning_tickets.join(', ') || 'none'}; scheduled ${formatUk(c!.drawAt, true)}, actual ${formatUk(c!.drawnAt, true)}`);
            await notifyWinners(id, out.winners);
          }
        } catch (e) {
          // Not ready yet (relays slow or disagreeing) is retried on the next tick; nothing is drawn until they agree.
          errors.push(`draw ${id}: ${(e as Error).message}`);
        }
      }

      await processRefunds(db, getPaymentProvider()).catch((e) => errors.push(`refunds: ${e.message}`));
      if (errors.length) console.error(errors.join('\n'));
      await record('tick', errors.length === 0, errors.join('\n').slice(0, 2000) || undefined);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    }
  } catch (e) {
    console.error('worker tick failed', e);
    await record('tick', false, (e as Error).message).catch(() => undefined);
  } finally {
    client.release();
    running = false;
  }
}

async function retention() {
  try {
    const r = await runRetention(getDb());
    console.info(`retention: ${JSON.stringify(r)}`);
    await record('retention', true);
  } catch (e) {
    console.error('retention failed', e);
    await record('retention', false, (e as Error).message).catch(() => undefined);
  }
}

env(); // fail fast on bad configuration
await getDb().execute(sql`SELECT 1`);
console.info('worker started');
cron.schedule('*/15 * * * * *', tick);
cron.schedule('30 3 * * *', retention, { timezone: 'Europe/London' });
await tick();
