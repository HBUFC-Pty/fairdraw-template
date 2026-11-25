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
import { formatUk, formatUkShort } from '@/lib/time';
import type { publicInstant } from '@/lib/public/instant';
import { progressClass } from './CompetitionFacts';
import { InstantPrizeArt } from './illustrations';

type Instant = NonNullable<Awaited<ReturnType<typeof publicInstant>>>;

/** Art for a tier by its value rank in the competition: coin for the lowest, gem for the middle, star for the top. */
export function tierRank(values: readonly number[], value: number): 0 | 1 | 2 {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const pos = sorted.indexOf(value);
  return sorted.length === 1 || pos === sorted.length - 1 ? 2 : pos === 0 ? 0 : 1;
}

/**
 * The instant prizes on a competition page: a tile per prize with the real count left, the tickets that have won so
 * far, and (in a closed panel) how the commitment keeps it honest, in its original words.
 */
export function InstantPrizes({ slug, inst }: { slug: string; inst: Instant }) {
  const values = inst.tiers.map((t) => t.valuePence);
  return (
    <div className="iw">
      <ul className="iw-grid">
        {inst.tiers.map((t, i) => {
          const left = Math.max(0, t.count - t.won);
          return (
            <li key={`${t.title}-${i}`} className={`iw-tile${left === 0 ? ' is-gone' : ''}`}>
              <span className="iw-art"><InstantPrizeArt rank={tierRank(values, t.valuePence)} id={`iw${i}`} /></span>
              <span className="iw-value num">{formatPriceShort(t.valuePence)}</span>
              <span className="iw-title">{t.title}</span>
              <span className="iw-left num">
                {inst.closed ? `${t.won.toLocaleString('en-GB')} of ${t.count.toLocaleString('en-GB')} won` : `${left.toLocaleString('en-GB')} of ${t.count.toLocaleString('en-GB')} left`}
              </span>
              <span className="iw-bar" aria-hidden="true"><span className={progressClass(t.won, t.count)} /></span>
              {left === 0 ? <span className="iw-gone"><span className="chip chip-glass">All won</span></span> : null}
            </li>
          );
        })}
      </ul>
      {inst.won.length ? (
        <div className="iw-won">
          <h3 className="micro-label">Won so far</h3>
          <ul className="won-chips">
            {inst.won.map((w) => (
              <li key={`${w.ticket}-${w.wonAt.toISOString()}`} className="won-chip num">
                Ticket {w.ticket} · {formatPriceShort(w.valuePence)} · {formatUkShort(w.wonAt)}
                <span className="sr-only"> ({w.title}, {formatUk(w.wonAt)})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <details className="sub-panel">
        <summary>How instant wins are checked</summary>
        <p>
          These prizes are fixed to ticket numbers chosen at random when the competition opened. If a ticket you buy (or a free postal entry) has one of
          those numbers, you win that prize straight away. Numbers are always given out at random here, so nobody can pick a winning one.
        </p>
        <p className="muted">
          Commitment, published {formatUk(inst.committedAt, true)} before any ticket was sold: <code className="hash">{inst.commit}</code>.{' '}
          {inst.closed
            ? <>The full list and its salt are now published, so you can check it: <a href={`/draws/${slug}/instant-wins.json`}>instant-wins.json</a>.</>
            : <>The full list of winning numbers and the salt are published at the close, so anyone can check that no prize was moved or held back.</>}
        </p>
      </details>
    </div>
  );
}
