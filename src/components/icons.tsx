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
 * Inline SVG icons, drawn for this template (24 by 24, 1.75 stroke, round caps and joins). They draw in currentColor,
 * so they take the colour of the text around them, and are hidden from assistive technology: the text or aria-label
 * beside an icon carries the meaning. No colours in here: fills come from currentColor or token classes in CSS.
 */
import type { ReactNode } from 'react';

type IconProps = { className?: string; size?: number };

function Svg({ className, size = 24, children, solid = false }: IconProps & { children: ReactNode; solid?: boolean }) {
  return (
    <svg
      className={['icon', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const TICKET = 'M5 6h14a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a1.5 1.5 0 0 0 0-3V8a2 2 0 0 1 2-2z';

/* Prizes and draws */
export const Ticket = (p: IconProps) => (
  <Svg {...p}>
    <path d={TICKET} />
    <path d="M15 7v1.5M15 11.25v1.5M15 15.5V17" />
  </Svg>
);
export const Trophy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
    <path d="M8 5.5H5v1a3.5 3.5 0 0 0 3.4 3.5M16 5.5h3v1a3.5 3.5 0 0 1-3.4 3.5" />
    <path d="M12 13v3.5M9 20h6M10 16.5h4l.5 3.5h-5l.5-3.5z" />
  </Svg>
);
export const Gift = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 11h15v8.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V11zM3.5 7.5h17V11h-17zM12 7.5v13" />
    <path d="M12 7.5C10.5 4 7.2 3.8 7.2 5.8c0 1.5 2.3 1.7 4.8 1.7zM12 7.5c1.5-3.5 4.8-3.7 4.8-1.7 0 1.5-2.3 1.7-4.8 1.7z" />
  </Svg>
);
export const Bolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 3 5 13.5h6.5L10.5 21 19 10.5h-6.5L13.5 3z" />
  </Svg>
);
export const Sparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3c.8 6 3 8.2 9 9-6 .8-8.2 3-9 9-.8-6-3-8.2-9-9 6-.8 8.2-3 9-9z" />
  </Svg>
);
export const Dice = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <circle cx="8.75" cy="8.75" r="1.1" fill="currentColor" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" />
    <circle cx="15.25" cy="15.25" r="1.1" fill="currentColor" />
  </Svg>
);
export const Beacon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="16.5" r="1.6" fill="currentColor" />
    <path d="M9 13.5a4.24 4.24 0 0 1 6 0M6.2 10.7a8.2 8.2 0 0 1 11.6 0M3.4 7.9a12.16 12.16 0 0 1 17.2 0" />
  </Svg>
);

/* Trust and info */
export const ShieldCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 19 6v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6l7-3z" />
    <path d="m8.75 12 2.25 2.25 4.25-4.5" />
  </Svg>
);
export const Envelope = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.75 6.5 8.25 6.25 8.25-6.25" />
  </Svg>
);
export const Info = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.25M12 7.75h.01" />
  </Svg>
);
export const EighteenPlus = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.25" />
    <path d="M6.6 9.6 8.2 8.4v7.2" />
    <circle cx="11.9" cy="10.1" r="1.65" />
    <circle cx="11.9" cy="13.75" r="1.9" />
    <path d="M17 10.4v3.6M15.2 12.2h3.6" />
  </Svg>
);

/* Time */
export const Clock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.25 2" />
  </Svg>
);
export const Calendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);

/* Account and navigation */
export const Basket = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10h18l-1.7 8.3a2 2 0 0 1-2 1.7H6.7a2 2 0 0 1-2-1.7L3 10z" />
    <path d="m7.5 10 3-6M16.5 10l-3-6M9 13.5v3M12 13.5v3M15 13.5v3" />
  </Svg>
);
export const Account = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </Svg>
);
export const Users = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M2.75 19.5c.9-3 3.3-4.75 6.25-4.75s5.35 1.75 6.25 4.75" />
    <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.9c1.9.6 3.2 2.2 3.75 4.6" />
  </Svg>
);
export const Menu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);
export const Close = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

/* Controls */
export const ArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);
export const ArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const Play = (p: IconProps) => (
  <Svg {...p} solid>
    <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5a.8.8 0 0 0-1.2.7z" />
  </Svg>
);
export const Pause = (p: IconProps) => (
  <Svg {...p} solid>
    <rect x="6.5" y="5" width="4" height="14" rx="1" />
    <rect x="13.5" y="5" width="4" height="14" rx="1" />
  </Svg>
);

/* Brand: a filled ticket with a star cut out, the default monogram when a brand has no logo. */
const STAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 4.1 : 1.75;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12.2 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}z`;
})();

/** `gradientId` must be unique on the page (the header and footer each pass their own). */
export function LogoTicket({ className, size = 32, gradientId }: IconProps & { gradientId: string }) {
  return (
    <svg className={['logo-ticket', className].filter(Boolean).join(' ')} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="stop-primary" />
          <stop offset="1" className="stop-accent" />
        </linearGradient>
      </defs>
      <g transform="rotate(-14 12 12)">
        <path d={`${TICKET}${STAR}`} fill={`url(#${gradientId})`} fillRule="evenodd" />
      </g>
    </svg>
  );
}

/** Stand-in for a prize with no image: a ticket on the lit stage. Stage 4 may replace it with richer art. */
export function PrizePlaceholder({ className }: { className?: string }) {
  return (
    <span className={['prize-placeholder', className].filter(Boolean).join(' ')} aria-hidden="true">
      <Ticket size={56} />
    </span>
  );
}
