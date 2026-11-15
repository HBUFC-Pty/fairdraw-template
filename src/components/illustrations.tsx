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
 * Small original illustrations for the stage look: the three "how it works" steps, the proof band art, the stand-in
 * for a prize with no image, the instant prize tiers (coin, gem, star burst) and the decorative rings behind the hero.
 *
 * Colours only through tokens: every fill and stroke is currentColor or a class in tokens.css (.il-*, .stop-*), so the
 * art follows the brand in light and dark. All of it is decorative (aria-hidden): the text beside it carries the
 * meaning. `id` props keep gradient ids unique on the page.
 */
import type { ReactNode } from 'react';

function Art({ className, size, view, children }: { className: string; size: number; view: number; children: ReactNode }) {
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${view} ${view}`} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** A two-stop brand gradient (primary into accent), diagonal by default. */
function Grad({ id, from = 'stop-primary', to = 'stop-accent', x2 = 1, y2 = 1 }: { id: string; from?: string; to?: string; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" className={from} />
      <stop offset="1" className={to} />
    </linearGradient>
  );
}

/** Ticket outline with a notch on each short side (x, y, width, height, notch radius, corner radius). */
function ticketPath(x: number, y: number, w: number, h: number, n: number, r: number) {
  const m = y + h / 2;
  return `M${x + r} ${y}H${x + w - r}a${r} ${r} 0 0 1 ${r} ${r}V${m - n}a${n} ${n} 0 0 0 0 ${2 * n}V${y + h - r}a${r} ${r} 0 0 1 -${r} ${r}H${x + r}a${r} ${r} 0 0 1 -${r} -${r}V${m + n}a${n} ${n} 0 0 0 0 -${2 * n}V${y + r}a${r} ${r} 0 0 1 ${r} -${r}z`;
}

const SHIELD = 'M24 5l15 6v10c0 10-6.4 17.6-15 21.5C15.4 38.6 9 31 9 21V11z';

/* ---------- How it works (drawn for a 72px ring; the art itself is 48 units square) ---------- */

/** Step 1: a hand picking the raised ticket from a fan of three. */
export function StepPick({ id }: { id: string }) {
  const g = `${id}-g`;
  return (
    <Art className="il il-step" size={48} view={48}>
      <defs><Grad id={g} /></defs>
      <g transform="rotate(-24 20 34)"><path d={ticketPath(6, 12, 24, 15, 2.6, 3)} className="il-soft il-line" strokeWidth="1.5" /></g>
      <g transform="rotate(20 24 34)"><path d={ticketPath(14, 12, 24, 15, 2.6, 3)} className="il-soft il-line" strokeWidth="1.5" /></g>
      <g transform="rotate(-4 22 20)">
        <path d={ticketPath(9, 6, 26, 16, 2.8, 3)} fill={`url(#${g})`} />
        <path d="M28 8.5v11" className="il-cut" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
      </g>
      <path
        d="M30.5 46v-6.5l-5.2-6.3a2 2 0 0 1 3-2.6l3.2 3.2V24.5a2.1 2.1 0 0 1 4.2 0v7.6l5 .9a3 3 0 0 1 2.5 3v3.4c0 3.5-2.4 6.6-5.9 6.6z"
        className="il-hand" strokeWidth="1.6" strokeLinejoin="round"
      />
    </Art>
  );
}

/** Step 2: a ticket, or an envelope for the free postal route. */
export function StepEnter({ id }: { id: string }) {
  const g = `${id}-g`;
  return (
    <Art className="il il-step" size={48} view={48}>
      <defs><Grad id={g} /></defs>
      <g transform="rotate(-8 18 26)">
        <rect x="4" y="16" width="28" height="20" rx="3" className="il-soft il-line" strokeWidth="1.6" />
        <path d="M5 18l13 9.5L31 18" className="il-line" fill="none" strokeWidth="1.6" strokeLinejoin="round" />
      </g>
      <g transform="rotate(14 32 24)">
        <path d={ticketPath(20, 14, 24, 15, 2.6, 3)} fill={`url(#${g})`} />
        <path d="M38 16.5v10" className="il-cut" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
      </g>
      <circle cx="40" cy="40" r="5" className="il-accent" />
      <path d="M40 37.5v5M37.5 40h5" className="il-on-accent" strokeWidth="1.6" strokeLinecap="round" />
    </Art>
  );
}

