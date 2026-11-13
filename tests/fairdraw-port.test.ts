/**
 * The TypeScript draw must give exactly the answers FairDraw's PHP gives. The vectors were produced by running the PHP
 * original (scripts/vectors/generate.php), so any drift in the port fails here.
 */
import { describe, expect, it } from 'vitest';
import vectors from './vectors/fairdraw-php-vectors.json';
import {
  fairdrawCommit,
  fairdrawEntriesHash,
  fairdrawHmacU32,
  fairdrawLimit,
  fairdrawNormalise,
  fairdrawPick,
  fairdrawRecord,
  fairdrawRoundAfter,
  fairdrawVerify,
  phpGmdateC,
} from '../src/lib/fairdraw/draw';
import { fairdrawEntryCode, fairdrawPublicEntryList } from '../src/lib/fairdraw/entry-codes';

describe('port of FairDraw PHP draw code', () => {
  it('normalises and hashes ticket lists exactly as PHP does', async () => {
    expect(vectors.hashes.length).toBeGreaterThan(20);
    for (const v of vectors.hashes) {
      expect(fairdrawNormalise(v.input)).toEqual(v.normalised);
      expect(await fairdrawEntriesHash(v.input)).toBe(v.entries_hash);
    }
  });

  it('computes the same committed drand round', () => {
    for (const v of vectors.rounds) expect(fairdrawRoundAfter(v.close_unix, v.wait)).toBe(v.round);
  });

  it('produces identical commitments, including the gmdate format', async () => {
    for (const v of vectors.commits) {
      expect(await fairdrawCommit(v.tickets, v.close_unix, v.max_tickets)).toEqual(v.commit);
      expect(JSON.stringify(await fairdrawCommit(v.tickets, v.close_unix, v.max_tickets))).toBe(JSON.stringify(v.commit));
    }
    expect(phpGmdateC(1794400000)).toBe('2026-11-11T12:26:40+00:00');
  });

  it('picks the same winners, in the same order, for 300 random cases', async () => {
    expect(vectors.picks.length).toBe(300);
    for (const v of vectors.picks) expect(await fairdrawPick(v.tickets, v.randomness, v.winners)).toEqual(v.won);
  });

  it('matches the rejection-sampling arithmetic, including sizes where rejection is likely', () => {
    for (const v of vectors.limits) expect(fairdrawLimit(v.n)).toBe(v.limit);
  });

  it('reads the same 32-bit value from the HMAC', async () => {
    for (const v of vectors.hmac_u32) expect(await fairdrawHmacU32(v.key, v.message)).toBe(v.value);
  });

  it('builds byte-identical records (PHP json_encode with unescaped slashes)', async () => {
    for (const v of vectors.records) {
      const commit = await fairdrawCommit(v.tickets, v.close_unix, v.max_tickets);
      const won = await fairdrawPick(v.tickets, v.record.randomness, v.winners);
      const rec = fairdrawRecord(commit, v.record.randomness, won);
      expect(JSON.stringify(rec)).toBe(v.json_unescaped);
      expect(rec).toEqual(JSON.parse(v.json));
      const check = await fairdrawVerify(rec, v.tickets, v.record.randomness);
      expect(check.ok).toBe(true);
    }
  });

  it('verification catches a changed list or winner', async () => {
    const v = vectors.records[0]!;
    const rec = v.record;
    const extra = await fairdrawVerify(rec, [...v.tickets, 9999], null);
    expect(extra.ok).toBe(false);
    expect(extra.problems.join(' ')).toContain('entries hash');
    const changed = await fairdrawVerify({ ...rec, winning_tickets: [rec.winning_tickets[0]! + 1, ...rec.winning_tickets.slice(1)] }, v.tickets, null);
    expect(changed.ok).toBe(false);
    expect(changed.problems.join(' ')).toContain('re-run gives');
  });

  it('gives the same entry codes and public list', () => {
    for (const v of vectors.entry_codes) expect(fairdrawEntryCode(v.secret, v.competition_id, v.ticket, v.order_id)).toBe(v.code);
    const l = vectors.entry_list;
    expect(fairdrawPublicEntryList(l.secret, l.competition_id, l.sold as [number, string][])).toEqual(l.rows);
  });

  it('commits to a round at least 30 seconds after the close', () => {
    for (const close of [1794400000, 1794400001, 1794400002]) {
      const r = fairdrawRoundAfter(close);
      expect(1692803367 + (r - 1) * 3).toBeGreaterThanOrEqual(close + 30);
    }
  });

  it('rejects malformed randomness', async () => {
    await expect(fairdrawPick([1, 2, 3], 'ABC')).rejects.toThrow();
  });
});
