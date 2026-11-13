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
 * Closing competitions and making draws, following FairDraw's verifiable draw method.
 *
 *   1. At the close (the advertised close time, or earlier if every ticket is sold), the list of active tickets is
 *      frozen and the commitment is published: the sorted list, its SHA-256 and a drand round whose randomness will
 *      only exist at the advertised draw time.
 *   2. When that round exists, its randomness is fetched from at least two independent relays, which must agree.
 *   3. The winners are picked with fairdrawPick and the full record is published.
 *
 * DO NOT weaken this file: never draw before the round exists, never change a committed list, never redo a draw,
 * never pick winners any other way. The database refuses all of these too. See AGENTS.md.
 */
import { and, asc, eq, inArray, lte, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { competitions, draws, refunds, tickets, winners } from '../db/schema';
import { appendAudit, type AuditActor } from '../audit';
import { fairdrawCommit, fairdrawPick, fairdrawRecord, fairdrawRoundTime, type FairdrawCommit, type FairdrawRecord } from '../fairdraw/draw';
import { fetchBeacon, BeaconNotReadyError, type BeaconResult } from '../fairdraw/beacon';

export const SYSTEM_ACTOR: AuditActor = { id: null, role: 'system' };

export type BeaconFn = (round: number) => Promise<BeaconResult>;

export class DrawNotDueError extends Error {}

/**
 * Close a live competition and publish its commitment. Called by the worker at the close time, or when it sells out.
 * Tickets with a wrong answer to the skill question are excluded (and refunded); unpaid reservations lapse.
 */
export async function closeCompetition(db: Db, competitionId: string, now = new Date()): Promise<FairdrawCommit> {
  const result = await db.transaction(async (tx) => {
    const [c] = await tx.select().from(competitions).where(eq(competitions.id, competitionId)).for('update');
    if (!c) throw new Error('competition not found');
    if (c.status !== 'live') throw new Error(`competition is ${c.status}, not live`);

    await tx.update(tickets).set({ status: 'expired' }).where(and(eq(tickets.competitionId, c.id), eq(tickets.status, 'reserved')));
    const [{ n: active } = { n: '0' }] = await tx
      .select({ n: sql<string>`count(*)` })
      .from(tickets)
      .where(and(eq(tickets.competitionId, c.id), eq(tickets.status, 'active')));
    const soldOut = Number(active) >= c.maxTickets;
    if (now < c.closesAt && !soldOut) throw new DrawNotDueError('competition has not reached its close time');

    // Wrong answers to the skill question do not go into the draw. Paid ones are refunded.
    const wrong = await tx
      .update(tickets)
      .set({ status: 'ineligible' })
      .where(and(eq(tickets.competitionId, c.id), eq(tickets.status, 'active'), eq(tickets.answerCorrect, false)))
      .returning({ orderId: tickets.orderId });
    const perOrder = new Map<string, number>();
    for (const w of wrong) if (w.orderId) perOrder.set(w.orderId, (perOrder.get(w.orderId) ?? 0) + 1);
    for (const [orderId, count] of perOrder) {
      await tx.insert(refunds).values({ orderId, amountPence: count * c.ticketPricePence, reason: 'Incorrect answer to the competition question: entry not included in the draw', createdAt: now });
    }

    const list = (
      await tx
        .select({ n: tickets.number })
        .from(tickets)
        .where(and(eq(tickets.competitionId, c.id), eq(tickets.status, 'active')))
        .orderBy(asc(tickets.number))
    ).map((r) => r.n);

    const closeUnix = Math.floor(now.getTime() / 1000);
    const drawUnix = Math.ceil(c.drawAt.getTime() / 1000);
    // The PHP original waits 30 seconds after the close. Waiting until the advertised draw time (never less than 30
    // seconds) means the randomness does not exist until the moment the competition said it would be drawn.
    const wait = Math.max(30, drawUnix - closeUnix);
    const commit = await fairdrawCommit(list, closeUnix, c.maxTickets, wait);

    await tx.insert(draws).values({
      competitionId: c.id,
      closedAtText: commit.closed_at,
      closeUnix,
      ticketsSold: commit.tickets_sold,
      maxTickets: commit.max_tickets,
      entriesHash: commit.entries_hash,
      drandChain: commit.drand_chain,
      drandRound: commit.drand_round,
      ticketList: list,
      committedAt: now,
      scheduledDrawAt: c.drawAt,
    });
    await tx.update(competitions).set({ status: 'closed', closedAt: now, updatedAt: now }).where(eq(competitions.id, c.id));
    return { commit, closedEarly: now < c.closesAt, ineligible: wrong.length };
  });
  await appendAudit(db, SYSTEM_ACTOR, {
    action: 'draw.commit',
    targetType: 'competition',
    targetId: competitionId,
    details: { ...result.commit, closed_early_sold_out: result.closedEarly, ineligible_tickets: result.ineligible },
  }, now);
  return result.commit;
}

export interface DrawOutcome {
  record: FairdrawRecord;
  winners: { position: number; ticket: number; userId: string | null; postalEntryId: string | null }[];
  alreadyDrawn: boolean;
}

/** The public record for a draw row (null until drawn). */
export function recordFromRow(d: typeof draws.$inferSelect): FairdrawRecord | null {
  if (!d.randomness || !d.winningTickets) return null;
  return fairdrawRecord(commitFromRow(d), d.randomness, d.winningTickets);
}

export function commitFromRow(d: typeof draws.$inferSelect): FairdrawCommit {
  return {
    closed_at: d.closedAtText,
    tickets_sold: d.ticketsSold,
    max_tickets: d.maxTickets,
    entries_hash: d.entriesHash,
    drand_chain: d.drandChain,
    drand_round: d.drandRound,
  };
}

/**
 * Make the draw for a closed competition. Refuses before the advertised draw time and before the committed round
 * exists. If the draw was already made, returns the existing record: a draw is never redone.
 */
export async function runDraw(db: Db, competitionId: string, opts: { beacon?: BeaconFn; now?: Date } = {}): Promise<DrawOutcome> {
  const now = opts.now ?? new Date();
  const [d] = await db.select().from(draws).where(eq(draws.competitionId, competitionId));
  if (!d) throw new DrawNotDueError('this competition has no commitment yet');
  const existing = recordFromRow(d);
  if (existing) {
    const ws = await db.select().from(winners).where(eq(winners.competitionId, competitionId)).orderBy(asc(winners.position));
    return { record: existing, winners: ws.map((w) => ({ position: w.position, ticket: w.ticketNumber, userId: w.userId, postalEntryId: w.postalEntryId })), alreadyDrawn: true };
  }
  if (now < d.scheduledDrawAt) throw new DrawNotDueError('the advertised draw time has not arrived');
  if (now.getTime() / 1000 < fairdrawRoundTime(d.drandRound)) throw new BeaconNotReadyError(`drand round ${d.drandRound} does not exist yet`);

  const beacon = await (opts.beacon ?? ((round: number) => fetchBeacon(round)))(d.drandRound);
  if (beacon.round !== d.drandRound) throw new Error('beacon returned the wrong round');
  if (beacon.relays.length < 2) throw new Error('randomness must be confirmed by at least two relays');

  const [c] = await db.select().from(competitions).where(eq(competitions.id, competitionId));
  const won = await fairdrawPick(d.ticketList, beacon.randomness, c!.winnerCount);

  const outcome = await db.transaction(async (tx) => {
    await tx
      .update(draws)
      .set({ randomness: beacon.randomness, signature: beacon.signature, winningTickets: won, relays: beacon.relays, drawnAt: now })
      .where(eq(draws.competitionId, competitionId));
    await tx.update(competitions).set({ status: 'drawn', drawnAt: now, updatedAt: now }).where(eq(competitions.id, competitionId));
    const owners = won.length
      ? await tx
          .select({ number: tickets.number, userId: tickets.userId, postalEntryId: tickets.postalEntryId })
          .from(tickets)
          .where(and(eq(tickets.competitionId, competitionId), inArray(tickets.number, won), inArray(tickets.status, ['active', 'refunded'])))
      : [];
    const ws = won.map((ticket, i) => {
      const o = owners.find((x) => x.number === ticket);
      return { position: i + 1, ticket, userId: o?.userId ?? null, postalEntryId: o?.postalEntryId ?? null };
    });
    if (ws.length) {
      await tx.insert(winners).values(ws.map((w) => ({ competitionId, position: w.position, ticketNumber: w.ticket, userId: w.userId, postalEntryId: w.postalEntryId })));
    }
    return ws;
  });
  const record = fairdrawRecord(commitFromRow(d), beacon.randomness, won);
  await appendAudit(db, SYSTEM_ACTOR, { action: 'draw.result', targetType: 'competition', targetId: competitionId, details: { randomness: beacon.randomness, winning_tickets: won, relays: beacon.relays, scheduled: d.scheduledDrawAt.toISOString() } }, now);
  return { record, winners: outcome, alreadyDrawn: false };
}

/** Competitions that should close now: live and past their close time, or sold out. */
export async function competitionsDueToClose(db: Db, now = new Date()): Promise<string[]> {
  const rows = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(
      and(
        eq(competitions.status, 'live'),
        sql`(${competitions.closesAt} <= ${now.toISOString()} OR (SELECT count(*) FROM tickets t WHERE t.competition_id = ${competitions.id} AND t.status = 'active') >= ${competitions.maxTickets})`,
      ),
    );
  return rows.map((r) => r.id);
}

/** Closed competitions whose advertised draw time has come and whose drand round exists. */
export async function competitionsDueToDraw(db: Db, now = new Date()): Promise<string[]> {
  const rows = await db
    .select({ id: draws.competitionId, round: draws.drandRound })
    .from(draws)
    .innerJoin(competitions, eq(competitions.id, draws.competitionId))
    .where(and(eq(competitions.status, 'closed'), lte(draws.scheduledDrawAt, now)));
  return rows.filter((r) => now.getTime() / 1000 >= fairdrawRoundTime(r.round)).map((r) => r.id);
}
