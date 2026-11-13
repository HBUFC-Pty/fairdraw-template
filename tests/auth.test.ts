import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { spendLimits, users } from '../src/lib/db/schema';
import {
  checkLogin,
  createSession,
  deleteSession,
  requestPasswordReset,
  resetPassword,
  signUp,
  validateSession,
  verifyEmail,
} from '../src/lib/auth/service';
import { hit, RATE_RULES } from '../src/lib/rate-limit';
import { checkTotp, newTotpSecret, totpCode } from '../src/lib/auth/totp';
import { decryptSecret, encryptSecret, sha256Hex } from '../src/lib/crypto';
import { selfExclude, deleteAccount } from '../src/lib/account/service';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

const input = { email: ' Alex@Example.TEST ', password: 'a long enough password', firstName: 'Alex', lastName: 'Morgan', dateOfBirth: '1995-03-04', monthlyLimitPence: 5000 };

describe('auth flows', () => {
  it('sign up, verify email, log in, session, log out', async () => {
    const r = await signUp(db, input);
    expect(r.status).toBe('created');
    if (r.status !== 'created') return;
    const [u] = await db.select().from(users).where(eq(users.id, r.userId));
    expect(u!.email).toBe('alex@example.test');
    expect(u!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(u!.dateOfBirth).toBe('1995-03-04');
    const [lim] = await db.select().from(spendLimits).where(eq(spendLimits.userId, r.userId));
    expect(lim!.limitPence).toBe(5000);

    expect((await checkLogin(db, 'alex@example.test', input.password)).status).toBe('unverified');
    expect(await verifyEmail(db, r.verifyToken)).toBe(true);
    expect(await verifyEmail(db, r.verifyToken)).toBe(false);
    expect((await checkLogin(db, 'ALEX@example.test', 'wrong password!!')).status).toBe('invalid');
    expect((await checkLogin(db, 'nobody@example.test', input.password)).status).toBe('invalid');
    const ok = await checkLogin(db, 'alex@example.test', input.password);
    expect(ok.status).toBe('ok');

    const s = await createSession(db, r.userId, 'player');
    const v = await validateSession(db, s.token);
    expect(v?.user.id).toBe(r.userId);
    // Only the hash of the session id is stored.
    const raw = await db.execute(`SELECT id_hash FROM sessions`);
    expect(JSON.stringify(raw)).not.toContain(s.token);
    expect(JSON.stringify(raw)).toContain(sha256Hex(s.token));
    expect(await validateSession(db, s.token, new Date(Date.now() + 31 * 86400_000))).toBeNull();
    await deleteSession(db, s.token);
    expect(await validateSession(db, s.token)).toBeNull();
  });

  it('refuses under-18s and duplicate emails', async () => {
    expect((await signUp(db, { ...input, dateOfBirth: '2010-01-01' })).status).toBe('underage');
    expect((await signUp(db, input)).status).toBe('created');
    expect((await signUp(db, { ...input, email: 'alex@example.test' })).status).toBe('exists');
  });

  it('password reset is single use, expires, and ends every session', async () => {
    const r = await signUp(db, input);
    if (r.status !== 'created') throw new Error();
    await verifyEmail(db, r.verifyToken);
    const s = await createSession(db, r.userId, 'player');
    expect(await requestPasswordReset(db, 'unknown@example.test')).toBeNull();
    const reset = await requestPasswordReset(db, input.email);
    expect(await resetPassword(db, reset!.token, 'a brand new password', new Date(Date.now() + 2 * 3600_000))).toBe(false);
    expect(await resetPassword(db, reset!.token, 'a brand new password')).toBe(true);
    expect(await resetPassword(db, reset!.token, 'another new password')).toBe(false);
    expect(await validateSession(db, s.token)).toBeNull();
    expect((await checkLogin(db, input.email, 'a brand new password')).status).toBe('ok');
    expect((await checkLogin(db, input.email, input.password)).status).toBe('invalid');
  });

  it('staff sessions are short', async () => {
    const r = await signUp(db, input);
    if (r.status !== 'created') throw new Error();
    const s = await createSession(db, r.userId, 'admin');
    expect(await validateSession(db, s.token, new Date(Date.now() + 13 * 3600_000))).toBeNull();
  });

  it('a self-excluded person cannot sign up again after deleting their account', async () => {
    const r = await signUp(db, input);
    if (r.status !== 'created') throw new Error();
    await selfExclude(db, r.userId, 182);
    await deleteAccount(db, r.userId);
    expect((await signUp(db, input)).status).toBe('excluded');
  });
});

describe('rate limiting', () => {
  it('allows up to the limit in a window, then refuses, then resets', async () => {
    const now = new Date('2026-11-13T10:00:00Z');
    for (let i = 0; i < RATE_RULES.loginEmail.limit; i++) expect(await hit(db, 'login:a', RATE_RULES.loginEmail, now)).toBe(true);
    expect(await hit(db, 'login:a', RATE_RULES.loginEmail, now)).toBe(false);
    expect(await hit(db, 'login:b', RATE_RULES.loginEmail, now)).toBe(true);
    expect(await hit(db, 'login:a', RATE_RULES.loginEmail, new Date(now.getTime() + 16 * 60_000))).toBe(true);
  });
});

describe('TOTP two-factor', () => {
  it('accepts the current code once and refuses replays and wrong codes', () => {
    const secret = newTotpSecret();
    const now = new Date('2026-11-13T10:00:00Z');
    const code = totpCode(secret, now);
    const step = checkTotp(secret, code, now, null);
    expect(step).not.toBeNull();
    expect(checkTotp(secret, code, now, step)).toBeNull();
    expect(checkTotp(secret, '000000', now, null) === null || totpCode(secret, now) === '000000').toBe(true);
    expect(checkTotp(secret, 'abcdef', now, null)).toBeNull();
    expect(checkTotp(secret, totpCode(secret, new Date(now.getTime() - 30_000)), now, null)).not.toBeNull();
    expect(checkTotp(secret, totpCode(secret, new Date(now.getTime() - 120_000)), now, null)).toBeNull();
  });

  it('stores the seed encrypted', () => {
    const enc = encryptSecret('k'.repeat(40), 'JBSWY3DPEHPK3PXP');
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret('k'.repeat(40), enc)).toBe('JBSWY3DPEHPK3PXP');
    expect(() => decryptSecret('j'.repeat(40), enc)).toThrow();
  });
});
