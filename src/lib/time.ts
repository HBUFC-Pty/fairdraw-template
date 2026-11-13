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
