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
'use client';

import { useSyncExternalStore } from 'react';

function two(n: number) {
  return String(n).padStart(2, '0');
}

// One tick a second. The snapshot is the current whole second, so it stays the same between ticks.
function subscribe(onTick: () => void) {
  const t = setInterval(onTick, 1000);
  return () => clearInterval(t);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
const onServer = () => null;

export type CountdownVariant = 'inline' | 'compact' | 'segments';

/** Split a number of seconds into days, hours, minutes and seconds. */
export function splitSeconds(s: number) {
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), sec: s % 60 };
}

/** "Closes in 2 days 4 hours", in whole minutes, so screen readers that read it are not told about every second. */
export function spokenRemaining(label: string, s: number): string {
  const { d, h, m } = splitSeconds(s);
  const part = (n: number, one: string) => (n ? `${n} ${one}${n === 1 ? '' : 's'}` : '');
  const words = d ? [part(d, 'day'), part(h, 'hour')] : h ? [part(h, 'hour'), part(m, 'minute')] : [part(Math.max(m, 1), 'minute')];
  return `${label} ${words.filter(Boolean).join(' ')}`;
}

/**
 * A live countdown to a real time (the close or the draw). Nothing is invented: it only counts to `to`.
 *
 * - `inline`: "Closes in 2d 04:12:08" on one line (the default).
 * - `compact`: "2d 04:12:08" for pills; under an hour it turns accent with a live dot.
 * - `segments`: boxes for days, hours, minutes and seconds.
 *
 * The server and the first browser render show `fallback` (a real time in words, such as "Today 19:45"), so they agree
 * and nothing jumps; the live count replaces it once the page is running. After `to` has passed it shows `fallback`.
 */
export function Countdown({ to, label = 'Closes in', variant = 'inline', fallback }: { to: string; label?: string; variant?: CountdownVariant; fallback?: string }) {
  const now = useSyncExternalStore(subscribe, nowSeconds, onServer);
  const target = Math.floor(new Date(to).getTime() / 1000);
  const live = now !== null && now < target;
  const cls = `countdown cd-${variant}`;
  if (!live) {
    if (!fallback) return variant === 'inline' ? null : <span className={`${cls} is-fallback`} />;
    return variant === 'inline' ? <p className={`${cls} is-fallback`}>{fallback}</p> : <span className={`${cls} is-fallback`}>{fallback}</span>;
  }
  const s = target - now;
  const { d, h, m, sec } = splitSeconds(s);
  const aria = spokenRemaining(label, s);
  // The seconds (and minutes) remount when they change, so motion.css can animate the new digit in.
  const tick = (v: number, unit: string) => <span key={`${unit}${v}`} className="cd-tick">{two(v)}</span>;
  if (variant === 'compact') {
    const soon = s < 3600;
    return (
      <span className={`${cls}${soon ? ' is-soon' : ''}`} role="timer" aria-live="off" aria-label={aria}>
        {soon ? <span className="live-dot" aria-hidden="true" /> : null}
        <span className="num" aria-hidden="true">
          {d > 0 ? `${d}d ` : ''}
          {h > 0 || d > 0 ? `${two(h)}:` : ''}
          {tick(m, 'm')}:{tick(sec, 's')}
        </span>
      </span>
    );
  }
  if (variant === 'segments') {
    const parts: [number, string, string][] = [...(d > 0 ? [[d, 'Days', 'd'] as [number, string, string]] : []), [h, 'Hrs', 'h'], [m, 'Mins', 'm'], [sec, 'Secs', 's']];
    return (
      <span className={cls} role="timer" aria-live="off" aria-label={aria}>
        {parts.map(([v, unit, k]) => (
          <span key={unit} className="cd-seg" aria-hidden="true">
            <span className="cd-num num">{k === 'd' || k === 'h' ? two(v) : tick(v, k)}</span>
            <span className="cd-unit">{unit}</span>
          </span>
        ))}
      </span>
    );
  }
  return (
    <p className={cls} role="timer" aria-live="off">
      <span className="countdown-label">{label}</span>{' '}
      <span className="num">{d > 0 ? `${d}d ` : ''}{two(h)}:{two(m)}:{two(sec)}</span>
    </p>
  );
}
