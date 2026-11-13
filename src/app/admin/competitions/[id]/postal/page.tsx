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
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { competitions, postalEntries } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { FlashMessage } from '@/components/Flash';
import { formatUk, toUkLocalInput } from '@/lib/time';
import { postalEntryAction } from '../../../actions';

export const metadata = { title: 'Postal entries' };

export default async function PostalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff(PERMISSIONS.postal);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [c] = await getDb().select().from(competitions).where(eq(competitions.id, id));
  if (!c) notFound();
  const entries = await getDb().select({ id: postalEntries.id, status: postalEntries.status, reason: postalEntries.rejectionReason, receivedAt: postalEntries.receivedAt }).from(postalEntries).where(eq(postalEntries.competitionId, id)).orderBy(desc(postalEntries.createdAt)).limit(200);
  return (
    <>
      <h1>Postal entries: {c.title}</h1>
      <FlashMessage searchParams={await searchParams} />
      <p>
        Record every postal entry that arrives before the close. Each valid entry gets a ticket number at random, with the same chance as a paid ticket,
        and counts towards the same per-person cap of {c.perPersonCap} (matched by email). Record every envelope, including ones you must reject, so the count is complete.
      </p>
      {c.status === 'live' ? (
        <form className="stack" action={postalEntryAction}>
          <input type="hidden" name="competitionId" value={c.id} />
          <label>Full name<input name="fullName" required maxLength={120} /></label>
          <label>Email<input name="email" type="email" required maxLength={254} /></label>
          <label>Postal address<textarea name="postalAddress" required rows={3} maxLength={500} /></label>
          {c.skillQuestion ? (
            <label>Answer given ({c.skillQuestion.question})
              <select name="answer" required defaultValue="">
                <option value="" disabled>Choose</option>
                {c.skillQuestion.options.map((o, i) => <option key={o} value={i + 1}>{o}</option>)}
              </select>
            </label>
          ) : null}
          <label>Received (UK time)<input name="receivedAt" type="datetime-local" required defaultValue={toUkLocalInput(new Date())} /></label>
          <button type="submit">Record entry</button>
        </form>
      ) : <p>This competition is {c.status}; no more entries can be recorded.</p>}
      <h2>Recorded ({entries.length})</h2>
      <ul>{entries.map((e) => <li key={e.id}>{formatUk(e.receivedAt)}: {e.status}{e.reason ? ` (${e.reason})` : ''}</li>)}</ul>
    </>
  );
}