/** Step 3: the public randomness beacon over a shield with a tick. */
export function StepCheck({ id }: { id: string }) {
  const g = `${id}-g`;
  return (
    <Art className="il il-step" size={48} view={48}>
      <defs><Grad id={g} /></defs>
      <path d="M14 13a14 14 0 0 1 20 0M18 17a8.5 8.5 0 0 1 12 0" className="il-accent-line" fill="none" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="20.5" r="2" className="il-accent" />
      <path d="M24 22l12 4.6v7.6c0 7.4-5.1 12.6-12 15.4-6.9-2.8-12-8-12-15.4v-7.6z" transform="translate(0 -4)" fill={`url(#${g})`} />
      <path d="M18.5 31.5l3.8 3.8 7.4-7.6" className="il-cut" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </Art>
  );
}

/* ---------- Proof band: a shield with a tick, beacon arcs, dice and stars (160 units) ---------- */

export function ProofArt({ id }: { id: string }) {
  const g = `${id}-g`;
  const h = `${id}-h`;
  return (
    <Art className="il il-proof" size={160} view={160}>
      <defs>
        <Grad id={g} />
        <radialGradient id={h} cx="50%" cy="50%" r="50%">
          <stop offset="0" className="stop-primary" stopOpacity="0.4" />
          <stop offset="1" className="stop-primary" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="86" r="74" fill={`url(#${h})`} />
      <circle cx="80" cy="86" r="66" className="il-ring" strokeWidth="1.5" />
      <circle cx="80" cy="86" r="52" className="il-ring is-accent" strokeWidth="1.5" strokeDasharray="3 7" />
      <g className="il-accent-line" fill="none" strokeWidth="3.5" strokeLinecap="round">
        <path d="M52 34a40 40 0 0 1 56 0" className="il-wave w3" />
        <path d="M61 43a27 27 0 0 1 38 0" className="il-wave w2" />
        <path d="M70 52a14 14 0 0 1 20 0" className="il-wave w1" />
      </g>
      <circle cx="80" cy="60" r="4" className="il-accent" />
      <g transform="translate(32 54) scale(2)">
        <path d={SHIELD} className="il-shadow" transform="translate(0.8 1.6)" />
        <path d={SHIELD} fill={`url(#${g})`} />
        <path d="M24 9l11.5 4.6v7.8c0 7.6-4.8 13.6-11.5 16.8" className="il-gloss" fill="none" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M17 23.5l5 5 9-9.5" className="il-cut" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="rotate(16 128 124)">
        <rect x="114" y="110" width="28" height="28" rx="6" className="il-surface il-line" strokeWidth="2" />
        <circle cx="121.5" cy="117.5" r="2.4" className="il-accent" />
        <circle cx="128" cy="124" r="2.4" className="il-accent" />
        <circle cx="134.5" cy="130.5" r="2.4" className="il-accent" />
      </g>
      <path className="il-spark spark s1" d="M24 30c1.2 7 3.6 9.4 10.6 10.6C27.6 41.8 25.2 44.2 24 51.2 22.8 44.2 20.4 41.8 13.4 40.6 20.4 39.4 22.8 37 24 30z" />
      <path className="il-spark is-accent spark s2" d="M132 34c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7z" />
      <path className="il-spark spark s3" d="M30 120c.6 3.4 1.8 4.6 5.2 5.2-3.4.6-4.6 1.8-5.2 5.2-.6-3.4-1.8-4.6-5.2-5.2 3.4-.6 4.6-1.8 5.2-5.2z" />
    </Art>
  );
}

/* ---------- Free entry by post: an envelope with a ticket inside and a stamp (96 units) ---------- */

export function PostalEntryArt({ id }: { id: string }) {
  const g = `${id}-g`;
  return (
    <Art className="il il-postal" size={96} view={96}>
      <defs><Grad id={g} /></defs>
      <ellipse cx="48" cy="86" rx="34" ry="5" className="il-floor" />
      <g transform="rotate(-8 48 30)">
        <path d={ticketPath(22, 14, 50, 30, 4.5, 5)} fill={`url(#${g})`} />
        <path d="M60 18.5v21" className="il-cut" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
        <path d="M30 24h20M30 31h13" className="il-cut" strokeWidth="2.6" strokeLinecap="round" strokeOpacity="0.45" />
      </g>
      <path d="M12 38h72v38a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" className="il-soft il-line" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 40l35 24 35-24" className="il-line" fill="none" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 79l26-20M83 79L57 59" className="il-line" fill="none" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round" />
      <rect x="66" y="44" width="12" height="14" rx="1.5" className="il-accent" />
      <rect x="68.5" y="46.5" width="7" height="9" rx="1" className="il-on-accent" strokeWidth="1.2" />
    </Art>
  );
}

