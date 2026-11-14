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
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import type { Competition } from '@/lib/public/queries';
import { progressClass } from './CompetitionFacts';
import { Countdown } from './Countdown';
import { brand } from '@/brand';

export type CardStyle = 'classic' | 'compact' | 'poster';

const DAY = 24 * 3600_000;

/**
 * Factual badges for brands with extras.badges: nothing invented, every badge follows from the competition's own times
 * and ticket counts. "Ending soon" within 24 hours of the close, "Almost sold out" from 80% of the maximum.
 */
export function cardBadges(c: { opensAt: Date; closesAt: Date; maxTickets: number }, sold: number, now: Date): string[] {
  if (now < c.opensAt) return ['Coming soon'];
  const out: string[] = [];
  if (sold >= c.maxTickets) out.push('Sold out');
  else if (sold >= c.maxTickets * 0.8) out.push('Almost sold out');
  if (c.closesAt.getTime() - now.getTime() <= DAY && now < c.closesAt) out.push('Ending soon');
  if (now.getTime() - c.opensAt.getTime() <= DAY) out.push('New');
  return out;
}

function Extras({ c, sold, now }: { c: Competition; sold: number; now: Date }) {
  const badges = brand.extras.badges ? cardBadges(c, sold, now) : [];
  return (
    <>
      {badges.length ? (
        <p className="badges">
          {badges.map((b) => <span key={b} className="badge-pill">{b}</span>)}
        </p>
      ) : null}
      {brand.extras.countdown && c.opensAt <= now ? <Countdown to={c.closesAt.toISOString()} label="Closes in" /> : null}
    </>
  );
}

/** A live competition in a list. Three structural styles, chosen by brand.layout.card. */
export function CompetitionCard({ c, sold, style, now }: { c: Competition; sold: number; style: CardStyle; now: Date }) {
  const img = c.images[0];
  const when = c.opensAt > now ? `Opens ${formatUk(c.opensAt)}.` : `Closes ${formatUk(c.closesAt)}.`;
  const progress = (
    <>
      <div className="progress" aria-hidden="true"><span className={progressClass(sold, c.maxTickets)} /></div>
      <p className="muted num">{sold.toLocaleString('en-GB')} of {c.maxTickets.toLocaleString('en-GB')} sold. Max {c.perPersonCap} per person.</p>
    </>
  );
  if (style === 'compact') {
    return (
      <article className="card comp-card compact">
        {img ? <img src={img.url} alt={img.alt} loading="lazy" /> : <span />}
        <div>
          <h3><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h3>
          <p>{formatPence(c.ticketPricePence)} a ticket. {when}</p>
          <Extras c={c} sold={sold} now={now} />
          {progress}
        </div>
      </article>
    );
  }
  if (style === 'poster') {
    return (
      <article className="card comp-card poster">
        {img ? <img src={img.url} alt={img.alt} loading="lazy" /> : null}
        <div className="poster-body">
          <h3><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h3>
          <p>{c.summary}</p>
          <p>{formatPence(c.ticketPricePence)} a ticket. {when}</p>
        </div>
        <div className="card">
          <Extras c={c} sold={sold} now={now} />
          {progress}
        </div>
      </article>
    );
  }
  return (
    <article className="card comp-card classic">
      {img ? <img src={img.url} alt={img.alt} loading="lazy" /> : null}
      <h3><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h3>
      <p className="muted">{c.summary}</p>
      <p>{formatPence(c.ticketPricePence)} a ticket. {when}</p>
      <Extras c={c} sold={sold} now={now} />
      {progress}
    </article>
  );
}
