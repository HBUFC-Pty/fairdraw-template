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
/** The showcase home page's filter pills: which filters exist and how many live tiles each one shows. */
import { filterFlags } from '../CompetitionCard';

export type FilterKey = 'all' | 'ending' | 'instant' | 'new';
export const FILTER_LABELS: Record<FilterKey, string> = { all: 'All', ending: 'Ending soon', instant: 'Instant wins', new: 'New' };

type Item = { c: { opensAt: Date; closesAt: Date; maxTickets: number; instantPrizes: unknown[] }; sold: number };

/** Real counts from the same rules the tiles use (filterFlags, built on cardBadges). */
export function filterCounts(items: Item[], now: Date): Record<FilterKey, number> {
  const counts: Record<FilterKey, number> = { all: items.length, ending: 0, instant: 0, new: 0 };
  for (const { c, sold } of items) {
    const f = filterFlags(c, sold, now);
    if (f.ending) counts.ending++;
    if (f.instant) counts.instant++;
    if (f.new) counts.new++;
  }
  return counts;
}
