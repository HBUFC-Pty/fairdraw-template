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
import type { Metadata } from 'next';
import { competitionBySlug } from '@/lib/public/queries';
import { CompetitionFacts, DrawnWhateverSold } from '@/components/CompetitionFacts';
import { FairDrawLink } from '@/components/SiteFooter';
import { FlashMessage } from '@/components/Flash';
import { currentSession } from '@/lib/web/session';
import { isOpen } from '@/lib/competitions/service';
import { formatUk } from '@/lib/time';
import { env } from '@/lib/env';
import { addToBasketAction } from '../../basket/actions';
import { publicInstant } from '@/lib/public/instant';
import { InstantPrizes } from '@/components/InstantPrizes';
import { bundleOffers } from '@/lib/competitions/bundles';
import { formatPence } from '@/lib/money';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await competitionBySlug((await params).slug);
  return { title: r?.c.title ?? 'Competition' };
}

export default async function CompetitionPage({ params, searchParams }: Props) {
  const r = await competitionBySlug((await params).slug);
  if (!r) notFound();
  const { c, draw, sold, winners } = r;
  const s = await currentSession();
  const inst = await publicInstant(c);
  const now = new Date();
  const open = isOpen(c, now);
  return (
    <article>
      <FlashMessage searchParams={await searchParams} />
      <p>
        <span className={`badge ${c.status}`}>{c.status === 'live' ? (c.opensAt > now ? 'Opening soon' : open ? 'Open' : 'Closing') : c.status === 'closed' ? 'Closed, awaiting draw' : 'Drawn'}</span>
      </p>
      <h1>{c.title}</h1>
      {c.summary ? <p className="muted">{c.summary}</p> : null}
      {c.images.map((img) => (
        <p className="hero" key={img.url}><img src={img.url} alt={img.alt} /></p>
      ))}
      <CompetitionFacts c={c} sold={sold} />
      {c.isInstantWin ? <p className="notice">This is an instant win prize draw: credit cards cannot be used to enter it. Debit cards and free postal entry are fine.</p> : null}
      <DrawnWhateverSold c={c} />

      <h2>The prize</h2>
      <p className="prize">{c.prizeDescription}</p>

      {c.status === 'drawn' && draw ? (
        <section aria-labelledby="result">
          <h2 id="result">Result</h2>
          <dl className="facts">
            <dt>Tickets sold</dt><dd className="num">{draw.ticketsSold} of {draw.maxTickets}</dd>
            <dt>Winning ticket{winners.length === 1 ? '' : 's'}</dt>
            <dd>{winners.length ? winners.map((w) => `${w.ticket}${w.name ? ` (${w.name})` : ''}`).join(', ') : 'No entries, so no winner'}</dd>
            <dt>Scheduled draw</dt><dd>{formatUk(draw.scheduledDrawAt, true)}</dd>
            <dt>Actual draw</dt><dd>{formatUk(draw.drawnAt, true)}</dd>
          </dl>
          <p>
            <Link href={`/draws/${c.slug}`}>Verify this draw</Link> · <a href={`/draws/${c.slug}/record.json`}>Draw record (JSON)</a> ·{' '}
            <a href={`/draws/${c.slug}/tickets.txt`}>Ticket list</a> · <Link href={`/competitions/${c.slug}/entries`}>Entry list</Link>
          </p>
          <p><FairDrawLink /></p>
        </section>
      ) : null}

      {inst ? <InstantPrizes slug={c.slug} inst={inst} /> : null}

      {c.status === 'closed' && draw ? (
        <section aria-labelledby="commitment">
          <h2 id="commitment">Closed: the draw is committed</h2>
          <p>
            The list of {draw.ticketsSold} tickets was frozen at {formatUk(new Date(draw.closeUnix * 1000), true)} and its fingerprint published. The
            winner will be picked with drand round {draw.drandRound}, which does not exist until {formatUk(draw.scheduledDrawAt, true)}, so nobody,
            including us, can know the result before then.
          </p>
          <p>
            <a href={`/draws/${c.slug}/commitment.json`}>Commitment (JSON)</a> · <a href={`/draws/${c.slug}/tickets.txt`}>Frozen ticket list</a> ·{' '}
            <Link href={`/competitions/${c.slug}/entries`}>Entry list</Link>
          </p>
        </section>
      ) : null}

      {c.status === 'live' ? (
        <section aria-labelledby="enter">
          <h2 id="enter">Enter</h2>
          {!open ? <p>Entries open {formatUk(c.opensAt)}.</p> : !s ? (
            <p><Link href="/login">Log in</Link> or <Link href="/signup">sign up</Link> to enter. You must be 18 or over.</p>
          ) : (
            <form className="stack" action={addToBasketAction}>
              <input type="hidden" name="competitionId" value={c.id} />
              <input type="hidden" name="slug" value={c.slug} />
              {c.bundles.length ? (
                <div className="bundle-offers">
                  <p><strong>Bundles</strong> <span className="muted">(you always pay the lowest price for the number of tickets you buy)</span></p>
                  <p className="quick-buttons">
                    {bundleOffers(c.ticketPricePence, c.bundles).filter((b) => b.quantity <= c.perPersonCap).map((b) => (
                      <button key={b.quantity} type="submit" name="quick" value={b.quantity} className="secondary">
                        {b.quantity} for {formatPence(b.pricePence)} <span className="muted">(save {formatPence(b.savingPence)})</span>
                      </button>
                    ))}
                  </p>
                </div>
              ) : null}
              <p className="quick-buttons" aria-label="Lucky dip">
                <span className="muted">Lucky dip, numbers picked at random:</span>
                {[5, 10, 25].filter((n) => n <= c.perPersonCap).map((n) => (
                  <button key={n} type="submit" name="quick" value={n} className="secondary">{n} tickets</button>
                ))}
              </p>
              <label>
                Number of tickets
                <span className="hint">Up to {c.perPersonCap} per person, including any free postal entries.</span>
                <input name="quantity" type="number" min={1} max={c.perPersonCap} defaultValue={1} required />
              </label>
              {c.instantPrizes.length ? (
                <p className="hint">Numbers are always picked at random in this competition, because it has instant prizes.</p>
              ) : (
                <label>
                  Choose your own numbers (optional)
                  <span className="hint">Leave blank and we will pick unsold numbers at random. Or list one number per ticket, between 1 and {c.maxTickets}, separated by commas.</span>
                  <input name="numbers" inputMode="numeric" pattern="[0-9, ]*" autoComplete="off" />
                </label>
              )}
              {c.skillQuestion ? (
                <fieldset>
                  <legend>{c.skillQuestion.question}</legend>
                  <span className="hint">Entries with a wrong answer are not entered into the draw and are refunded after the close.</span>
                  {c.skillQuestion.options.map((o, i) => (
                    <label key={o}><input type="radio" name="answer" value={i} required /> {o}</label>
                  ))}
                </fieldset>
              ) : null}
              <button type="submit">Add to basket</button>
            </form>
          )}
          <p>
            <strong>Free entry:</strong> you can enter for free by post, with exactly the same chance of winning as a paid entry. Send your full name,
            address, email, phone number{c.skillQuestion ? ' and your answer' : ''} to {env().POSTAL_ENTRY_ADDRESS}, to arrive before the close. One entry per
            envelope. <Link href="/free-entry">Free entry details</Link>.
          </p>
          <p><Link href={`/competitions/${c.slug}/entries`}>See the entry list</Link></p>
        </section>
      ) : null}
      <p className="muted">
        Promoter: {env().OPERATOR_LEGAL_NAME}. Full <Link href="/terms">terms</Link> apply. 18+ only. Play responsibly: <Link href="/responsible-play">support and limits</Link>.
      </p>
    </article>
  );
}
