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
import { fairdrawRoundAfter, fairdrawRoundTime } from '../fairdraw/draw';

/**
 * The drand round that will decide a competition's draw, known from the moment the competition is published.
 *
 * The close (src/lib/draw/service.ts) commits to fairdrawRoundAfter(close, max(30, draw time minus close)), and the
 * database checks it (drizzle/0004). Whenever the close happens at least 30 seconds before the advertised draw time,
 * close plus wait is exactly the draw time, so the round depends on the advertised draw time alone: it is the same
 * whether the competition closes on time, a little late (the worker runs once a minute) or early because it sold out.
 * Showing it while entries are open lets players see the randomness was fixed before anyone bought a ticket.
 *
 * When the draw time is less than PLANNED_ROUND_MIN_GAP_S after the close, the actual close moment can still move the
 * round, so no number is promised: the page says the round is published with the frozen list at the close instead.
 */
export const PLANNED_ROUND_MIN_GAP_S = 120;

export type PlannedRound = { round: number; publishedAt: Date };

export function plannedRound(closesAt: Date, drawAt: Date): PlannedRound | null {
  const closeUnix = Math.floor(closesAt.getTime() / 1000);
  const drawUnix = Math.ceil(drawAt.getTime() / 1000);
  if (drawUnix - closeUnix < PLANNED_ROUND_MIN_GAP_S) return null;
  // The same arithmetic as closeCompetition(), with the advertised close in place of the actual one.
  const round = fairdrawRoundAfter(closeUnix, Math.max(30, drawUnix - closeUnix));
  return { round, publishedAt: new Date(fairdrawRoundTime(round) * 1000) };
}
