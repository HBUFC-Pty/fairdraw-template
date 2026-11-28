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
import type { draws } from '@/lib/db/schema';
import type { Competition } from '@/lib/public/queries';
import { bundleOffers } from '@/lib/competitions/bundles';
import { formatPence, formatPriceShort, moneyAsPoints } from '@/lib/money';
import { formatUk, formatUkShort } from '@/lib/time';
import { DrawnWhateverSold, formatPercent, percentSold, progressClass, ticketsLeft } from '../CompetitionFacts';
import { cardBadges } from '../badges';
import { Countdown } from '../Countdown';
import { FairDrawLink } from '../SiteFooter';
import { Bolt, Calendar, Clock, Envelope, Info, ShieldCheck, Trophy, Users } from '../icons';
import { QuantityStepper } from './QuantityStepper';
import { LiveDraw } from './LiveDraw';
import { plannedRound } from '@/lib/competitions/planned-round';
import { exclusionsSentence, type Exclusions } from '@/lib/public/exclusions';

export type Draw = typeof draws.$inferSelect;
export type Winner = { position: number; ticket: number; name: string | null };
type FormAction = (fd: FormData) => void | Promise<void>;

/** The exact text of the instant win credit card notice (DCMS code clause 1.3). Shown on every instant win competition. */
export const INSTANT_WIN_CARD_NOTICE = 'This is an instant win prize draw: credit cards cannot be used to enter it. Debit cards and free postal entry are fine.';

const CHIP: Record<string, string> = {
  'Ending soon': 'chip-accent',
  'Almost sold out': 'chip-primary',
  'Sold out': 'chip-muted',
  New: 'chip-success',
  'Coming soon': 'chip-glass',
};

export function statusLabel(c: Competition, open: boolean, now: Date): string {
  if (c.status === 'live') return c.opensAt > now ? 'Opening soon' : open ? 'Open' : 'Closing';
  return c.status === 'closed' ? 'Closed, awaiting draw' : 'Drawn';
}
const STATUS_CHIP: Record<string, string> = {
  Open: 'chip-success',
  'Opening soon': 'chip-glass',
  Closing: 'chip-accent',
  'Closed, awaiting draw': 'chip-muted',
  Drawn: 'chip-primary',
};

