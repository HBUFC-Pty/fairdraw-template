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
 * Bundle prices ("10 tickets for the price of 8"). A player always pays the lowest price for the number of tickets
 * they buy, using any mix of bundles and single tickets, and each ticket records its share of what was paid so that
 * refunds and released tickets are valued at exactly what the player paid (never the full ticket price).
 */
import { z } from 'zod';
import type { TicketBundle } from '../db/schema';

export const bundlesSchema = z
  .array(z.object({ quantity: z.number().int().min(2).max(10_000), pricePence: z.number().int().min(1) }))
  .max(6)
  .default([]);

/** The lowest price for `quantity` tickets from single tickets and any of the bundles. */
export function priceFor(quantity: number, unitPence: number, bundles: readonly TicketBundle[]): number {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('quantity must be a whole number');
  if (!bundles.length || quantity > 100_000) return quantity * unitPence;
  const best = new Array<number>(quantity + 1).fill(0);
  for (let q = 1; q <= quantity; q++) {
    let p = best[q - 1]! + unitPence;
    for (const b of bundles) if (b.quantity <= q) p = Math.min(p, best[q - b.quantity]! + b.pricePence);
    best[q] = p;
  }
  return best[quantity]!;
}

/** Split `total` across `count` tickets so the shares add up exactly; the first tickets take any odd pence. */
export function splitPrice(total: number, count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor(total / count);
  const extra = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

/** "10 for £8.00 (save £2.00)" style facts for a competition's bundles, cheapest per ticket first. */
export function bundleOffers(unitPence: number, bundles: readonly TicketBundle[]) {
  return [...bundles]
    .sort((a, b) => a.pricePence / a.quantity - b.pricePence / b.quantity)
    .map((b) => ({ ...b, savingPence: b.quantity * unitPence - b.pricePence }));
}
