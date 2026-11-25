/**
 * Part of src/lib/fairdraw/, FairDraw's MIT-licensed draw code and its port.
 * Licence: MIT, copyright (c) 2026 Harrison Jones (FairDraw), free for any use
 * (https://fairdraw.partyofone.quest/about.html#code). The full MIT text is in NOTICE. This file is not under the
 * CPAL that covers the rest of the template.
 *
 * Step 2 of the FairDraw method: the drand quicknet randomness for a committed round (PHP: fairdraw_beacon).
 *
 * This template goes further than the PHP original: it asks at least two independent drand relays and refuses to
 * draw unless they agree, and it checks that each relay's randomness is the SHA-256 of the round's signature, as the
 * drand protocol defines it. It never returns randomness for a round whose publication time has not been reached.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { bls12_381 } from '@noble/curves/bls12-381.js';
import { FAIRDRAW_DRAND_CHAIN, fairdrawRoundTime } from './draw';

/**
 * Relays from DRAND_RELAYS (comma separated), or the defaults. Safe to change: every beacon's signature is checked
 * against drand's public key, so no relay can supply randomness drand did not sign.
 */
export function configuredRelays(value = process.env.DRAND_RELAYS): string[] {
  const list = (value ?? '').split(',').map((r) => r.trim()).filter((r) => /^https:\/\/[^\s/]+/.test(r));
  return list.length ? list : DEFAULT_DRAND_RELAYS;
}

/** Public drand HTTP relays run by different organisations. The browser verifier always uses these. */
export const DEFAULT_DRAND_RELAYS = [
  'https://api.drand.sh',
  'https://api2.drand.sh',
  'https://api3.drand.sh',
  'https://drand.cloudflare.com',
];

/**
 * The drand quicknet group public key, from the chain's /info at every relay (scheme bls-unchained-g1-rfc9380).
 * Every beacon's signature is checked against it, so a relay, or a "relay" the operator runs, cannot make up
 * randomness: only the drand network can sign a round.
 */
export const DRAND_QUICKNET_PUBLIC_KEY =
  '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a';

/** True when `signatureHex` is the drand quicknet signature for `round` (BLS on G1, message sha256 of the round). */
export function verifyBeaconSignature(round: number, signatureHex: string): boolean {
  try {
    const sigs = bls12_381.shortSignatures;
    const m = Buffer.alloc(8);
    m.writeBigUInt64BE(BigInt(round));
    const message = sigs.hash(createHash('sha256').update(m).digest());
    return sigs.verify(Buffer.from(signatureHex, 'hex'), message, Buffer.from(DRAND_QUICKNET_PUBLIC_KEY, 'hex'));
  } catch {
    return false;
  }
}

const beaconSchema = z.object({
  round: z.number().int().positive(),
  randomness: z.string().regex(/^[0-9a-f]{64}$/),
  signature: z.string().regex(/^[0-9a-f]+$/),
});

export class BeaconNotReadyError extends Error {}
export class BeaconDisagreementError extends Error {}

export interface BeaconResult {
  round: number;
  randomness: string;
  signature: string;
  relays: string[];
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface BeaconOptions {
  relays?: string[];
  minAgreeing?: number;
  fetchImpl?: FetchLike;
  nowUnix?: number;
  timeoutMs?: number;
}

async function fetchFromRelay(fetchImpl: FetchLike, relay: string, round: number, timeoutMs: number) {
  const url = `${relay.replace(/\/$/, '')}/${FAIRDRAW_DRAND_CHAIN}/public/${round}`;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${relay} answered HTTP ${res.status}`);
  const b = beaconSchema.parse(await res.json());
  if (b.round !== round) throw new Error(`${relay} returned round ${b.round}, asked for ${round}`);
  const expected = createHash('sha256').update(Buffer.from(b.signature, 'hex')).digest('hex');
  if (expected !== b.randomness) throw new Error(`${relay} returned randomness that is not the hash of its signature`);
  if (!verifyBeaconSignature(round, b.signature)) throw new Error(`${relay} returned a signature that is not drand quicknet's for round ${round}`);
  return b;
}

/**
 * Fetch the randomness for `round` from several relays. Succeeds only when at least `minAgreeing` relays (default 2)
 * return the same randomness and signature and none disagree. Throws BeaconNotReadyError before the round is due.
 */
export async function fetchBeacon(round: number, opts: BeaconOptions = {}): Promise<BeaconResult> {
  const relays = opts.relays ?? DEFAULT_DRAND_RELAYS;
  const minAgreeing = opts.minAgreeing ?? 2;
  const fetchImpl = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  const now = opts.nowUnix ?? Math.floor(Date.now() / 1000);
  if (minAgreeing < 2) throw new Error('at least two relays must agree');
  if (now < fairdrawRoundTime(round)) {
    throw new BeaconNotReadyError(`drand round ${round} is not due until ${new Date(fairdrawRoundTime(round) * 1000).toISOString()}`);
  }
  const settled = await Promise.allSettled(relays.map((r) => fetchFromRelay(fetchImpl, r, round, opts.timeoutMs ?? 10_000)));
  const good: { relay: string; randomness: string; signature: string }[] = [];
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') good.push({ relay: relays[i]!, randomness: s.value.randomness, signature: s.value.signature });
  });
  const distinct = new Set(good.map((g) => `${g.randomness}:${g.signature}`));
  if (distinct.size > 1) {
    throw new BeaconDisagreementError(`drand relays disagree about round ${round}: ${good.map((g) => `${g.relay}=${g.randomness}`).join(', ')}`);
  }
  if (good.length < minAgreeing) {
    const reasons = settled.map((s, i) => (s.status === 'rejected' ? `${relays[i]}: ${String((s.reason as Error)?.message ?? s.reason)}` : null)).filter(Boolean);
    throw new BeaconNotReadyError(`only ${good.length} relay(s) answered for round ${round}; need ${minAgreeing}. ${reasons.join('; ')}`);
  }
  return { round, randomness: good[0]!.randomness, signature: good[0]!.signature, relays: good.map((g) => g.relay) };
}
