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
 * Ticket number allocation. Random allocation picks uniformly from the unsold numbers using the operating system's
 * cryptographic random number generator (crypto.randomInt). Chosen allocation takes the numbers the player asked for,
 * if they are free. Each ticket records which method was used.
 */
import { randomInt } from 'node:crypto';

export type RandomIntFn = (maxExclusive: number) => number;
export const cryptoRandomInt: RandomIntFn = (maxExclusive) => randomInt(maxExclusive);

export class AllocationError extends Error {}

/**
 * Pick `count` distinct numbers in 1..max that are not in `taken`, uniformly at random.
 * Uses rejection sampling while most numbers are free, and a partial Fisher-Yates shuffle of the free numbers when
 * the competition is more than half sold, so it stays fast in both cases.
 */
export function allocateRandom(max: number, taken: ReadonlySet<number>, count: number, rand: RandomIntFn = cryptoRandomInt): number[] {
  if (!Number.isInteger(count) || count < 1) throw new AllocationError('ask for at least one ticket');
  const free = max - taken.size;
  if (count > free) throw new AllocationError(`only ${Math.max(free, 0)} tickets are left`);
  if (taken.size <= max / 2) {
    const picked = new Set<number>();
    while (picked.size < count) {
      const n = rand(max) + 1;
      if (!taken.has(n)) picked.add(n);
    }
    return [...picked];
  }
  const pool: number[] = [];
  for (let n = 1; n <= max; n++) if (!taken.has(n)) pool.push(n);
  for (let i = 0; i < count; i++) {
    const j = i + rand(pool.length - i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

/** Validate numbers a player chose: whole numbers in range, no repeats, none already taken. */
export function allocateChosen(max: number, taken: ReadonlySet<number>, chosen: readonly number[]): number[] {
  if (chosen.length === 0) throw new AllocationError('choose at least one number');
  const seen = new Set<number>();
  for (const n of chosen) {
    if (!Number.isInteger(n) || n < 1 || n > max) throw new AllocationError(`ticket ${n} is not between 1 and ${max}`);
    if (seen.has(n)) throw new AllocationError(`ticket ${n} is listed twice`);
    if (taken.has(n)) throw new AllocationError(`ticket ${n} has already gone`);
    seen.add(n);
  }
  return [...chosen];
}

/** The per-person cap rule FairDraw checks: a cap of more than 10% of the maximum loses a point. */
export function capAboveTenPercent(perPersonCap: number, maxTickets: number): boolean {
  return perPersonCap * 10 > maxTickets;
}

/** Would `requested` more entries break the per-person cap? */
export function withinCap(held: number, requested: number, cap: number): boolean {
  return held + requested <= cap;
}
