export function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

/** Parse "12.50" or "12" (pounds) into pence. Rejects anything else. */
export function parsePounds(input: string): number {
  const m = /^\s*£?\s*(\d{1,7})(?:\.(\d{1,2}))?\s*$/.exec(input);
  if (!m) throw new Error('enter an amount in pounds, for example 2.50');
  return Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'));
}
