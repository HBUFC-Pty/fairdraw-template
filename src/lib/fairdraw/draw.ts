/**
 * Verifiable prize draw: commit to the entries, then draw with public randomness anyone can check.
 *
 * A TypeScript port of fairdraw_commit / fairdraw_beacon / fairdraw_pick / fairdraw_record from FairDraw's guide
 * "Getting to a 10": https://fairdraw.partyofone.quest/guides/getting-to-10.html#draw
 * Original PHP: https://fairdraw.partyofone.quest/guides/code/fairdraw-draw.php
 * Verifier players can run: https://fairdraw.partyofone.quest/guides/code/fairdraw-verify.mjs
 * Keep this credit if you copy or adapt this file.
 * Licence: MIT, copyright (c) 2026 Harrison Jones (FairDraw), free for any use
 * (https://fairdraw.partyofone.quest/about.html#code). The full MIT text is in NOTICE. This file is not under the
 * CPAL that covers the rest of the template.
 *
 * DO NOT CHANGE THE ALGORITHM. A draw made by this file must re-run byte for byte with FairDraw's tools. The test
 * vectors in tests/vectors/fairdraw-php-vectors.json were produced by running the PHP original, and
 * tests/fairdraw-port.test.ts fails if this port gives a different answer for any of them.
 *
 * This module is isomorphic: it uses only Web Crypto, so the same code runs on the server and in the browser
 * (the "verify this draw" page imports it).
 */

export const FAIRDRAW_DRAND_CHAIN = '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971'; // drand quicknet
export const FAIRDRAW_DRAND_GENESIS = 1692803367; // quicknet round 1, Unix seconds
export const FAIRDRAW_DRAND_PERIOD = 3; // a new round every 3 seconds
export const FAIRDRAW_METHOD_URL = 'https://fairdraw.partyofone.quest/guides/getting-to-10.html#draw';

export interface FairdrawCommit {
  closed_at: string;
  tickets_sold: number;
  max_tickets: number;
  entries_hash: string;
  drand_chain: string;
  drand_round: number;
}

export interface FairdrawRecord extends FairdrawCommit {
  randomness: string;
  winning_tickets: number[];
  method: string;
}

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) throw new Error('invalid hex string');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Sorted, de-duplicated ticket numbers as integers (PHP: fairdraw_normalise). */
export function fairdrawNormalise(tickets: readonly number[]): number[] {
  for (const t of tickets) {
    if (!Number.isSafeInteger(t)) throw new Error(`ticket number ${String(t)} is not an integer`);
  }
  return [...new Set(tickets)].sort((a, b) => a - b);
}

/** SHA-256 of the ticket numbers joined by commas, e.g. "3,17,240" (PHP: fairdraw_entries_hash). */
export async function fairdrawEntriesHash(tickets: readonly number[]): Promise<string> {
  const text = fairdrawNormalise(tickets).join(',');
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
}

/**
 * The first beacon round published at least `wait` seconds after `closeUnix` (PHP: fairdraw_round_after).
 * PHP intdiv truncates toward zero; close times are always after genesis, so Math.trunc matches.
 */
export function fairdrawRoundAfter(closeUnix: number, wait = 30): number {
  if (!Number.isSafeInteger(closeUnix) || !Number.isSafeInteger(wait)) throw new Error('close time and wait must be integers');
  return Math.trunc((closeUnix + wait - FAIRDRAW_DRAND_GENESIS) / FAIRDRAW_DRAND_PERIOD) + 2;
}

/** The Unix time at which a quicknet round is published. */
export function fairdrawRoundTime(round: number): number {
  return FAIRDRAW_DRAND_GENESIS + (round - 1) * FAIRDRAW_DRAND_PERIOD;
}

