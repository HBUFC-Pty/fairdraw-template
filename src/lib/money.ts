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
import { env } from './env';

/**
 * Demo sites (DEMO_MODE) show every amount as points, one point per penny, so no price looks like real money and no
 * prize looks like something to claim. Amounts are still stored and checked in pence, exactly as on a real site.
 */
export function moneyAsPoints(): boolean {
  return env().DEMO_MODE;
}

/** "pounds", or "points" on a demo site: for labels such as "New limit in pounds". */
export function moneyUnit(): 'pounds' | 'points' {
  return moneyAsPoints() ? 'points' : 'pounds';
}

/** "£0", or "0 points" on a demo site. */
export function zeroAmount(): string {
  return moneyAsPoints() ? '0 points' : '£0';
}

export function formatPence(pence: number): string {
  if (moneyAsPoints()) return `${new Intl.NumberFormat('en-GB').format(pence)} ${Math.abs(pence) === 1 ? 'point' : 'points'}`;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

/** Parse "12.50" or "12" (pounds) into pence, or on a demo site "1200" (points, one per penny). Rejects anything else. */
export function parsePounds(input: string): number {
  if (moneyAsPoints()) {
    const p = /^\s*(\d{1,9})\s*(?:points?|pts?)?\s*$/i.exec(input);
    if (!p) throw new Error('enter a whole number of points, for example 500');
    return Number(p[1]);
  }
  const m = /^\s*£?\s*(\d{1,7})(?:\.(\d{1,2}))?\s*$/.exec(input);
  if (!m) throw new Error('enter an amount in pounds, for example 2.50');
  return Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'));
}
