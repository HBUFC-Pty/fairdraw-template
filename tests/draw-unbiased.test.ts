import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { fairdrawLimit, fairdrawPick } from '../src/lib/fairdraw/draw';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('unbiased selection', () => {
  it('gives every sold ticket the same chance (60,000 draws over 7 tickets, each within 5%)', async () => {
    const tickets = [3, 9, 10, 44, 45, 46, 99];
    const counts = new Map<number, number>();
    const draws = 60_000;
    for (let i = 0; i < draws; i++) {
      const [w] = await fairdrawPick(tickets, sha(`r${i}`));
      counts.set(w!, (counts.get(w!) ?? 0) + 1);
    }
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual(tickets);
    const expected = draws / tickets.length;
    let chi2 = 0;
    for (const c of counts.values()) {
      expect(Math.abs(c - expected)).toBeLessThan(expected * 0.05);
      chi2 += (c - expected) ** 2 / expected;
    }
    // 6 degrees of freedom: the 99.9th percentile of chi-squared is about 22.46.
    expect(chi2).toBeLessThan(22.46);
  });

  it('positions of first winners are spread evenly (FairDraw draw-position test)', async () => {
    const tickets = Array.from({ length: 1000 }, (_, i) => i + 1);
    let low2 = 0;
    let low10 = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      const [w] = await fairdrawPick(tickets, sha(`p${i}`));
      if (w! <= 20) low2++;
      if (w! <= 100) low10++;
    }
    expect(low2 / n).toBeGreaterThan(0.01);
    expect(low2 / n).toBeLessThan(0.03);
    expect(low10 / n).toBeGreaterThan(0.08);
    expect(low10 / n).toBeLessThan(0.12);
  });

  it('never picks the same ticket twice and only picks sold tickets', async () => {
    const tickets = [5, 6, 7, 8, 9, 100, 2000];
    for (let i = 0; i < 200; i++) {
      const w = await fairdrawPick(tickets, sha(`m${i}`), 4);
      expect(new Set(w).size).toBe(4);
      for (const x of w) expect(tickets).toContain(x);
    }
    expect(await fairdrawPick(tickets, sha('all'), 10)).toHaveLength(7);
    expect(await fairdrawPick([], sha('none'), 1)).toEqual([]);
  });

  it('rejection sampling removes modulo bias: the limit is a multiple of n not above 2^32', () => {
    for (const n of [1, 2, 3, 7, 1000, 65537, 999_999, 3_000_000_000]) {
      const l = fairdrawLimit(n);
      expect(l % n).toBe(0);
      expect(l).toBeLessThanOrEqual(2 ** 32);
      expect(2 ** 32 - l).toBeLessThan(n);
    }
  });
});