/** PHP gmdate('c', $unix): "2026-11-11T12:35:00+00:00". */
export function phpGmdateC(unix: number): string {
  return new Date(unix * 1000).toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

/**
 * Step 1, at the close: the commitment to publish (with the full ticket list) before the beacon round exists
 * (PHP: fairdraw_commit). `wait` defaults to 30 seconds, exactly as the PHP does; this template passes the gap
 * between the close and the advertised draw time so the randomness does not exist until the draw is due.
 */
export async function fairdrawCommit(tickets: readonly number[], closeUnix: number, maxTickets: number, wait = 30): Promise<FairdrawCommit> {
  const t = fairdrawNormalise(tickets);
  return {
    closed_at: phpGmdateC(closeUnix),
    tickets_sold: t.length,
    max_tickets: maxTickets,
    entries_hash: await fairdrawEntriesHash(t),
    drand_chain: FAIRDRAW_DRAND_CHAIN,
    drand_round: fairdrawRoundAfter(closeUnix, wait),
  };
}

/** The rejection-sampling bound: the largest multiple of n not above 2^32 (PHP: intdiv(4294967296, $n) * $n). */
export function fairdrawLimit(n: number): number {
  return Math.floor(4294967296 / n) * n;
}

/** First 4 bytes of HMAC-SHA256(key, message) as an unsigned big-endian number (PHP: unpack('N', ...)). */
export async function fairdrawHmacU32(keyHex: string, message: string): Promise<number> {
  const key = await crypto.subtle.importKey('raw', fromHex(keyHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return new DataView(mac).getUint32(0, false);
}

/**
 * Step 3: pick `winners` distinct tickets (PHP: fairdraw_pick). Uniform over the sold tickets: rejection sampling
 * removes modulo bias. Each attempt uses HMAC-SHA256(key = beacon randomness, message = "<entries hash>:<counter>"),
 * first 4 bytes as an unsigned big-endian number.
 */
export async function fairdrawPick(tickets: readonly number[], randomnessHex: string, winners = 1): Promise<number[]> {
  if (!/^[0-9a-f]{64}$/.test(randomnessHex)) throw new Error('randomness must be 64 lower-case hex characters');
  const pool = fairdrawNormalise(tickets);
  const hash = await fairdrawEntriesHash(pool);
  const key = await crypto.subtle.importKey('raw', fromHex(randomnessHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const won: number[] = [];
  for (let counter = 0; won.length < winners && pool.length > 0; counter++) {
    const n = pool.length;
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${hash}:${counter}`));
    const v = new DataView(mac).getUint32(0, false);
    if (v >= fairdrawLimit(n)) continue; // would favour low positions; draw again with the next counter
    const i = v % n;
    won.push(pool[i]!);
    pool.splice(i, 1); // no ticket wins twice
  }
  return won;
}

/** The full public record for one draw (PHP: fairdraw_record). Key order matches the PHP output. */
export function fairdrawRecord(commit: FairdrawCommit, randomnessHex: string, winners: number[]): FairdrawRecord {
  return {
    closed_at: commit.closed_at,
    tickets_sold: commit.tickets_sold,
    max_tickets: commit.max_tickets,
    entries_hash: commit.entries_hash,
    drand_chain: commit.drand_chain,
    drand_round: commit.drand_round,
    randomness: randomnessHex,
    winning_tickets: winners,
    method: FAIRDRAW_METHOD_URL,
  };
}

export interface VerifyResult {
  ok: boolean;
  problems: string[];
  winners: number[];
}

/**
 * Re-run a published draw from its record and the public ticket list (same checks as FairDraw's fairdraw-verify.mjs).
 * `beaconRandomness` is the randomness fetched independently from drand for record.drand_round, or null to skip that
 * check (offline).
 */
export async function fairdrawVerify(record: FairdrawRecord, tickets: readonly number[], beaconRandomness: string | null): Promise<VerifyResult> {
  const problems: string[] = [];
  const t = fairdrawNormalise(tickets);
  // The randomness must not have existed at the close, or whoever closed the draw could have picked a round that
  // suits them (the same check as FairDraw's fairdraw-verify.mjs). Compare closed_at with the advertised close too.
  const close = Date.parse(record.closed_at) / 1000;
  if (record.drand_chain !== FAIRDRAW_DRAND_CHAIN) problems.push(`record uses drand chain ${record.drand_chain}, not quicknet`);
  if (!Number.isFinite(close)) problems.push('record has no valid closed_at');
  else if (fairdrawRoundTime(record.drand_round) <= close) {
    problems.push(`drand round ${record.drand_round} was published before the close at ${record.closed_at}: the randomness already existed when the list was committed`);
  }
  if (t.length !== record.tickets_sold) problems.push(`list has ${t.length} tickets, record says ${record.tickets_sold}`);
  const hash = await fairdrawEntriesHash(t);
  if (hash !== record.entries_hash) problems.push('entries hash does not match the published list');
  if (beaconRandomness !== null && beaconRandomness !== record.randomness) {
    problems.push(`randomness differs from drand round ${record.drand_round}`);
  }
  const winners = await fairdrawPick(t, record.randomness, record.winning_tickets.length);
  if (JSON.stringify(winners) !== JSON.stringify(record.winning_tickets)) {
    problems.push(`re-run gives ${winners.join(', ')}, record says ${record.winning_tickets.join(', ')}`);
  }
  return { ok: problems.length === 0, problems, winners };
}
