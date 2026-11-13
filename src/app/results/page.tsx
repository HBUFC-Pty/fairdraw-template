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
import { formatUk } from '@/lib/time';
import { FairDrawLink } from '@/components/SiteFooter';

export const metadata = { title: 'Results' };

export default async function ResultsPage() {
  const rows = await finishedCompetitions();
  return (
    <>
      <h1>Results</h1>
      <p>
        Every finished competition, with tickets sold, the maximum, the winning tickets and both the scheduled and actual draw times. Each draw has a
        public record you can re-run. <FairDrawLink />.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Competition</th><th scope="col">Sold</th><th scope="col">Maximum</th><th scope="col">Winning ticket(s)</th>
              <th scope="col">Scheduled draw</th><th scope="col">Actual draw</th><th scope="col">Check it</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, d, winners }) => (
              <tr key={c.id}>
                <td><Link href={`/competitions/${c.slug}`}>{c.title}</Link></td>
                <td className="num">{d.ticketsSold}</td>
                <td className="num">{d.maxTickets}</td>
                <td>{d.randomness ? (winners.length ? winners.map((w) => `${w.ticket}${w.name ? ` (${w.name})` : ''}`).join(', ') : 'No entries') : 'Awaiting draw'}</td>
                <td>{formatUk(d.scheduledDrawAt, true)}</td>
                <td>{d.drawnAt ? formatUk(d.drawnAt, true) : 'not yet'}</td>
                <td>{d.randomness ? <><Link href={`/draws/${c.slug}`}>Verify</Link> · <a href={`/draws/${c.slug}/record.json`}>Record</a></> : <a href={`/draws/${c.slug}/commitment.json`}>Commitment</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p>No competitions have closed yet.</p> : null}
    </>
  );
}
