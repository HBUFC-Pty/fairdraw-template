import { describe, expect, it } from 'vitest';
import { ageOn, isAdult, isValidDateOfBirth } from '../src/lib/auth/age';

describe('age check', () => {
  it('counts birthdays correctly', () => {
    expect(ageOn('2008-11-13', '2026-11-13')).toBe(18);
    expect(ageOn('2008-11-14', '2026-11-13')).toBe(17);
    expect(ageOn('2008-12-01', '2026-11-13')).toBe(17);
    expect(ageOn('1990-01-01', '2026-11-13')).toBe(36);
  });

  it('handles 29 February birthdays (adult on 1 March in non-leap years)', () => {
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18);
  });

  it('is 18 on the birthday itself, in UK time', () => {
    // 23:30 UTC on 12 November 2026 is still 12 November in London (GMT).
    expect(isAdult('2008-11-13', new Date('2026-11-12T23:30:00Z'))).toBe(false);
    expect(isAdult('2008-11-13', new Date('2026-11-13T00:00:00Z'))).toBe(true);
    // In summer, 23:30 UTC on 30 June is already 1 July in London (BST).
    expect(isAdult('2008-07-01', new Date('2026-06-30T23:30:00Z'))).toBe(true);
  });

  it('rejects impossible or future dates', () => {
    const now = new Date('2026-11-13T12:00:00Z');
    expect(isValidDateOfBirth('2001-02-29', now)).toBe(false);
    expect(isValidDateOfBirth('1990-13-01', now)).toBe(false);
    expect(isValidDateOfBirth('2030-01-01', now)).toBe(false);
    expect(isValidDateOfBirth('1850-01-01', now)).toBe(false);
    expect(isValidDateOfBirth('not a date', now)).toBe(false);
    expect(isAdult('2030-01-01', now)).toBe(false);
  });
});
