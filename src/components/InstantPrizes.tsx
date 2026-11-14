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
import type { publicInstant } from '@/lib/public/instant';

type Instant = NonNullable<Awaited<ReturnType<typeof publicInstant>>>;

/** The instant prizes on a competition page: what can be won, what has been, and the commitment that keeps it honest. */
export function InstantPrizes({ slug, inst }: { slug: string; inst: Instant }) {
  return (
    <section aria-labelledby="instant">
      <h2 id="instant">Instant prizes</h2>
      <p>
        These prizes are fixed to ticket numbers chosen at random when the competition opened. If a ticket you buy (or a free postal entry) has one of
        those numbers, you win that prize straight away. Numbers are always given out at random here, so nobody can pick a winning one.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Prize</th><th scope="col">Value</th><th scope="col">Won</th></tr></thead>
          <tbody>
            {inst.tiers.map((t) => (
              <tr key={t.title}><td>{t.title}</td><td className="num">{formatPence(t.valuePence)}</td><td className="num">{t.won} of {t.count}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {inst.won.length ? (
        <p>Won so far: {inst.won.map((w) => `ticket ${w.ticket} (${w.title}, ${formatUk(w.wonAt)})`).join('; ')}.</p>
      ) : null}
      <p className="muted">
        Commitment, published {formatUk(inst.committedAt, true)} before any ticket was sold: <code className="hash">{inst.commit}</code>.{' '}
        {inst.closed
          ? <>The full list and its salt are now published, so you can check it: <a href={`/draws/${slug}/instant-wins.json`}>instant-wins.json</a>.</>
          : <>The full list of winning numbers and the salt are published at the close, so anyone can check that no prize was moved or held back.</>}
      </p>
    </section>
  );
}
