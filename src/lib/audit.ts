/**
 * Append-only, hash-chained audit log of every admin action and every automatic fairness step (close, commit, draw).
 *
 * Each entry's hash is SHA-256 over the previous entry's hash and a canonical JSON form of the entry, so removing,
 * reordering or editing any entry breaks the chain from that point on. The database also refuses UPDATE, DELETE and
 * TRUNCATE on the table (drizzle/0001_fairness_guards.sql). Store ids, never names or other personal details.
 */
import { asc, desc, sql } from 'drizzle-orm';
import type { Db } from './db';
import { auditLog } from './db/schema';
import { sha256Hex } from './crypto';

export const GENESIS_HASH = '0'.repeat(64);

export interface AuditActor {
  id: string | null;
  role: string; // 'system' for the scheduled worker
}

export interface AuditEntryInput {
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}

/** JSON with object keys sorted at every level, so the same entry always hashes the same way. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(',')}}`;
}

export function entryHash(prevHash: string, e: { at: string; actorId: string | null; actorRole: string; action: string; targetType: string; targetId: string; details: Record<string, unknown> }): string {
  return sha256Hex(`${prevHash}\n${canonicalJson({ at: e.at, actorId: e.actorId, actorRole: e.actorRole, action: e.action, targetType: e.targetType, targetId: e.targetId, details: e.details })}`);
}

export async function appendAudit(db: Db, actor: AuditActor, entry: AuditEntryInput, now = new Date()) {
  return db.transaction(async (tx) => {
    // One writer at a time, so two entries never share a previous hash.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(727274)`);
    const [last] = await tx.select({ hash: auditLog.hash }).from(auditLog).orderBy(desc(auditLog.id)).limit(1);
    const prevHash = last?.hash ?? GENESIS_HASH;
    const row = {
      at: now.toISOString(),
      actorId: actor.id,
      actorRole: actor.role,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      details: JSON.parse(JSON.stringify(entry.details ?? {})) as Record<string, unknown>,
    };
    const hash = entryHash(prevHash, row);
    const [inserted] = await tx.insert(auditLog).values({ ...row, prevHash, hash }).returning();
    return inserted!;
  });
}

export interface ChainCheck {
  ok: boolean;
  entries: number;
  firstBadId: number | null;
  reason?: string;
}

/** Walk the whole chain and recompute every hash. */
export async function verifyAuditChain(db: Db): Promise<ChainCheck> {
  const rows = await db.select().from(auditLog).orderBy(asc(auditLog.id));
  let prev = GENESIS_HASH;
  for (const r of rows) {
    if (r.prevHash !== prev) return { ok: false, entries: rows.length, firstBadId: r.id, reason: 'previous hash does not match' };
    if (entryHash(prev, r) !== r.hash) return { ok: false, entries: rows.length, firstBadId: r.id, reason: 'entry hash does not match its contents' };
    prev = r.hash;
  }
  return { ok: true, entries: rows.length, firstBadId: null };
}
