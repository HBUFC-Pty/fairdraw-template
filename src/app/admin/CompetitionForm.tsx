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
import { toUkLocalInput } from '@/lib/time';
import type { competitions } from '@/lib/db/schema';
import { saveCompetitionAction } from './actions';
import { moneyAsPoints, moneyUnit } from '@/lib/money';

type C = typeof competitions.$inferSelect;

const pounds = (p: number) => (p / 100).toFixed(2);

/** Create or edit a draft. Once published, the terms and times below are fixed by the database. */
export function CompetitionForm({ c }: { c?: C }) {
  const now = new Date();
  const close = new Date(now.getTime() + 7 * 86400_000);
  return (
    <form className="stack" action={saveCompetitionAction}>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <label>Title<input name="title" required maxLength={120} defaultValue={c?.title} /></label>
      <label>Web address (slug)<span className="hint">Lower-case letters, numbers and hyphens. Fixed once published.</span><input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} defaultValue={c?.slug} /></label>
      <label>Summary<input name="summary" maxLength={300} defaultValue={c?.summary} /></label>
      <label>Prize description<textarea name="prizeDescription" required rows={6} maxLength={5000} defaultValue={c?.prizeDescription} /></label>
      <label>Prize value or cash alternative (£)<span className="hint">Shown to players. FairDraw measures return to players as total prize value divided by price times maximum tickets: 60% or more earns full marks.</span><input name="prizeValue" required inputMode="decimal" defaultValue={c ? pounds(c.prizeValuePence) : ''} /></label>
      <label>Images<span className="hint">One per line: URL | alt text. URLs must start with / (files in /public) or https:// (hosts listed in IMAGE_HOSTS).</span>
        <textarea name="images" rows={3} defaultValue={c?.images.map((i) => `${i.url} | ${i.alt}`).join('\n')} />
      </label>
      <label>Ticket price (£)<input name="ticketPrice" required inputMode="decimal" defaultValue={c ? pounds(c.ticketPricePence) : ''} /></label>
      <label>Maximum tickets<input name="maxTickets" type="number" min={1} max={10000000} required defaultValue={c?.maxTickets} /></label>
      <label>Maximum per person<span className="hint">Applies to paid and free entries together. Keep it at 10% of the maximum or less: FairDraw gives full marks only then.</span><input name="perPersonCap" type="number" min={1} required defaultValue={c?.perPersonCap} /></label>
      <label>Number of winners<input name="winnerCount" type="number" min={1} max={100} defaultValue={c?.winnerCount ?? 1} /></label>
      <label>Opens (UK time)<input name="opensAt" type="datetime-local" required defaultValue={toUkLocalInput(c?.opensAt ?? now)} /></label>
      <label>Closes (UK time)<input name="closesAt" type="datetime-local" required defaultValue={toUkLocalInput(c?.closesAt ?? close)} /></label>
      <label>Draw (UK time)<span className="hint">At or after the close. The draw happens at this time whatever sells: no extensions.</span><input name="drawAt" type="datetime-local" required defaultValue={toUkLocalInput(c?.drawAt ?? close)} /></label>
      <fieldset>
        <legend>Question (optional)</legend>
        <label>Question<input name="question" maxLength={300} defaultValue={c?.skillQuestion?.question} /></label>
        <label>Answers, one per line<textarea name="options" rows={4} defaultValue={c?.skillQuestion?.options.join('\n')} /></label>
        <label>Number of the correct answer (1 for the first line)<input name="correct" type="number" min={1} max={6} defaultValue={c?.skillQuestion ? c.skillQuestion.correctIndex + 1 : ''} /></label>
      </fieldset>
      <fieldset>
        <legend>Instant prizes (optional)</legend>
        <label>
          One line per prize: how many, the prize, its value in {moneyUnit()}
          <span className="hint">For example &quot;5 | £10 voucher | 10&quot;. Each prize is fixed to a ticket number chosen at random when you publish, and the numbers are committed publicly before anything is sold. Ticket numbers are then always given out at random. Fixed once published.</span>
          <textarea name="instantPrizes" rows={4} defaultValue={c?.instantPrizes.map((t) => `${t.count} | ${t.title} | ${moneyAsPoints() ? t.valuePence : (t.valuePence / 100).toFixed(2)}`).join('\n')} />
        </label>
        <label>
          How players reveal an instant win
          <select name="instantReveal" defaultValue={c?.instantReveal ?? 'scratch'}>
            <option value="scratch">Scratch card</option>
            <option value="spin">Prize wheel</option>
            <option value="coin">Coin drop</option>
          </select>
        </label>
      </fieldset>
      <label>
        <input type="checkbox" name="isInstantWin" value="yes" defaultChecked={c?.isInstantWin} /> This is an instant win prize draw
        <span className="hint">Credit card payments are refused for instant win prize draws (DCMS code clause 1.3). Fixed once published.</span>
      </label>
      <button type="submit">Save draft</button>
    </form>
  );
}
