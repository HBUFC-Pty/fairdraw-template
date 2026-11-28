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
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { tickets } from '../db/schema';

/**
 * Tickets that were entered but are not in the committed list, and why. A page that showed a higher count before the
 * close than the draw record shows after it then explains the gap instead of leaving players to guess (an audited
 * site's draw records once showed one or two fewer entries than its pages, with no reason given).
 *
 * - wrong answer: the ticket answered the competition question wrongly, so it was left out at the close and refunded
 *   (closeCompetition). Its number is listed: it never belonged to anyone else.
 * - refunded before the close: the order was refunded while the competition was live, so the ticket was released.
 *   Only the count is given, because a released number can be bought again by someone else.
 *
 * Unpaid reservations that lapsed were never entries, so they are not counted. Ticket numbers only, never a name.
 * The FairDraw draw record itself is unchanged (its format is fixed): this sits beside it.
 */
export type Exclusions = { wrongAnswer: number[]; refundedBeforeClose: number };

export async function exclusionsFor(db: Db, competitionId: string): Promise<Exclusions> {
  const wrong = await db
    .select({ n: tickets.number })
    .from(tickets)
    .where(and(eq(tickets.competitionId, competitionId), eq(tickets.status, 'ineligible')))
    .orderBy(asc(tickets.number));
  const [r] = await db
    .select({ c: sql<string>`count(*)` })
    .from(tickets)
    .where(and(eq(tickets.competitionId, competitionId), eq(tickets.status, 'refunded')));
  return { wrongAnswer: wrong.map((w) => w.n), refundedBeforeClose: Number(r?.c ?? 0) };
}

export function leftOutCount(x: Exclusions): number {
  return x.wrongAnswer.length + x.refundedBeforeClose;
}

/** One plain sentence for the commitment and result panels and the entry list, or null when nothing was left out. */
export function exclusionsSentence(x: Exclusions): string | null {
  const parts: string[] = [];
  const n = x.wrongAnswer.length;
  if (n) parts.push(`${n} ${n === 1 ? 'ticket' : 'tickets'} answered the question wrongly, so ${n === 1 ? 'it was' : 'they were'} left out and refunded`);
  const r = x.refundedBeforeClose;
  if (r) parts.push(`${r} ${r === 1 ? 'ticket was' : 'tickets were'} refunded before the close and released`);
  if (!parts.length) return null;
  return `Not in the draw: ${parts.join('; ')}.`;
}

/** The public JSON beside the draw record (/draws/[slug]/excluded.json). */
export function exclusionsJson(slug: string, ticketsInDraw: number, x: Exclusions) {
  return {
    competition: slug,
    tickets_in_draw: ticketsInDraw,
    left_out: {
      wrong_answer: { count: x.wrongAnswer.length, tickets: x.wrongAnswer, refunded: true },
      refunded_before_close: { count: x.refundedBeforeClose, released: true },
    },
    note: 'Tickets entered but not in the committed list, with the reason. Lapsed unpaid reservations were never entries and are not counted.',
  };
}
