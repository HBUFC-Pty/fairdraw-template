import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '../db';
import { env } from '../env';
import { validateSession, STAFF_ROLES } from '../auth/service';
import type { Role } from '../db/schema';

/** The only cookie this site sets: strictly necessary for logging in, so no consent banner is needed (PECR). */
export function sessionCookieName(): string {
  return env().COOKIE_SECURE ? '__Host-fd_session' : 'fd_session';
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true,
    secure: env().COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete({ name: sessionCookieName(), path: '/' });
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(sessionCookieName())?.value;
}

/** The logged-in user for this request, or null. Cached per request. */
export const currentSession = cache(async () => {
  const token = await sessionToken();
  if (!token) return null;
  const s = await validateSession(getDb(), token);
  return s ? { ...s, token } : null;
});

/** A logged-in user who has passed two-factor authentication if they have it switched on. */
export async function requireUser() {
  const s = await currentSession();
  if (!s) redirect('/login');
  if (s.user.totpEnabledAt && !s.session.mfaVerifiedAt) redirect('/login/2fa');
  return s;
}

/** Logged in with a password, whether or not the second factor is done yet (for the 2FA pages themselves). */
export async function requirePasswordSession() {
  const s = await currentSession();
  if (!s) redirect('/login');
  return s;
}

export function isStaff(role: Role) {
  return STAFF_ROLES.includes(role);
}

/**
 * Staff pages: the role must be allowed, and the session must have passed TOTP two-factor authentication. Staff
 * without 2FA set up are sent to set it up first: 2FA is mandatory for every admin role.
 */
export async function requireStaff(allowed: readonly Role[] = STAFF_ROLES) {
  const s = await requireUser();
  if (!isStaff(s.user.role) || !allowed.includes(s.user.role)) redirect('/');
  if (!s.user.totpEnabledAt) redirect('/account/security?setup=required');
  if (!s.session.mfaVerifiedAt) redirect('/login/2fa');
  return s;
}