/* ---------- A prize with no image: a ticket on the lit stage ---------- */

export function PrizePlaceholder({ className }: { className?: string }) {
  return (
    <span className={['prize-placeholder', className].filter(Boolean).join(' ')} aria-hidden="true">
      <svg className="il il-placeholder" viewBox="0 0 120 120" focusable="false">
        <ellipse cx="60" cy="96" rx="40" ry="7" className="il-floor" />
        <g transform="rotate(-12 60 58)">
          <path d={ticketPath(22, 38, 76, 42, 7, 7)} className="il-primary" />
          <path d="M80 44v30" className="il-cut" strokeWidth="2.4" strokeDasharray="4 4" strokeLinecap="round" />
          <path d="M50 49.5l3.2 6.6 7.2 1-5.2 5 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.2-5 7.2-1z" className="il-cut-fill" />
        </g>
        <path className="il-spark" d="M96 22c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7z" />
      </svg>
    </span>
  );
}

/* ---------- Instant prize tiers (56 units): coin for the lowest, gem for the middle, star burst for the top ---------- */

function Coin({ g }: { g: string }) {
  return (
    <>
      <ellipse cx="28" cy="31" rx="21" ry="21" className="il-p4" />
      <circle cx="28" cy="27" r="21" fill={`url(#${g})`} />
      <circle cx="28" cy="27" r="15.5" className="il-p3-line" fill="none" strokeWidth="2" />
      <path d="M28 17.5l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" className="il-p3" />
      <path d="M13.5 20a16 16 0 0 1 10-8.6" className="il-gloss" fill="none" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function Gem() {
  return (
    <>
      <path d="M17 9h22l-3 9H20z" className="il-a1" />
      <path d="M17 9L7 21h13z" className="il-a2" />
      <path d="M39 9l10 12H36z" className="il-a3" />
      <path d="M20 18h16l-8 3z" className="il-a2" />
      <path d="M7 21h13l8 27z" className="il-a2" />
      <path d="M20 21h16l-8 27z" className="il-a3" />
      <path d="M36 21h13L28 48z" className="il-a4" />
      <path d="M17 9h22l10 12-21 27L7 21z" className="il-a-edge" fill="none" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 12h7l-5 4z" className="il-gloss-fill" />
    </>
  );
}

function Burst({ g }: { g: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const r = i % 2 ? 15 : 24;
    const a = (Math.PI / 12) * i - Math.PI / 2;
    pts.push(`${(28 + r * Math.cos(a)).toFixed(2)} ${(28 + r * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <>
      <path d={`M${pts.join('L')}z`} fill={`url(#${g})`} />
      <circle cx="28" cy="28" r="12.5" className="il-p4" />
      <path d="M28 17.5l3.1 6.4 7 1-5.1 4.9 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-4.9 7-1z" className="il-primary" />
      <path d="M28 17.5l3.1 6.4 7 1-5.1 4.9" className="il-gloss" fill="none" strokeWidth="1.2" strokeLinejoin="round" />
    </>
  );
}

export function InstantPrizeArt({ rank, id }: { rank: 0 | 1 | 2; id: string }) {
  const g = `ip-${id}`;
  return (
    <svg className={`il prize-icon rank-${rank}`} width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="stop-primary-light" />
          <stop offset="0.5" className="stop-primary" />
          <stop offset="1" className="stop-primary-deep" />
        </linearGradient>
      </defs>
      {rank === 0 ? <Coin g={g} /> : rank === 1 ? <Gem /> : <Burst g={g} />}
    </svg>
  );
}

/* ---------- Decorative: thin arc rings behind the hero art ---------- */

export function HeroRings() {
  return (
    <svg className="il hero-rings" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <circle cx="100" cy="100" r="98" className="il-ring" strokeWidth="0.6" />
      <path d="M100 14a86 86 0 0 1 86 86" className="il-ring is-strong" strokeWidth="1" strokeLinecap="round" />
      <path d="M14 100a86 86 0 0 0 52 79" className="il-ring is-accent is-strong" strokeWidth="1" strokeLinecap="round" />
      <circle cx="100" cy="100" r="74" className="il-ring is-accent" strokeWidth="0.6" strokeDasharray="1.5 5" />
      <circle cx="186" cy="100" r="2" className="il-primary" />
      <circle cx="66" cy="179" r="1.6" className="il-accent" />
    </svg>
  );
}
