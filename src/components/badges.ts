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
 * Factual card badges and the home page filter flags. Pure functions with no imports, so client components can use
 * them without pulling the brand files into the browser bundle.
 */
const DAY = 24 * 3600_000;

/**
 * Factual badges for brands with extras.badges: nothing invented, every badge follows from the competition's own times
 * and ticket counts. "Ending soon" within 24 hours of the close, "Almost sold out" from 80% of the maximum.
 */
export function cardBadges(c: { opensAt: Date; closesAt: Date; maxTickets: number }, sold: number, now: Date): string[] {
  if (now < c.opensAt) return ['Coming soon'];
  const out: string[] = [];
  if (sold >= c.maxTickets) out.push('Sold out');
  else if (sold >= c.maxTickets * 0.8) out.push('Almost sold out');
  if (c.closesAt.getTime() - now.getTime() <= DAY && now < c.closesAt) out.push('Ending soon');
  if (now.getTime() - c.opensAt.getTime() <= DAY) out.push('New');
  return out;
}

/**
 * Which home page filters a competition matches (the showcase filter pills): the same 24 hour rules as cardBadges,
 * so a filter count always equals the number of tiles it shows.
 */
export function filterFlags(c: { opensAt: Date; closesAt: Date; maxTickets: number; instantPrizes: unknown[] }, sold: number, now: Date) {
  const badges = cardBadges(c, sold, now);
  return { ending: badges.includes('Ending soon'), instant: c.instantPrizes.length > 0, new: badges.includes('New') };
}
