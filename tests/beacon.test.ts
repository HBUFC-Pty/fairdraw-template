import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { BeaconNotReadyError, fetchBeacon, verifyBeaconSignature } from '../src/lib/fairdraw/beacon';
import { fairdrawRoundTime } from '../src/lib/fairdraw/draw';

// Real quicknet round 1000, as published by every drand relay.
const ROUND = 1000;
const SIG = 'b44679b9a59af2ec876b1a6b1ad52ea9b1615fc3982b19576350f93447cb1125e342b73a8dd2bacbe47e4b6b63ed5e39';
const RAND = 'fe290beca10872ef2fb164d2aa4442de4566183ec51c56ff3cd603d930e54fdd';
const now = fairdrawRoundTime(ROUND) + 10;

function fakeFetch(answers: Record<string, unknown>) {
  return async (url: string) => {
    const relay = Object.keys(answers).find((r) => url.startsWith(r));
    const body = relay ? answers[relay] : undefined;
    if (body === undefined) return { ok: false, status: 404, json: async () => ({}) };
    if (body instanceof Error) throw body;
    return { ok: true, status: 200, json: async () => body };
  };
}

const good = { round: ROUND, randomness: RAND, signature: SIG };

describe('drand beacon from several relays', () => {
  it('real data: randomness is the SHA-256 of the signature', () => {
    expect(createHash('sha256').update(Buffer.from(SIG, 'hex')).digest('hex')).toBe(RAND);
  });

  it('accepts when two relays agree', async () => {
    const r = await fetchBeacon(ROUND, { relays: ['https://a', 'https://b'], fetchImpl: fakeFetch({ 'https://a': good, 'https://b': good }), nowUnix: now });
    expect(r.randomness).toBe(RAND);
    expect(r.relays).toEqual(['https://a', 'https://b']);
  });

  it('accepts when two of three agree and the third is down', async () => {
    const r = await fetchBeacon(ROUND, { relays: ['https://a', 'https://b', 'https://c'], fetchImpl: fakeFetch({ 'https://a': good, 'https://c': good, 'https://b': new Error('down') }), nowUnix: now });
    expect(r.relays).toEqual(['https://a', 'https://c']);
  });

  it('refuses when only one relay answers', async () => {
    await expect(fetchBeacon(ROUND, { relays: ['https://a', 'https://b'], fetchImpl: fakeFetch({ 'https://a': good }), nowUnix: now })).rejects.toBeInstanceOf(BeaconNotReadyError);
  });

  it('real data: the signature is drand quicknet\'s for this round, and for no other', () => {
    expect(verifyBeaconSignature(ROUND, SIG)).toBe(true);
    expect(verifyBeaconSignature(ROUND + 1, SIG)).toBe(false);
    expect(verifyBeaconSignature(ROUND, 'ab')).toBe(false);
  });

  it('ignores relays serving made-up randomness, even when they agree with each other', async () => {
    // Two operator-run "relays" with a self-consistent beacon (randomness = sha256(signature)) that drand never signed.
    const sig = 'a'.repeat(96);
    const madeUp = { round: ROUND, randomness: createHash('sha256').update(Buffer.from(sig, 'hex')).digest('hex'), signature: sig };
    await expect(fetchBeacon(ROUND, { relays: ['https://x', 'https://y'], fetchImpl: fakeFetch({ 'https://x': madeUp, 'https://y': madeUp }), nowUnix: now })).rejects.toBeInstanceOf(
      BeaconNotReadyError,
    );
    // With genuine relays alongside, only the genuine beacon counts.
    const r = await fetchBeacon(ROUND, { relays: ['https://a', 'https://b', 'https://x'], fetchImpl: fakeFetch({ 'https://a': good, 'https://b': good, 'https://x': madeUp }), nowUnix: now });
    expect(r.randomness).toBe(RAND);
    expect(r.relays).toEqual(['https://a', 'https://b']);
  });

  it('ignores a relay whose randomness is not the hash of its signature', async () => {
    const forged = { round: ROUND, randomness: 'f'.repeat(64), signature: SIG };
    await expect(fetchBeacon(ROUND, { relays: ['https://a', 'https://b'], fetchImpl: fakeFetch({ 'https://a': good, 'https://b': forged }), nowUnix: now })).rejects.toBeInstanceOf(
      BeaconNotReadyError,
    );
  });

  it('ignores a relay that returns a different round', async () => {
    await expect(
      fetchBeacon(ROUND, { relays: ['https://a', 'https://b'], fetchImpl: fakeFetch({ 'https://a': good, 'https://b': { ...good, round: ROUND + 1 } }), nowUnix: now }),
    ).rejects.toBeInstanceOf(BeaconNotReadyError);
  });

  it('never asks before the round is due', async () => {
    let called = false;
    const f = async () => {
      called = true;
      return { ok: true, status: 200, json: async () => good };
    };
    await expect(fetchBeacon(ROUND, { relays: ['https://a', 'https://b'], fetchImpl: f, nowUnix: fairdrawRoundTime(ROUND) - 1 })).rejects.toBeInstanceOf(BeaconNotReadyError);
    expect(called).toBe(false);
  });

  it('will not run with fewer than two required relays', async () => {
    await expect(fetchBeacon(ROUND, { minAgreeing: 1, fetchImpl: fakeFetch({}), nowUnix: now })).rejects.toThrow('at least two');
  });
});
