import { describe, expect, it } from 'vitest';
import { allocateChosen, allocateRandom, AllocationError, capAboveTenPercent, withinCap } from '../src/lib/competitions/allocation';

describe('ticket allocation', () => {
  it('allocates distinct unsold numbers in range', () => {
    const taken = new Set([1, 2, 3, 50]);
    for (let i = 0; i < 100; i++) {
      const got = allocateRandom(100, taken, 10);
      expect(new Set(got).size).toBe(10);
      for (const n of got) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(100);
        expect(taken.has(n)).toBe(false);
      }
    }
  });

  it('uses the pool path when mostly sold and still only returns free numbers', () => {
    const taken = new Set(Array.from({ length: 95 }, (_, i) => i + 1));
    const got = allocateRandom(100, taken, 5);
    expect(got.sort((a, b) => a - b)).toEqual([96, 97, 98, 99, 100]);
  });

  it('refuses to allocate more than are left', () => {
    expect(() => allocateRandom(10, new Set([1, 2, 3, 4, 5, 6, 7, 8]), 3)).toThrow(AllocationError);
    expect(() => allocateRandom(10, new Set(), 0)).toThrow(AllocationError);
  });

  it('is roughly uniform over the unsold pool (both code paths)', () => {
    for (const taken of [new Set<number>([2, 4]), new Set<number>([1, 2, 3, 4, 5, 6])]) {
      const counts = new Map<number, number>();
      for (let i = 0; i < 20_000; i++) {
        const [n] = allocateRandom(10, taken, 1);
        counts.set(n!, (counts.get(n!) ?? 0) + 1);
      }
      const free = 10 - taken.size;
      expect(counts.size).toBe(free);
      for (const c of counts.values()) expect(Math.abs(c - 20_000 / free)).toBeLessThan((20_000 / free) * 0.1);
    }
  });

  it('validates chosen numbers', () => {
    expect(allocateChosen(100, new Set([5]), [1, 2, 3])).toEqual([1, 2, 3]);
    expect(() => allocateChosen(100, new Set([5]), [5])).toThrow('already gone');
    expect(() => allocateChosen(100, new Set(), [101])).toThrow('between 1 and 100');
    expect(() => allocateChosen(100, new Set(), [0])).toThrow();
    expect(() => allocateChosen(100, new Set(), [2, 2])).toThrow('twice');
    expect(() => allocateChosen(100, new Set(), [1.5])).toThrow();
  });

  it('cap rules', () => {
    expect(capAboveTenPercent(10, 100)).toBe(false);
    expect(capAboveTenPercent(11, 100)).toBe(true);
    expect(withinCap(8, 2, 10)).toBe(true);
    expect(withinCap(9, 2, 10)).toBe(false);
  });
});
