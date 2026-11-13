/**
 * Step 2 of the FairDraw method: the drand quicknet randomness for a committed round (PHP: fairdraw_beacon).
 *
 * This template goes further than the PHP original: it asks at least two independent drand relays and refuses to
 * draw unless they agree, and it checks that each relay's randomness is the SHA-256 of the round's signature, as the
 * drand protocol defines it. It never returns randomness for a round whose publication time has not been reached.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { FAIRDRAW_DRAND_CHAIN, fairdrawRoundTime } from './draw';

/** Public drand HTTP relays run by different organisations. Override with DRAND_RELAYS (comma separated). */
export const DEFAULT_DRAND_RELAYS = [
  'https://api.drand.sh',
  'https://api2.drand.sh',
  'https://api3.drand.sh',
  'https://drand.cloudflare.com',
];

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
