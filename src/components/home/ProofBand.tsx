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
import type { SiteStats } from '@/lib/public/home';
import { FairDrawLink } from '../SiteFooter';
import { ProofArt } from '../illustrations';
import { CountUp } from './CountUp';

/** "Every draw can be checked": exact counts from the database (no "+", no totals of money) and the way to check. */
export function ProofBand({ stats }: { stats: SiteStats }) {
  const tiles = [
    { label: 'Draws made', value: stats.drawsMade },
    { label: 'Instant prizes won', value: stats.instantWon },
    { label: 'Live now', value: stats.liveNow },
  ].filter((t) => t.value > 0);
  return (
    <section className="home-section proof" aria-labelledby="proof-title">
      <div className="proof-art" aria-hidden="true">
        <ProofArt id="proof" />
      </div>
      <div className="proof-body">
        <h2 id="proof-title">Every draw can be checked</h2>
        {tiles.length ? (
          <dl className="stats">
            {tiles.map((t) => (
              <div key={t.label} className="stat">
                <dt>{t.label}</dt>
                <dd><CountUp value={t.value} /></dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="proof-actions">
          <Link className="button" href="/results">Check a draw</Link>
          <FairDrawLink icon />
        </p>
      </div>
    </section>
  );
}
