/*
 * The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may
 * not use this file except in compliance with the License. You may obtain a copy of the License at
 * https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections
 * 14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for
 * the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
 * Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either
 * express or implied. See the License for the specific language governing rights and limitations under the License.
 * The Original Code is FairDraw operator template.
 * The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are
 * Copyright (c) 2026 Harrison Jones. All Rights Reserved.
 */
/**
 * Account and session logic, independent of Next.js so it can be tested against a real (in-process) Postgres.
 * Server Actions in src/app call these after validating input with Zod and checking rate limits.
 */
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import type { Db } from '../db';
import { authTokens, exclusions, sessions, spendLimits, users, type Role } from '../db/schema';
import { env } from '../env';
import { hmacHex, randomToken, sha256Hex } from '../crypto';
import { hashPassword, verifyPassword } from './password';
import { getAgeVerifier } from './age';

export const STAFF_ROLES: readonly Role[] = ['support', 'admin', 'owner'];
export const PLAYER_SESSION_DAYS = 30;
export const STAFF_SESSION_HOURS = 12;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Hash of an email for the exclusion list, which outlives account deletion. */
export function exclusionKey(email: string): string {
  return hmacHex(env().APP_SECRET, `exclusion:${normaliseEmail(email)}`);
}

export async function isExcludedEmail(db: Db, email: string, now: Date): Promise<boolean> {
  const rows = await db
    .select({ until: exclusions.until })
    .from(exclusions)
    .where(and(eq(exclusions.emailHash, exclusionKey(email)), gt(exclusions.until, now)));
  return rows.length > 0;
}

// Sessions -----------------------------------------------------------------------------------------------------------

export async function createSession(db: Db, userId: string, role: Role, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const ms = STAFF_ROLES.includes(role) ? STAFF_SESSION_HOURS * 3600_000 : PLAYER_SESSION_DAYS * 86400_000;
  const expiresAt = new Date(now.getTime() + ms);
  await db.insert(sessions).values({ idHash: sha256Hex(token), userId, createdAt: now, expiresAt, lastSeenAt: now });
  return { token, expiresAt };
}

export type SessionUser = typeof users.$inferSelect;

export async function validateSession(db: Db, token: string | undefined, now = new Date()) {
  if (!token || token.length > 100) return null;
  const idHash = sha256Hex(token);
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.idHash, idHash), gt(sessions.expiresAt, now), isNull(users.deletedAt)));
  const row = rows[0];
  if (!row) return null;
  if (now.getTime() - row.session.lastSeenAt.getTime() > 5 * 60_000) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.idHash, idHash));
  }
  return row;
}

export async function deleteSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.idHash, sha256Hex(token)));
}

export async function deleteAllSessions(db: Db, userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function markSessionMfa(db: Db, token: string, now = new Date()) {
  await db.update(sessions).set({ mfaVerifiedAt: now }).where(eq(sessions.idHash, sha256Hex(token)));
}

// Email tokens -------------------------------------------------------------------------------------------------------

type TokenPurpose = 'verify_email' | 'reset_password';
const TOKEN_TTL: Record<TokenPurpose, number> = { verify_email: 48 * 3600_000, reset_password: 3600_000 };

export async function createEmailToken(db: Db, userId: string, purpose: TokenPurpose, now = new Date()): Promise<string> {
  const token = randomToken();
  await db.insert(authTokens).values({ tokenHash: sha256Hex(token), userId, purpose, createdAt: now, expiresAt: new Date(now.getTime() + TOKEN_TTL[purpose]) });
  return token;
}

/** Use a token once. Returns the user id, or null if the token is unknown, used, expired or for another purpose. */
export async function consumeEmailToken(db: Db, token: string, purpose: TokenPurpose, now = new Date()): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const rows = await db
    .update(authTokens)
    .set({ usedAt: now })
    .where(and(eq(authTokens.tokenHash, sha256Hex(token)), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, now)))
    .returning({ userId: authTokens.userId });
  return rows[0]?.userId ?? null;
}

export async function pruneTokensAndSessions(db: Db, now = new Date()) {
  await db.delete(authTokens).where(lt(authTokens.expiresAt, now));
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}

// Sign-up, verification, login, reset --------------------------------------------------------------------------------

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  monthlyLimitPence: number | null;
}

export type SignUpResult =
  | { status: 'created'; userId: string; verifyToken: string }
  | { status: 'exists' }
  | { status: 'underage'; reason: string }
  | { status: 'excluded' };

export async function signUp(db: Db, input: SignUpInput, now = new Date()): Promise<SignUpResult> {
  const email = normaliseEmail(input.email);
  const age = await getAgeVerifier().verify({ userId: '', dateOfBirth: input.dateOfBirth, firstName: input.firstName, lastName: input.lastName }, now);
  if (!age.passed) return { status: 'underage', reason: age.reason ?? 'You must be 18 or over to play.' };
  if (await isExcludedEmail(db, email, now)) return { status: 'excluded' };
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) return { status: 'exists' };
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        dateOfBirth: input.dateOfBirth,
        ageCheckMethod: age.method,
        ageCheckedAt: now,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (!u) return { status: 'exists' } as const;
    if (input.monthlyLimitPence !== null) {
      await tx.insert(spendLimits).values({ userId: u.id, period: 'month', limitPence: input.monthlyLimitPence, updatedAt: now });
    }
    const verifyToken = await createEmailToken(tx, u.id, 'verify_email', now);
    return { status: 'created', userId: u.id, verifyToken } as const;
  });
}

export async function verifyEmail(db: Db, token: string, now = new Date()): Promise<boolean> {
  const userId = await consumeEmailToken(db, token, 'verify_email', now);
  if (!userId) return false;
  await db.update(users).set({ emailVerifiedAt: now }).where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
  return true;
}

export type LoginResult =
  | { status: 'ok'; user: SessionUser }
  | { status: 'invalid' }
  | { status: 'unverified'; userId: string };

export async function checkLogin(db: Db, emailInput: string, password: string, now = new Date()): Promise<LoginResult> {
  const email = normaliseEmail(emailInput);
  const [user] = await db.select().from(users).where(and(eq(users.email, email), isNull(users.deletedAt)));
  const ok = await verifyPassword(user?.passwordHash ?? null, password);
  if (!user || !ok) return { status: 'invalid' };
  if (!user.emailVerifiedAt) return { status: 'unverified', userId: user.id };
  await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, user.id));
  return { status: 'ok', user };
}

/** Returns a reset token when the account exists, otherwise null. Callers must show the same message either way. */
export async function requestPasswordReset(db: Db, emailInput: string, now = new Date()): Promise<{ userId: string; token: string } | null> {
  const [user] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, normaliseEmail(emailInput)), isNull(users.deletedAt)));
  if (!user) return null;
  return { userId: user.id, token: await createEmailToken(db, user.id, 'reset_password', now) };
}

export async function resetPassword(db: Db, token: string, newPassword: string, now = new Date()): Promise<boolean> {
  const userId = await consumeEmailToken(db, token, 'reset_password', now);
  if (!userId) return false;
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, emailVerifiedAt: now }).where(eq(users.id, userId));
  await deleteAllSessions(db, userId);
  return true;
}
