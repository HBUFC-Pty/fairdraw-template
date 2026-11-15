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
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import type { Competition } from '@/lib/public/queries';

/**
 * The share of tickets sold, rounded down to one decimal place (46.29% is 46.2), so it never shows more than was sold.
 * Integer maths first, so 57 of 100 is exactly 57.
 */
export function percentSold(sold: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1000, Math.max(0, Math.floor((sold * 1000) / max))) / 10;
}

/** "3.5" under 10%, whole numbers from 10% ("46"). Never rounds up. */
export function formatPercent(percent: number): string {
  return percent < 10 && !Number.isInteger(percent) ? percent.toFixed(1) : String(Math.floor(percent));
}

export function ticketsLeft(sold: number, max: number): number {
  return Math.max(0, max - sold);
}

/** The width class for a sold bar (src/app/styles/progress.css): pc0 to pc100, rounded down. */
export function progressClass(sold: number, max: number) {
  return `pc${Math.floor(percentSold(sold, max))}`;
}

export function CompetitionFacts({ c, sold }: { c: Competition; sold: number }) {
  return (
    <dl className="facts">
      <dt>Ticket price</dt>
      <dd>{formatPence(c.ticketPricePence)}</dd>
      <dt>Tickets sold</dt>
      <dd className="num">{sold.toLocaleString('en-GB')} of {c.maxTickets.toLocaleString('en-GB')}</dd>
      <dt>Maximum per person</dt>
      <dd>{c.perPersonCap.toLocaleString('en-GB')} tickets (paid and free entries together)</dd>
      <dt>Prize value</dt>
      <dd>{formatPence(c.prizeValuePence)}</dd>
      <dt>Closes</dt>
      <dd>{formatUk(c.closesAt)}</dd>
      <dt>Draw</dt>
      <dd>{formatUk(c.drawAt)}</dd>
      <dt>Winners</dt>
      <dd>{c.winnerCount}</dd>
    </dl>
  );
}

export function DrawnWhateverSold({ c }: { c: Competition }) {
  return (
    <p>
      <strong>This competition will be drawn on {formatUk(c.drawAt)} for the full prize, however many tickets are sold.</strong> We never extend the
      closing date, roll the prize over or swap it for a smaller one.
    </p>
  );
}