/** Small square facts: an icon, a value and a short label. */
export function FactTiles({ items, className = '' }: { items: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }[]; className?: string }) {
  return (
    <dl className={`fact-tiles ${className}`.trim()}>
      {items.map((f) => (
        <div className="fact-tile" key={f.label}>
          <dt><span className="fact-icon">{f.icon}</span>{f.label}</dt>
          <dd>
            <span className="fact-value num">{f.value}</span>
            {f.sub ? <span className="fact-sub">{f.sub}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SoldBar({ sold, max, finished }: { sold: number; max: number; finished: boolean }) {
  const soldOut = sold >= max;
  return (
    <div className="buy-sold">
      <div className="sold-bar is-lg" aria-hidden="true"><span className={progressClass(sold, max)} /></div>
      <p className="buy-meta num">
        {soldOut ? <span>Sold out</span> : (
          <>
            <span>{formatPercent(percentSold(sold, max))}% sold</span>
            <span className="muted">
              {finished ? `${sold.toLocaleString('en-GB')} of ${max.toLocaleString('en-GB')}` : `${ticketsLeft(sold, max).toLocaleString('en-GB')} left`}
            </span>
          </>
        )}
        <span className="sr-only">: {sold.toLocaleString('en-GB')} of {max.toLocaleString('en-GB')} tickets sold</span>
      </p>
    </div>
  );
}

/** The entry form. Same action and field names as before (competitionId, slug, quick, quantity, numbers, answer). */
export function EntryForm({ c, action }: { c: Competition; action: FormAction }) {
  const offers = bundleOffers(c.ticketPricePence, c.bundles).filter((b) => b.quantity <= c.perPersonCap);
  const dips = [5, 10, 25].filter((n) => n <= c.perPersonCap);
  return (
    <form className="entry-form" action={action}>
      <input type="hidden" name="competitionId" value={c.id} />
      <input type="hidden" name="slug" value={c.slug} />
      {offers.length ? (
        <div className="pick-group" role="group" aria-labelledby="bundles-label">
          <p className="micro-label" id="bundles-label">Bundles</p>
          <div className="pick-row">
            {offers.map((b) => (
              <button key={b.quantity} type="submit" name="quick" value={b.quantity} className="secondary pick is-bundle">
                <span className="num">{b.quantity} for {formatPriceShort(b.pricePence)}</span>
                <span className="pick-save num">Save {formatPriceShort(b.savingPence)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {dips.length ? (
        <div className="pick-group is-inline" role="group" aria-labelledby="dip-label">
          <p className="micro-label" id="dip-label">Lucky dip <span className="micro-note">random numbers</span></p>
          <div className="pick-row">
            {dips.map((n) => (
              <button key={n} type="submit" name="quick" value={n} className="secondary pick">
                <span className="num">{n}</span><span className="sr-only"> tickets, numbers picked at random</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {c.instantPrizes.length ? null : (
        <details className="own-numbers">
          <summary>Choose your own numbers</summary>
          <label>
            Your numbers (optional)
            <span className="hint">Leave blank and we will pick unsold numbers at random. Or list one number per ticket, between 1 and {c.maxTickets}, separated by commas.</span>
            <input name="numbers" inputMode="numeric" pattern="[0-9, ]*" autoComplete="off" />
          </label>
        </details>
      )}
      {c.skillQuestion ? (
        <fieldset className="answers">
          <legend>{c.skillQuestion.question}</legend>
          <span className="hint">Entries with a wrong answer are not entered into the draw and are refunded after the close.</span>
          <div className="answer-list">
            {c.skillQuestion.options.map((o, i) => (
              <label key={o} className="answer"><input type="radio" name="answer" value={i} required /> <span>{o}</span></label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <QuantityStepper
        cap={c.perPersonCap}
        unitPence={c.ticketPricePence}
        bundles={c.bundles}
        points={moneyAsPoints()}
        note={c.instantPrizes.length ? 'Numbers are always picked at random in this competition, because it has instant prizes.' : undefined}
      >
        <button type="submit" className="lg buy-cta">Add to basket</button>
      </QuantityStepper>
    </form>
  );
}

/** A drawn competition: the winning ticket numbers, both draw times and the ways to check the draw. */
function ResultPanel({ c, draw, winners, exclusions }: { c: Competition; draw: Draw; winners: Winner[]; exclusions: Exclusions | null }) {
  const named = winners.filter((w) => w.name);
  const leftOut = exclusions ? exclusionsSentence(exclusions) : null;
  return (
    <section className="buy-result" aria-labelledby="result">
      <h2 className="micro-label" id="result">Winning ticket{winners.length === 1 ? '' : 's'}</h2>
      {winners.length ? (
        <p className="win-tickets num">{winners.map((w) => w.ticket).join(', ')}</p>
      ) : (
        <p className="win-none">No entries, so no winner</p>
      )}
      {named.length ? <p className="win-names">{named.map((w) => `Ticket ${w.ticket}: ${w.name}`).join(', ')}</p> : null}
      {leftOut ? <p className="buy-left-out">{leftOut} <a href={`/draws/${c.slug}/excluded.json`}>Details (JSON)</a></p> : null}
      <FactTiles
        className="is-two"
        items={[
          { icon: <Calendar size={16} />, label: 'Scheduled draw', value: formatUkShort(draw.scheduledDrawAt), sub: formatUk(draw.scheduledDrawAt, true) },
          { icon: <Clock size={16} />, label: 'Actual draw', value: draw.drawnAt ? formatUkShort(draw.drawnAt) : 'Not yet', sub: draw.drawnAt ? formatUk(draw.drawnAt, true) : null },
        ]}
      />
      <Link className="button lg buy-cta" href={`/draws/${c.slug}`}><ShieldCheck size={20} />Verify this draw</Link>
      <ul className="link-row">
        <li><a href={`/draws/${c.slug}/record.json`}>Draw record (JSON)</a></li>
        <li><a href={`/draws/${c.slug}/tickets.txt`}>Ticket list</a></li>
        <li><a href={`/draws/${c.slug}/excluded.json`}>Tickets left out</a></li>
        <li><Link href={`/competitions/${c.slug}/entries`}>Entry list</Link></li>
      </ul>
      <p className="buy-fairdraw"><FairDrawLink icon /></p>
    </section>
  );
}

/** Closed, awaiting the draw: the commitment, in its original words, with its three links. */
function CommitmentPanel({ c, draw, exclusions }: { c: Competition; draw: Draw; exclusions: Exclusions | null }) {
  const planned = plannedRound(c.closesAt, c.drawAt);
  const leftOut = exclusions ? exclusionsSentence(exclusions) : null;
  return (
    <section className="buy-commitment" aria-labelledby="commitment">
      <h2 id="commitment" className="panel-title">Closed: the draw is committed</h2>
      <p>
        The list of {draw.ticketsSold} tickets was frozen at {formatUk(new Date(draw.closeUnix * 1000), true)} and its fingerprint published. The
        winner will be picked with drand round {draw.drandRound}, which does not exist until {formatUk(draw.scheduledDrawAt, true)}, so nobody,
        including us, can know the result before then.
      </p>
      {planned && planned.round !== draw.drandRound ? (
        <p>
          Before the close this page named drand round {planned.round}. The competition could only be closed at{' '}
          {formatUk(new Date(draw.closeUnix * 1000), true)}, less than 30 seconds before its draw time, so the rules moved the draw to round{' '}
          {draw.drandRound}, the first at least 30 seconds after the close. It still did not exist when the list was frozen.
        </p>
      ) : null}
      {leftOut ? <p>{leftOut}</p> : null}
      <LiveDraw slug={c.slug} drawAt={draw.scheduledDrawAt.toISOString()} round={draw.drandRound} fallback={`Draw ${formatUk(draw.scheduledDrawAt, true)}`} />
      <ul className="link-row">
        <li><a href={`/draws/${c.slug}/commitment.json`}>Commitment (JSON)</a></li>
        <li><a href={`/draws/${c.slug}/tickets.txt`}>Frozen ticket list</a></li>
        <li><a href={`/draws/${c.slug}/excluded.json`}>Tickets left out</a></li>
        <li><Link href={`/competitions/${c.slug}/entries`}>Entry list</Link></li>
      </ul>
    </section>
  );
}

type BuyBoxProps = {
  c: Competition;
  sold: number;
  draw: Draw | null;
  winners: Winner[];
  /** Tickets left out of the committed list, once closed (src/lib/public/exclusions.ts). */
  exclusions?: Exclusions | null;
  now: Date;
  open: boolean;
  loggedIn: boolean;
  badges: boolean;
  action: FormAction;
};

/**
 * On a live competition: which drand round will decide the draw, fixed now by the advertised draw time
 * (src/lib/competitions/planned-round.ts), so players can see the randomness was chosen before anyone bought a ticket.
 */
export function DrawPlan({ c }: { c: Competition }) {
  const planned = plannedRound(c.closesAt, c.drawAt);
  return (
    <p className="buy-plan">
      <ShieldCheck size={20} />
      {planned ? (
        <span>
          Fixed in advance: the winner will be picked with drand round <span className="num">{planned.round}</span>, which is published at{' '}
          {formatUk(planned.publishedAt, true)}. Nobody, including us, can know or choose its randomness before then.{' '}
          <a href="#checks">How the draw works</a>
        </span>
      ) : (
        <span>
          The winner will be picked with the first drand round at least 30 seconds after the close, named when the ticket list is frozen and
          published, before its randomness exists. <a href="#checks">How the draw works</a>
        </span>
      )}
    </p>
  );
}

/**
 * The buy box: status, title, price, the real close time, the exact share sold, key facts and the entry form. For a
 * drawn competition it becomes the result panel; once closed, the commitment panel. `buy-head` and `buy-body` are
 * separate so that on phones the title can sit above the image and the rest below it.
 */
export function BuyBox({ c, sold, draw, winners, exclusions = null, now, open, loggedIn, badges, action }: BuyBoxProps) {
  const status = statusLabel(c, open, now);
  const facts = badges && c.status === 'live' ? cardBadges(c, sold, now).filter((b) => b !== 'Coming soon') : [];
  const notOpen = c.status === 'live' && c.opensAt > now;
  const live = c.status === 'live';
  const drawn = c.status === 'drawn' && draw ? draw : null;
  return (
    <div className="buybox">
      <div className="buy-head">
        <div className="chip-row buy-chips">
          <span className={`chip chip-status ${STATUS_CHIP[status] ?? 'chip-glass'}`}>{status}</span>
          {facts.map((b) => (
            <span key={b} className={`chip ${CHIP[b] ?? 'chip-glass'}`}>{b === 'Ending soon' ? <span className="live-dot" aria-hidden="true" /> : null}{b}</span>
          ))}
          {c.instantPrizes.length ? <span className="chip chip-glass"><Bolt className="ic-primary" />Instant wins</span> : null}
        </div>
        <h1 className="comp-title">{c.title}</h1>
      </div>
      <div className="buy-body">
        {drawn ? <ResultPanel c={c} draw={drawn} winners={winners} exclusions={exclusions} /> : null}
        <div className="buy-price">
          <p className="price-row">
            <span className="price-num num">{formatPence(c.ticketPricePence)}</span>
            <span className="price-per">per ticket</span>
          </p>
          <p className="price-value">Prize value <span className="num">{formatPence(c.prizeValuePence)}</span></p>
        </div>

        {live ? (
          <div className="buy-count">
            <p className="micro-label">{notOpen ? 'Opens in' : 'Closes in'}</p>
            {notOpen ? (
              <Countdown to={c.opensAt.toISOString()} label="Opens in" variant="segments" fallback={`Opens ${formatUkShort(c.opensAt, now)}`} />
            ) : (
              <Countdown to={c.closesAt.toISOString()} label="Closes in" variant="segments" fallback={`Closes ${formatUkShort(c.closesAt, now)}`} />
            )}
          </div>
        ) : null}

        <SoldBar sold={sold} max={c.maxTickets} finished={!live} />

        {drawn ? null : (
          <FactTiles
            items={[
              { icon: <Users size={16} />, label: 'Max per person', value: c.perPersonCap.toLocaleString('en-GB') },
              { icon: <Calendar size={16} />, label: 'Draw', value: formatUkShort(c.drawAt, now) },
              { icon: <Trophy size={16} />, label: 'Winners', value: c.winnerCount.toLocaleString('en-GB') },
            ]}
          />
        )}

        {c.status === 'closed' && draw ? <CommitmentPanel c={c} draw={draw} exclusions={exclusions} /> : null}

        {c.isInstantWin ? <p className="notice has-icon"><Info size={20} /><span>{INSTANT_WIN_CARD_NOTICE}</span></p> : null}

        {live ? (
          notOpen ? (
            <p className="buy-note">Entries open {formatUk(c.opensAt)}.</p>
          ) : !open ? null : loggedIn ? (
            <EntryForm c={c} action={action} />
          ) : (
            <div className="buy-auth">
              <div className="buy-auth-buttons">
                <Link className="button secondary lg" href="/login">Log in</Link>
                <Link className="button lg" href="/signup">Sign up</Link>
              </div>
              <p className="micro-hint">Log in to enter. 18+ only.</p>
            </div>
          )
        ) : null}

        {live ? (
          <p className="buy-free">
            <Envelope size={20} />
            <span>Free entry by post: same chance, same cap. <a href="#free-entry">How to enter free</a></span>
          </p>
        ) : null}

        <div className="buy-statement">
          <ShieldCheck size={20} />
          <DrawnWhateverSold c={c} />
        </div>
        {live ? <DrawPlan c={c} /> : null}
        {live ? <p className="buy-entries"><Link href={`/competitions/${c.slug}/entries`}>See the entry list</Link></p> : null}
      </div>
    </div>
  );
}
