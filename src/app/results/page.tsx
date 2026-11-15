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
import Link from 'next/link';
import { finishedCompetitions } from '@/lib/public/queries';
import { formatUkShort } from '@/lib/time';
import { FairDrawLink } from '@/components/SiteFooter';
import { ShieldCheck } from '@/components/icons';
import { PrizePlaceholder } from '@/components/illustrations';

export const metadata = { title: 'Results' };

export default async function ResultsPage() {
  const rows = await finishedCompetitions();
  const now = new Date();
  return (
    <div className="results-page">
      <div className="results-head">
        <h1>Results</h1>
        <p className="results-lede">Every finished draw, with a record you can re-run.</p>
        <p className="results-fairdraw"><FairDrawLink icon /></p>
      </div>
      {rows.length === 0 ? <p className="empty-state">No competitions have closed yet.</p> : (
        <ul className="result-list">
          {rows.map(({ c, d, winners }) => {
            const img = c.images[0];
            const drawn = Boolean(d.randomness);
            return (
              <li key={c.id} className="result-card">
                <span className="result-thumb">{img ? <img src={img.url} alt="" width={96} height={96} loading="lazy" /> : <PrizePlaceholder />}</span>
                <div className="result-info">
                  <h2 className="result-title"><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h2>
                  <p className="result-winner num">
                    {drawn
                      ? winners.length
                        ? `Winning ticket${winners.length === 1 ? '' : 's'} ${winners.map((w) => `${w.ticket}${w.name ? ` (${w.name})` : ''}`).join(', ')}`
                        : 'No entries'
                      : 'Awaiting draw'}
                  </p>
                  {/* Short facts as chips; the exact scheduled and actual times, to the second, are on the draw record. */}
                  <dl className="result-facts num">
                    <div className="chip chip-glass"><dt>Sold</dt><dd>{d.ticketsSold.toLocaleString('en-GB')} of {d.maxTickets.toLocaleString('en-GB')}</dd></div>
                    {d.drawnAt ? (
                      <div className="chip chip-glass"><dt>Drawn</dt><dd><time dateTime={d.drawnAt.toISOString()}>{formatUkShort(d.drawnAt, now)}</time></dd></div>
                    ) : (
                      <div className="chip chip-glass"><dt>Draw</dt><dd><time dateTime={d.scheduledDrawAt.toISOString()}>{formatUkShort(d.scheduledDrawAt, now)}</time></dd></div>
                    )}
                  </dl>
                </div>
                <div className="result-actions">
                  {drawn ? (
                    <>
                      <Link className="button sm" href={`/draws/${c.slug}`}><ShieldCheck size={18} />Verify</Link>
                      <a href={`/draws/${c.slug}/record.json`}>Record</a>
                    </>
                  ) : (
                    <a href={`/draws/${c.slug}/commitment.json`}>Commitment</a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="results-fairdraw is-foot"><FairDrawLink icon /></p>
    </div>
  );
}
