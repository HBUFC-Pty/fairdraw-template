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
/** Dates and times. Competition times are stored in UTC and shown in UK time (Europe/London). */
export const UK_TZ = 'Europe/London';

export function formatUk(d: Date | null | undefined, withSeconds = false): string {
  if (!d) return 'not yet';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    timeZoneName: 'short',
  }).format(d);
}

/**
 * A short UK time for chips and fact tiles: "Today 19:45", "Tomorrow 20:00" or "Sun 22 Nov 20:00" (with the year
 * added when it is not this year). "Today" and "Tomorrow" are UK calendar days, so they stay right across the clock
 * change.
 */
export function formatUkShort(d: Date, now: Date = new Date()): string {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: UK_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  const day = ukDate(d);
  const today = ukDate(now);
  if (day === today) return `Today ${time}`;
  const [y, m, dd] = today.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, dd + 1)).toISOString().slice(0, 10);
  if (day === next) return `Tomorrow ${time}`;
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: UK_TZ, weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
    .format(d)
    .replace(',', '');
  return `${date} ${time}`;
}

/** Today's calendar date in the UK, as YYYY-MM-DD. */
export function ukDate(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: UK_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Convert a value from <input type="datetime-local"> (UK wall-clock time) to a UTC Date. */
export function fromUkLocalInput(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw new Error('invalid date and time');
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Find the UTC offset London had at that moment (0 or +1 hour) and correct for it.
  for (const offsetHours of [0, 1]) {
    const candidate = new Date(guess - offsetHours * 3600_000);
    if (toUkLocalInput(candidate) === value) return candidate;
  }
  throw new Error('that time does not exist in the UK (clocks change)');
}

export function toUkLocalInput(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * The calendar month containing `now`, in UK time: from 00:00 on the 1st (Europe/London) to 00:00 on the 1st of the
 * next month, as UTC instants. Used for the DCMS credit card limit, which is "per month".
 */
export function ukMonthBounds(now: Date): { start: Date; end: Date; label: string } {
  const [y, m] = ukDate(now).split('-').map(Number) as [number, number];
  const pad = (n: number) => String(n).padStart(2, '0');
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return { start: fromUkLocalInput(`${y}-${pad(m)}-01T00:00`), end: fromUkLocalInput(`${ny}-${pad(nm)}-01T00:00`), label: `${y}-${pad(m)}` };
}
