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
import type { RecentWin } from '@/lib/public/home';
import { formatAgo } from '@/lib/time';
import { ArrowRight, Bolt, Trophy } from '../icons';
import { Marquee } from './Marquee';

/**
 * Recent winners, from real draw results and real instant wins. A main draw winner's name shows only with their
 * consent; otherwise, and for every instant win, only the ticket number.
 */
export function WinnersMarquee({ wins, now, motion }: { wins: RecentWin[]; now: Date; motion: boolean }) {
  if (!wins.length) return null;
  const items = wins.map((w, i) => (
    <li key={`${w.kind}-${w.slug}-${w.ticket}-${i}`} className="win">
      <span className={`win-disc is-${w.kind}`} aria-hidden="true">{w.kind === 'draw' ? <Trophy /> : <Bolt />}</span>
      <span className="win-text">
        <Link className="win-line" href={`/competitions/${w.slug}`}>
          {w.name ?? `Ticket ${w.ticket}`} won {w.prize}
        </Link>
        <span className="win-time">{w.kind === 'draw' ? 'Main draw' : 'Instant win'}, {formatAgo(w.at, now)}</span>
      </span>
    </li>
  ));
  return (
    <section className="home-section" aria-labelledby="winners-title">
      <div className="section-head">
        <h2 id="winners-title">Recent winners</h2>
        <Link className="section-link" href="/results">All results<ArrowRight /></Link>
      </div>
      <Marquee label="Recent winners" moving={motion && wins.length >= 4} count={wins.length}>{items}</Marquee>
    </section>
  );
}
