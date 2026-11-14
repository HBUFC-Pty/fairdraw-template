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
 * Instant wins that anyone can check.
 *
 * When a competition with instant prizes is published, the winning ticket numbers are chosen at random over the whole
 * range and committed: instant_commit = SHA-256 of "fairdraw-instant-v1", a secret salt and the "number:tier" lines in
 * number order. The hash is public from that moment. A ticket wins the moment it is entered with a winning number and
 * a correct answer (the database awards it: drizzle/0005), and numbers are always allocated at random in these
 * competitions, so nobody, the operator included, can steer a prize to a ticket. At the close the salt and the full
 * list are published (/draws/<slug>/instant-wins.json), so anyone can recompute the hash and see every prize, won or
 * not: none can be added, moved or held back afterwards.
 */
import { createHash, randomBytes } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db';
import { instantWins, type InstantPrizeTier } from '../db/schema';
import { allocateRandom, cryptoRandomInt, type RandomIntFn } from './allocation';

export const INSTANT_METHOD = 'fairdraw-instant-v1';

export const instantPrizeTiersSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(80),
      valuePence: z.number().int().min(1),
      count: z.number().int().min(1).max(10_000),
    }),
  )
  .max(20)
  .default([]);

export function instantPrizeCount(tiers: readonly InstantPrizeTier[]): number {
  return tiers.reduce((s, t) => s + t.count, 0);
}

/** The commitment for a salt and a list of winning numbers (any order): the same calculation as drizzle/0005. */
export function instantCommitment(saltHex: string, rows: readonly { ticketNumber: number; tier: number }[]): string {
  const lines = [...rows].sort((a, b) => a.ticketNumber - b.ticketNumber).map((r) => `${r.ticketNumber}:${r.tier}`);
  return createHash('sha256').update(`${INSTANT_METHOD}\n${saltHex}\n${lines.join('\n')}`, 'utf8').digest('hex');
}

/** Pick the winning numbers: distinct, uniform over 1..maxTickets, the first tier's prizes first. */
export function chooseInstantNumbers(maxTickets: number, tiers: readonly InstantPrizeTier[], rand: RandomIntFn = cryptoRandomInt) {
  const total = instantPrizeCount(tiers);
  if (total === 0) return [];
  if (total > maxTickets) throw new Error('there are more instant prizes than tickets');
  const numbers = allocateRandom(maxTickets, new Set(), total, rand);
  const out: { ticketNumber: number; tier: number; title: string; valuePence: number }[] = [];
  let i = 0;
  tiers.forEach((t, tier) => {
    for (let k = 0; k < t.count; k++) out.push({ ticketNumber: numbers[i++]!, tier, title: t.title, valuePence: t.valuePence });
  });
  return out;
}

/**
 * Called while publishing, inside the same transaction: write the winning numbers and return the columns that commit to
 * them. The database refuses the publish if the hash does not match what was written (drizzle/0005).
 */
export async function prepareInstantPrizes(tx: Db, competitionId: string, maxTickets: number, tiers: readonly InstantPrizeTier[], now: Date, rand?: RandomIntFn) {
  const rows = chooseInstantNumbers(maxTickets, tiers, rand);
  if (!rows.length) return {};
  await tx.insert(instantWins).values(rows.map((r) => ({ competitionId, ...r })));
  const salt = randomBytes(32).toString('hex');
  return { instantSalt: salt, instantCommit: instantCommitment(salt, rows), instantCommittedAt: now, isInstantWin: true };
}

export interface InstantRecord {
  method: string;
  commit: string;
  committed_at: string;
  salt: string;
  prizes: { ticket: number; tier: number; title: string; value_pence: number; won: boolean }[];
}

/** Check a published instant-win record: the hash must match the salt and the list. */
export function verifyInstantRecord(r: InstantRecord): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  if (r.method !== INSTANT_METHOD) problems.push(`unknown method ${r.method}`);
  if (new Set(r.prizes.map((p) => p.ticket)).size !== r.prizes.length) problems.push('a ticket number appears twice');
  const digest = instantCommitment(r.salt, r.prizes.map((p) => ({ ticketNumber: p.ticket, tier: p.tier })));
  if (digest !== r.commit) problems.push('the list and salt do not match the commitment published when sales opened');
  return { ok: problems.length === 0, problems };
}

/** The instant prizes of one competition, in ticket order. */
export async function instantRows(db: Db, competitionId: string) {
  return db.select().from(instantWins).where(eq(instantWins.competitionId, competitionId)).orderBy(asc(instantWins.ticketNumber));
}
