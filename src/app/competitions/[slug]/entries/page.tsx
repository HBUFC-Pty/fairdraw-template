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
import { notFound } from 'next/navigation';
import { competitionBySlug, postalEntryCounts, publicEntryList } from '@/lib/public/queries';
import { getDb } from '@/lib/db';
import { exclusionsFor, exclusionsSentence } from '@/lib/public/exclusions';

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: 'Entry list' };

/** Public entry list: ticket numbers and codes only. Never add names here: see AGENTS.md. */
export default async function EntriesPage({ params }: Props) {
  const r = await competitionBySlug((await params).slug);
  if (!r) notFound();
  const list = await publicEntryList(r.c, r.draw?.ticketList ?? null);
  const free = list.filter((e) => e.free).length;
  const postal = await postalEntryCounts(r.c.id);
  const leftOut = r.draw ? exclusionsSentence(await exclusionsFor(getDb(), r.c.id)) : null;
  return (
    <>
      <h1>Entry list: {r.c.title}</h1>
      <p>
        {r.draw ? `The frozen list committed at the close: ${list.length} tickets.` : `${list.length} tickets so far.`} {free} of them are free postal entries,
        with exactly the same chance as paid entries. Each ticket shows a short code instead of a name; you can see your own codes in your account.
      </p>
      <p>
        Postal entries recorded: {postal.received}. Entered: {postal.accepted}.
        {postal.rejected.length ? <> Not entered: {postal.rejected.map((x) => `${x.n} (${x.reason.replace(/\.$/, '')})`).join('; ')}.</> : null} Every
        postal entrant is emailed their ticket and code, or the reason.
      </p>
      {leftOut ? (
        <p>
          {leftOut} <a href={`/draws/${r.c.slug}/excluded.json`}>Details (JSON)</a>
        </p>
      ) : null}
      <p><Link href={`/competitions/${r.c.slug}`}>Back to the competition</Link>{r.draw ? <> · <a href={`/draws/${r.c.slug}/tickets.txt`}>Plain ticket list</a></> : null}</p>
      <div className="table-wrap">
        <table>
          <caption className="muted">Ticket numbers and entry codes</caption>
          <thead><tr><th scope="col">Ticket</th><th scope="col">Entry code</th><th scope="col">Route</th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.ticket}><td className="num">{e.ticket}</td><td className="mono">{e.code}</td><td>{e.free ? 'Free (post)' : 'Paid'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
