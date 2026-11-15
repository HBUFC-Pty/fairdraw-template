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
import type { Competition } from '@/lib/public/queries';
import { formatUkShort } from '@/lib/time';
import { Countdown } from '../Countdown';
import { Calendar } from '../icons';

/** The next draw due (a real draw time), with a countdown to it and a link to how the draw is checked. */
export function NextDraw({ c, now }: { c: Competition; now: Date }) {
  const when = formatUkShort(c.drawAt, now);
  return (
    <section className="home-section next-draw" aria-labelledby="next-title">
      <div className="nd-copy">
        <p className="eyebrow"><span className="live-dot" aria-hidden="true" />Next draw</p>
        <h2 id="next-title" className="nd-title"><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h2>
        <p className="nd-when"><Calendar className="ic-primary" />{when}</p>
      </div>
      <div className="nd-side">
        <Countdown to={c.drawAt.toISOString()} variant="segments" label="Draws in" fallback={`Draws ${when}`} />
        <Link className="button secondary" href="/fairness">How it is checked</Link>
      </div>
    </section>
  );
}
