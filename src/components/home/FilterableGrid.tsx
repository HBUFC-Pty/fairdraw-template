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
'use client';

import { useState, useSyncExternalStore } from 'react';
import { FILTER_LABELS, type FilterKey } from './filter-labels';
import { hydration } from './motion';

/**
 * The live tile grid with factual filter pills (All, Ending soon, Instant wins, New). The server renders the pills
 * disabled, so their space is taken from the first paint (no layout shift); they turn on once the page is running.
 * They set data-filter on the grid and CSS hides the tiles that do not match (home.css). A pill whose count is 0 is
 * not shown.
 */
export function FilterableGrid({ counts, children }: { counts: Record<FilterKey, number>; children?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(hydration.subscribe, hydration.client, hydration.server);
  const [filter, setFilter] = useState<FilterKey>('all');
  const keys = (Object.keys(FILTER_LABELS) as FilterKey[]).filter((k) => k === 'all' || counts[k] > 0);
  return (
    <>
      {keys.length > 1 ? (
        <div className="filter-pills" role="group" aria-label="Filter competitions">
          {keys.map((k) => (
            <button key={k} type="button" className="bare pill" aria-pressed={filter === k} disabled={!hydrated} onClick={() => setFilter(k)}>
              {FILTER_LABELS[k]}
              <span className="pill-count num">{counts[k]}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="tile-grid" data-filter={filter}>
        {children}
      </div>
    </>
  );
}
