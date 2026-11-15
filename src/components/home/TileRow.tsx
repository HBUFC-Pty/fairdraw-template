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
import type { Competition } from '@/lib/public/queries';
import { TileCard } from '../CompetitionCard';
import { SnapRow } from './SnapRow';

/** A titled, horizontally scrolling row of tiles (the "Ending soon" row). */
export function TileRow({ id, title, items, now }: { id: string; title: string; items: { c: Competition; sold: number }[]; now: Date }) {
  return (
    <section className="home-section" aria-labelledby={id}>
      <div className="section-head">
        <h2 id={id}>{title}</h2>
      </div>
      <SnapRow label={title} className="tile-row">
        {items.map(({ c, sold }) => <TileCard key={c.id} c={c} sold={sold} now={now} />)}
      </SnapRow>
    </section>
  );
}
