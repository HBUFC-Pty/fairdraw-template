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
import { eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { competitions, draws } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { capWarning } from '@/lib/competitions/service';
import { activeCount } from '@/lib/competitions/queries';
import { FlashMessage } from '@/components/Flash';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import { CompetitionForm } from '../../CompetitionForm';
import { cancelDraftAction, publishAction, updateTextAction } from '../../actions';

export const metadata = { title: 'Competition' };

export default async function AdminCompetition({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff(PERMISSIONS.competitions);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [c] = await getDb().select().from(competitions).where(eq(competitions.id, id));
  if (!c) notFound();
  const [d] = await getDb().select().from(draws).where(eq(draws.competitionId, id));
  const warn = capWarning(c);
  const rtp = c.prizeValuePence / (c.ticketPricePence * c.maxTickets);
  return (
    <>
      <h1>{c.title}</h1>
      <FlashMessage searchParams={await searchParams} />
      <p><span className={`badge ${c.status}`}>{c.status}</span> {c.status !== 'draft' ? <Link href={`/competitions/${c.slug}`}>View public page</Link> : null}</p>
      {warn ? <p className="notice warn">{warn}</p> : null}
      {rtp < 0.6 ? (
        <p className="notice warn">
          Prize value is {(rtp * 100).toFixed(0)}% of the maximum takings ({formatPence(c.ticketPricePence * c.maxTickets)}). FairDraw gives full marks for return
          to players at 60% or more.
        </p>
      ) : null}
      <p>Sold: {await activeCount(getDb(), c.id)} of {c.maxTickets}. Closes {formatUk(c.closesAt)}. Draw {formatUk(c.drawAt)}.</p>
      {d ? (
        <p>
          Committed {formatUk(d.committedAt, true)}: {d.ticketsSold} tickets, hash <code>{d.entriesHash}</code>, drand round {d.drandRound}.{' '}
          {d.drawnAt ? `Drawn ${formatUk(d.drawnAt, true)}: winning ticket(s) ${d.winningTickets?.join(', ') || 'none'}.` : 'Awaiting the draw.'}
        </p>
      ) : null}

      {c.status === 'draft' ? (
        <>
          <h2>Edit draft</h2>
          <CompetitionForm c={c} />
          <h2>Publish</h2>
          <form className="stack" action={publishAction}>
            <input type="hidden" name="id" value={c.id} />
            <label><input type="checkbox" name="confirm" value="yes" required /> I confirm the price, maximum, per-person cap, prize value, question and times are final. They cannot be changed after publishing, and the competition will be drawn at the advertised time whatever sells.</label>
            <button type="submit">Publish</button>
          </form>
          <form action={cancelDraftAction}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" className="secondary">Cancel this draft</button>
          </form>
        </>
      ) : c.status === 'live' ? (
        <>
          <p><Link href={`/admin/competitions/${c.id}/postal`}>Record postal entries</Link></p>
          <h2>Edit description</h2>
          <p className="muted">Only the summary, description and images can change after publishing.</p>
          <form className="stack" action={updateTextAction}>
            <input type="hidden" name="id" value={c.id} />
            <label>Summary<input name="summary" maxLength={300} defaultValue={c.summary} /></label>
            <label>Prize description<textarea name="prizeDescription" rows={6} maxLength={5000} defaultValue={c.prizeDescription} /></label>
            <label>Images (URL | alt text)<textarea name="images" rows={3} defaultValue={c.images.map((i) => `${i.url} | ${i.alt}`).join('\n')} /></label>
            <button type="submit">Save</button>
          </form>
        </>
      ) : null}
    </>
  );
}
