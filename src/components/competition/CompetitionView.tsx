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
import type { ReactNode } from 'react';
import type { Competition } from '@/lib/public/queries';
import type { publicInstant } from '@/lib/public/instant';
import { formatUk } from '@/lib/time';
import { CompetitionFacts } from '../CompetitionFacts';
import { InstantPrizes } from '../InstantPrizes';
import { ChevronDown } from '../icons';
import { PostalEntryArt } from '../illustrations';
import { BuyBox, type Draw, type Winner } from './BuyBox';
import type { Exclusions } from '@/lib/public/exclusions';
import { plannedRound } from '@/lib/competitions/planned-round';
import { Gallery } from './Gallery';
import { SectionNav } from './SectionNav';

type Instant = NonNullable<Awaited<ReturnType<typeof publicInstant>>>;

export type CompetitionViewProps = {
  c: Competition;
  sold: number;
  draw: Draw | null;
  winners: Winner[];
  /** Tickets left out of the committed list, once closed. */
  exclusions?: Exclusions | null;
  inst: Instant | null;
  now: Date;
  open: boolean;
  loggedIn: boolean;
  /** brand.extras.badges */
  badges: boolean;
  postalAddress: string;
  promoter: string;
  action: (fd: FormData) => void | Promise<void>;
};

/**
 * A collapsible section with a heading row and a chevron. The heading sits outside the <summary> (some screen readers
 * flatten a summary's content, which would drop the heading from heading navigation); the summary covers the whole
 * heading row, so the row still opens and closes the section. Works without JavaScript.
 */
function Panel({ id, title, open = false, children }: { id: string; title: string; open?: boolean; children: ReactNode }) {
  return (
    <section className="panel" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-heading">{title}</h2>
      <details className="panel-details" open={open}>
        <summary className="panel-toggle">
          <span className="sr-only">Show or hide {title.toLowerCase()}</span>
          <ChevronDown className="panel-chevron" />
        </summary>
        <div className="panel-body">{children}</div>
      </details>
    </section>
  );
}

/**
 * The free entry route, in its original words. Always a plain, open section (never inside a closed panel): the same
 * chance and the same cap as a paid entry.
 */
export function FreeEntry({ c, postalAddress }: { c: Competition; postalAddress: string }) {
  return (
    <section className="free-entry" id="free-entry" aria-labelledby="free-entry-title">
      <span className="free-entry-art" aria-hidden="true"><PostalEntryArt id="postal" /></span>
      <div>
        <h2 id="free-entry-title" className="panel-title">Free entry</h2>
        {c.status === 'live' ? (
          <p>
            <strong>Free entry:</strong> you can enter for free by post, with exactly the same chance of winning as a paid entry. Send your full name,
            address, email, phone number{c.skillQuestion ? ' and your answer' : ''} to {postalAddress}, to arrive before the close. One entry per
            envelope. <Link href="/free-entry">Free entry details</Link>.
          </p>
        ) : (
          <p>
            <strong>Free entry:</strong> free postal entries were accepted until the close, with exactly the same chance of winning as a paid entry
            and the same per-person maximum. <Link href="/free-entry">Free entry details</Link>.
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * How the winner is decided, in order: the round fixed in advance, the list frozen at the close, the draw at the
 * advertised time. Shown on every competition, live or finished.
 */
function HowDecided({ c }: { c: Competition }) {
  const planned = plannedRound(c.closesAt, c.drawAt);
  return (
    <ol className="how-decided">
      <li>
        {planned
          ? `The randomness is fixed before anyone buys a ticket: the draw uses drand round ${planned.round}, published at ${formatUk(planned.publishedAt, true)}. drand is a public randomness network run by independent organisations, so nobody, including us, can know or choose that number in advance.`
          : 'The draw uses the first drand round at least 30 seconds after the close, named when the ticket list is frozen. drand is a public randomness network run by independent organisations, so nobody, including us, can know or choose that number in advance.'}
      </li>
      <li>At the close the list of tickets in the draw is frozen and its fingerprint published, together with the round, before the randomness exists.</li>
      <li>At the draw time the winner is picked from the frozen list with that round&apos;s randomness, and the record lets anyone re-run the draw.</li>
    </ol>
  );
}

/** The competition page body (src/app/competitions/[slug]/page.tsx loads the data). Every preset uses this layout. */
export function CompetitionView(p: CompetitionViewProps) {
  const { c, sold, draw, inst, postalAddress, promoter } = p;
  const nav = [
    { id: 'prize', label: 'Prize' },
    ...(inst ? [{ id: 'instant', label: 'Instant wins' }] : []),
    { id: 'checks', label: 'Draw and checks' },
    { id: 'free-entry', label: 'Free entry' },
    { id: 'terms', label: 'Terms' },
  ];
  return (
    <article className="comp-page">
      <div className="comp-layout">
        <div className="comp-gallery">
          <Gallery images={c.images} />
        </div>
        <BuyBox c={c} sold={sold} draw={draw} winners={p.winners} exclusions={p.exclusions ?? null} now={p.now} open={p.open} loggedIn={p.loggedIn} badges={p.badges} action={p.action} />
        <div className="comp-main">
          <SectionNav items={nav} />
          <div className="comp-sections">
            <Panel id="prize" title="Prize" open>
              {c.summary ? <p className="prize-summary">{c.summary}</p> : null}
              <p className="prize">{c.prizeDescription}</p>
            </Panel>
            {inst ? (
              <Panel id="instant" title="Instant wins" open>
                <InstantPrizes slug={c.slug} inst={inst} />
              </Panel>
            ) : null}
            <Panel id="checks" title="Draw and checks">
              <CompetitionFacts c={c} sold={sold} />
              <HowDecided c={c} />
              {draw && c.status === 'drawn' ? (
                <dl className="facts">
                  <dt>Scheduled draw</dt><dd>{formatUk(draw.scheduledDrawAt, true)}</dd>
                  <dt>Actual draw</dt><dd>{formatUk(draw.drawnAt, true)}</dd>
                </dl>
              ) : null}
              <ul className="link-row">
                <li><Link href={`/competitions/${c.slug}/entries`}>Entry list</Link></li>
                <li><Link href="/fairness">How our draws work</Link></li>
                {draw ? <li><a href={`/draws/${c.slug}/commitment.json`}>Commitment (JSON)</a></li> : null}
                {draw ? <li><a href={`/draws/${c.slug}/tickets.txt`}>Ticket list</a></li> : null}
                {draw?.randomness ? <li><a href={`/draws/${c.slug}/record.json`}>Draw record (JSON)</a></li> : null}
                {draw?.randomness ? <li><Link href={`/draws/${c.slug}`}>Verify this draw</Link></li> : null}
              </ul>
            </Panel>
            <FreeEntry c={c} postalAddress={postalAddress} />
            <p className="comp-terms muted" id="terms">
              Promoter: {promoter}. Full <Link href="/terms">terms</Link> apply. 18+ only. Play responsibly: <Link href="/responsible-play">support and limits</Link>.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
