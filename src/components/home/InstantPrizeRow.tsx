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
import { formatPriceShort } from '@/lib/money';
import type { InstantPrizeTile } from '@/lib/public/home';
import { progressClass } from '../CompetitionFacts';
import { Bolt } from '../icons';
import { InstantPrizeArt } from '../illustrations';
import { SnapRow } from './SnapRow';

/** Instant prizes still to be won in live competitions, with real counts (count minus won). */
export function InstantPrizeRow({ tiles }: { tiles: InstantPrizeTile[] }) {
  const open = tiles.filter((t) => t.left > 0);
  if (!open.length) return null;
  const left = open.reduce((s, t) => s + t.left, 0);
  return (
    <section className="home-section band bleed" aria-labelledby="instant-title">
      <div className="section-head">
        <h2 id="instant-title">Instant prizes</h2>
        <span className="chip chip-glass count-chip is-label num"><Bolt className="ic-primary" />{left.toLocaleString('en-GB')} left to win</span>
      </div>
      <SnapRow label="Instant prizes" className="iprize-row">
        {open.map((t, i) => (
          <a key={`${t.slug}-${t.title}-${i}`} className="iprize" href={`/competitions/${t.slug}#instant`}>
            <span className="iprize-art"><InstantPrizeArt rank={t.rank} id={`row${i}`} /></span>
            <span className="iprize-value num">{formatPriceShort(t.valuePence)}</span>
            <span className="iprize-left num">{t.left.toLocaleString('en-GB')} of {t.count.toLocaleString('en-GB')} left</span>
            <span className="iprize-comp">{t.competition}</span>
            <span className="iprize-line" aria-hidden="true"><span className={progressClass(t.won, t.count)} /></span>
          </a>
        ))}
      </SnapRow>
    </section>
  );
}
