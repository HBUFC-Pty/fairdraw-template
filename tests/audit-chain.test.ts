import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { appendAudit, canonicalJson, GENESIS_HASH, verifyAuditChain } from '../src/lib/audit';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

const admin = { id: '6f1d8c56-3a5c-4b8e-9a59-2a1f6f0d9b11', role: 'admin' };

describe('hash-chained audit log', () => {
  it('chains entries and verifies', async () => {
    const a = await appendAudit(db, admin, { action: 'competition.publish', targetType: 'competition', targetId: 'c1', details: { b: 2, a: 1 } });
    const b = await appendAudit(db, admin, { action: 'refund.issue', targetType: 'order', targetId: 'o1', details: { amount: 250 } });
    expect(a.prevHash).toBe(GENESIS_HASH);
    expect(b.prevHash).toBe(a.hash);
    expect(await verifyAuditChain(db)).toEqual({ ok: true, entries: 2, firstBadId: null });
  });

  it('serialises concurrent writers into one chain', async () => {
    await Promise.all(Array.from({ length: 15 }, (_, i) => appendAudit(db, admin, { action: 'x', targetType: 't', targetId: String(i) })));
    expect((await verifyAuditChain(db)).ok).toBe(true);
  });

  it('detects an edited entry even if someone bypasses the trigger', async () => {
    await appendAudit(db, admin, { action: 'a', targetType: 't', targetId: '1' });
    const second = await appendAudit(db, admin, { action: 'b', targetType: 't', targetId: '2', details: { amount: 100 } });
    await appendAudit(db, admin, { action: 'c', targetType: 't', targetId: '3' });
    await db.execute(sql`ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_update`);
    await db.execute(sql`UPDATE audit_log SET details = '{"amount": 1}' WHERE id = ${second.id}`);
    const r = await verifyAuditChain(db);
    expect(r.ok).toBe(false);
    expect(r.firstBadId).toBe(second.id);
  });

  it('detects a deleted entry', async () => {
    await appendAudit(db, admin, { action: 'a', targetType: 't', targetId: '1' });
    const second = await appendAudit(db, admin, { action: 'b', targetType: 't', targetId: '2' });
    const third = await appendAudit(db, admin, { action: 'c', targetType: 't', targetId: '3' });
    await db.execute(sql`ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_update`);
    await db.execute(sql`DELETE FROM audit_log WHERE id = ${second.id}`);
    const r = await verifyAuditChain(db);
    expect(r.ok).toBe(false);
    expect(r.firstBadId).toBe(third.id);
  });

  it('canonical JSON sorts keys at every level', () => {
    expect(canonicalJson({ b: [{ d: 1, c: 2 }], a: null })).toBe('{"a":null,"b":[{"c":2,"d":1}]}');
  });
});
