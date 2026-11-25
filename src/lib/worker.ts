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
 * One cycle of the scheduled work, shared by the long-running worker (scripts/worker.ts, every 15 seconds) and the
 * serverless trigger (src/app/api/cron/tick/route.ts, for hosts such as Vercel that cannot run a worker process).
 *
 * runTick: expire unpaid orders, close competitions at their close time (or when sold out) and publish the commitment,
 * make due draws once the committed drand round exists, settle authorised payments and send pending refunds, and (demo
 * sites only) remove old visitor accounts and keep demo competitions open, and delete visit counts older than 48 hours.
 * runRetention: the nightly retention job. retentionIfDue runs it when it last ran over 23 hours ago.
 * A Postgres advisory lock means two cycles never overlap, whichever process starts them.
 */
import { eq, min } from 'drizzle-orm';
import { getDb, getPool, type Db } from '@/lib/db';
import { draws, jobRuns, orders, postalEntries, users, competitions } from '@/lib/db/schema';
import { closeCompetition, competitionsDueToClose, competitionsDueToDraw, runDraw } from '@/lib/draw/service';
import { expireStaleOrders, processRefunds, settlePendingOrders } from '@/lib/checkout/service';
import { getPaymentProvider } from '@/lib/payments';
import { runRetention as retentionJob } from '@/lib/retention';
import { sendMail, winnerMail } from '@/lib/mail';
import { env } from '@/lib/env';
import { configuredRelays, fetchBeacon } from '@/lib/fairdraw/beacon';
import { formatUk } from '@/lib/time';
import { demoNextDueAt, demoUpkeep } from '@/lib/demo';
import { pruneVisitCounts } from '@/lib/stats';

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

/** One cycle. Returns false when another cycle holds the lock (nothing was done). */
export async function runTick(): Promise<boolean> {
  if (running) return false;
  running = true;
  const client = await getPool().connect();
  try {
    const { rows } = await client.query<{ ok: boolean }>('SELECT pg_try_advisory_lock($1) AS ok', [LOCK_KEY]);
    if (!rows[0]?.ok) return false;
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

      // Captures and releases that did not go through when the webhook arrived (authorisations last about 7 days).
      await settlePendingOrders(db, getPaymentProvider()).catch((e) => errors.push(`settle: ${e.message}`));
      await processRefunds(db, getPaymentProvider()).catch((e) => errors.push(`refunds: ${e.message}`));
      // Demo sites only (DEMO_MODE): remove old visitor accounts and keep competitions open. A no-op elsewhere.
      await demoUpkeep(db).catch((e) => errors.push(`demo: ${e.message}`));
      // The optional visit counter keeps its rows for 48 hours (src/lib/stats.ts). A no-op when it holds none.
      await pruneVisitCounts(db).catch((e) => errors.push(`visit counts: ${e.message}`));
      if (errors.length) console.error(errors.join('\n'));
      await record('tick', errors.length === 0, errors.join('\n').slice(0, 2000) || undefined);
      return true;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    }
  } catch (e) {
    console.error('worker tick failed', e);
    await record('tick', false, (e as Error).message).catch(() => undefined);
    return false;
  } finally {
    client.release();
    running = false;
  }
}

export async function runRetention() {
  try {
    const r = await retentionJob(getDb());
    console.info(`retention: ${JSON.stringify(r)}`);
    await record('retention', true);
  } catch (e) {
    console.error('retention failed', e);
    await record('retention', false, (e as Error).message).catch(() => undefined);
  }
}

/** The retention job, when it last ran more than 23 hours ago (for hosts that only call runTick). */
export async function retentionIfDue(): Promise<boolean> {
  const [last] = await getDb().select().from(jobRuns).where(eq(jobRuns.job, 'retention'));
  if (last && Date.now() - last.lastRunAt.getTime() < 23 * 3600_000) return false;
  await runRetention();
  return true;
}

/**
 * When the scheduled work next has something to do: the earliest close of a live competition, scheduled draw of a
 * closed one, or expiry of an unpaid order (and, on demo sites, when a demo competition needs a successor). A time in
 * the past means "now". Null when nothing is scheduled. Lets a caller such as scripts/tick.sh leave a free database
 * asleep between events instead of waking it every few minutes. Sell-outs, payment retries and retention are not
 * timed, so callers should still call every few hours.
 */
export async function nextDueAt(db: Db = getDb(), now = new Date()): Promise<Date | null> {
  const [live] = await db.select({ t: min(competitions.closesAt) }).from(competitions).where(eq(competitions.status, 'live'));
  const [draw] = await db
    .select({ t: min(draws.scheduledDrawAt) })
    .from(draws)
    .innerJoin(competitions, eq(competitions.id, draws.competitionId))
    .where(eq(competitions.status, 'closed'));
  const [order] = await db.select({ t: min(orders.expiresAt) }).from(orders).where(eq(orders.status, 'pending'));
  const times = [live?.t, draw?.t, order?.t].filter((t): t is Date => t instanceof Date);
  const demo = await demoNextDueAt(db, now);
  if (demo) times.push(demo);
  return times.length ? new Date(Math.min(...times.map((t) => t.getTime()))) : null;
}
