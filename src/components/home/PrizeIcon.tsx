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
/**
 * Simple art for instant prize tiers, picked by the tier's value rank within its competition: a coin for the lowest,
 * a gem for the middle, a star burst for the top. Token colours only (classes in stage.css). Stage 4 may redraw them.
 */
export function PrizeIcon({ rank, id }: { rank: 0 | 1 | 2; id: string }) {
  const grad = `pi-${id}`;
  return (
    <svg className={`prize-icon rank-${rank}`} width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="stop-primary" />
          <stop offset="1" className="stop-accent" />
        </linearGradient>
      </defs>
      {rank === 0 ? (
        <>
          <circle cx="28" cy="28" r="20" fill={`url(#${grad})`} />
          <circle cx="28" cy="28" r="14" fill="none" className="pi-line" strokeWidth="2" />
          <path d="M24 22h8M28 22v12M24 34h8" className="pi-line" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      ) : rank === 1 ? (
        <>
          <path d="M16 12h24l8 12-20 22L8 24z" fill={`url(#${grad})`} />
          <path d="M8 24h40M20 12l-4 12 12 22 12-22-4-12M16 24l12-12 12 12" className="pi-line" strokeWidth="1.75" strokeLinejoin="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M28 4l5.5 13.5L48 20l-11 9.5L40.5 44 28 36.5 15.5 44 19 29.5 8 20l14.5-2.5z" fill={`url(#${grad})`} />
          <path d="M28 14l3 8 8 1-6 5 2 8-7-4.5-7 4.5 2-8-6-5 8-1z" className="pi-line" strokeWidth="1.75" strokeLinejoin="round" fill="none" />
        </>
      )}
    </svg>
  );
}
