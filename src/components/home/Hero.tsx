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
import { formatPriceShort } from '@/lib/money';
import { formatUkShort } from '@/lib/time';
import { TEMPLATE_REPO_URL } from '@/lib/demo';
import type { Competition } from '@/lib/public/queries';
import { cardBadges } from '../CompetitionCard';
import { formatPercent, percentSold, progressClass, ticketsLeft } from '../CompetitionFacts';
import { Countdown } from '../Countdown';
import { Bolt, Clock, Sparkle } from '../icons';
import { HeroCarousel, type HeroSlide } from './HeroCarousel';

const MAX_SLIDES = 5;

const CHIP: Record<string, string> = {
  'Ending soon': 'chip-accent',
  'Almost sold out': 'chip-primary',
  'Sold out': 'chip-muted',
  New: 'chip-success',
  'Coming soon': 'chip-glass',
};

/** Three decorative stars around the hero art (they twinkle under [data-motion], motion.css). */
function Sparkles() {
  return (
    <span className="sparkles" aria-hidden="true">
      <Sparkle className="spark s1" />
      <Sparkle className="spark s2" />
      <Sparkle className="spark s3" />
    </span>
  );
}

function PrizeSlide({ c, sold, now, badges }: { c: Competition; sold: number; now: Date; badges: boolean }) {
  const img = c.images[0];
  const href = `/competitions/${c.slug}`;
  const chips = (badges ? cardBadges(c, sold, now) : []).map((b) => (
    <span key={b} className={`chip ${CHIP[b] ?? 'chip-glass'}`}>
      {b === 'Ending soon' ? <span className="live-dot" aria-hidden="true" /> : null}
      {b}
    </span>
  ));
  if (c.instantPrizes.length) chips.push(<span key="instant" className="chip chip-glass"><Bolt className="ic-primary" />Instant wins</span>);
  const soldOut = sold >= c.maxTickets;
  const closes = formatUkShort(c.closesAt, now);
  return (
    <div className="hero-inner">
      <div className="hero-copy">
        {chips.length ? <div className="chip-row hero-chips">{chips.slice(0, 3)}</div> : null}
        <h2 className="hero-title">{c.title}</h2>
        <div className="hero-price-row">
          <p className="hero-price">
            <span className="hero-price-num num">{formatPriceShort(c.ticketPricePence)}</span>
            <span className="hero-per">per ticket</span>
          </p>
          <span className="chip chip-glass hero-count-pill">
            <Clock />
            <Countdown to={c.closesAt.toISOString()} variant="compact" fallback={closes} />
          </span>
        </div>
        <div className="hero-count">
          <p className="hero-label">Closes in</p>
          <Countdown to={c.closesAt.toISOString()} variant="segments" fallback={`Closes ${closes}`} />
        </div>
        <div className="hero-sold">
          <div className="sold-bar is-lg" aria-hidden="true"><span className={progressClass(sold, c.maxTickets)} /></div>
          <p className="hero-meta num">
            {soldOut ? 'Sold out' : <>{formatPercent(percentSold(sold, c.maxTickets))}% sold <span aria-hidden="true">·</span> {ticketsLeft(sold, c.maxTickets).toLocaleString('en-GB')} left</>}
          </p>
        </div>
        <p className="hero-actions">
          <Link className="button lg hero-cta" href={href}>Enter now<span className="sr-only">: {c.title}</span></Link>
          <Link className="button secondary lg hero-details" href={`${href}#prize`}>Details<span className="sr-only">: {c.title}</span></Link>
        </p>
      </div>
      <div className="hero-art">
        <div className="hero-frame">
          <div className="hero-frame-inner">
            {img ? <img src={img.url} alt={img.alt} width={600} height={600} fetchPriority="high" /> : null}
          </div>
        </div>
        <Sparkles />
      </div>
    </div>
  );
}

function IntroSlide() {
  return (
    <div className="hero-inner is-intro">
      <div className="hero-copy">
        <p className="eyebrow">Template demo</p>
        <h2 className="hero-title">Prize draws anyone can check</h2>
        <p className="hero-lede">Sign up with made-up details, pay with the test card, then check the draw.</p>
        <p className="hero-actions">
          <Link className="button lg hero-cta" href="/signup">Try it as a player</Link>
          <a className="button secondary lg" href={TEMPLATE_REPO_URL}>Get the template</a>
        </p>
      </div>
      <div className="hero-art">
        <img className="hero-stage" src="/images/stage-tickets.svg" alt="" width={800} height={800} />
        <Sparkles />
      </div>
    </div>
  );
}

function EmptySlide() {
  return (
    <div className="hero-inner is-empty">
      <div className="hero-copy">
        <h2 className="hero-title">No competitions are open right now</h2>
        <p className="hero-actions"><Link className="button lg" href="/results">See results</Link></p>
      </div>
    </div>
  );
}

/**
 * The showcase hero band. Demo sites open with the intro slide; then live competitions
 * that are open, soonest close first, up to five slides in all.
 */
export function Hero({
  live,
  now,
  demo,
  siteName,
  badges,
  autoplay,
}: {
  live: { c: Competition; sold: number }[];
  now: Date;
  demo: boolean;
  siteName: string;
  badges: boolean;
  autoplay: boolean;
}) {
  const slides: HeroSlide[] = [];
  if (demo) slides.push({ key: 'intro', node: <IntroSlide /> });
  const open = live.filter(({ c }) => c.opensAt <= now && now < c.closesAt).sort((a, b) => a.c.closesAt.getTime() - b.c.closesAt.getTime());
  for (const { c, sold } of open.slice(0, MAX_SLIDES - slides.length)) slides.push({ key: c.id, node: <PrizeSlide c={c} sold={sold} now={now} badges={badges} /> });
  if (slides.length === (demo ? 1 : 0)) slides.push({ key: 'empty', node: <EmptySlide /> });
  return (
    <div className="hero-band bleed">
      {/* Always present: the slide holding a visible title may be hidden when the carousel moves on. */}
      <h1 className="sr-only">{siteName}: live competitions</h1>
      <HeroCarousel slides={slides} autoplay={autoplay} label="Featured prizes" />
    </div>
  );
}
