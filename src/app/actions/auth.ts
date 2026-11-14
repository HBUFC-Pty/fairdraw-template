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
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { hit, RATE_RULES } from '@/lib/rate-limit';
import { assertSameOrigin, clientIp, field } from '@/lib/web/request';
import { flashUrl } from '@/lib/web/flash';
import { clearSessionCookie, currentSession, requirePasswordSession, sessionToken, setSessionCookie } from '@/lib/web/session';
import {
  checkLogin,
  createEmailToken,
  createSession,
  deleteSession,
  markSessionMfa,
  normaliseEmail,
  requestPasswordReset,
  resetPassword,
  signUp,
  STAFF_ROLES,
  verifyEmail,
} from '@/lib/auth/service';
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/password';
import { isValidDateOfBirth } from '@/lib/auth/age';
import { accountExistsMail, resetMail, trySendMail, verifyEmailMail } from '@/lib/mail';
import { parsePounds } from '@/lib/money';
import { checkTotp } from '@/lib/auth/totp';
import { decryptSecret } from '@/lib/crypto';
import { demoMode, DEMO_NO_EMAIL, DEMO_WELCOME } from '@/lib/demo';

const password = z.string().min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`).max(256);

const signUpSchema = z
  .object({
    email: z.email('Enter a valid email address.').max(254),
    password,
    confirm: z.string(),
    firstName: z.string().trim().min(1, 'Enter your first name.').max(80),
    lastName: z.string().trim().min(1, 'Enter your last name.').max(80),
    dateOfBirth: z.string().refine((d) => isValidDateOfBirth(d, new Date()), 'Enter a valid date of birth.'),
    monthlyLimit: z.string().max(12),
    over18: z.literal('yes', 'You must confirm you are 18 or over.'),
    terms: z.literal('yes', 'You must accept the terms.'),
  })
  .refine((v) => v.password === v.confirm, { message: 'The passwords do not match.', path: ['confirm'] });

function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? 'Please check the form.';
}

export async function signUpAction(fd: FormData) {
  await assertSameOrigin();
  const db = getDb();
  if (!(await hit(db, `signup:${await clientIp()}`, RATE_RULES.signup))) redirect(flashUrl('/signup', { error: 'Too many sign-ups from this connection. Try again later.' }));
  const parsed = signUpSchema.safeParse(Object.fromEntries(['email', 'password', 'confirm', 'firstName', 'lastName', 'dateOfBirth', 'monthlyLimit', 'over18', 'terms'].map((k) => [k, field(fd, k)])));
  if (!parsed.success) redirect(flashUrl('/signup', { error: firstError(parsed.error) }));
  let monthlyLimitPence: number | null = null;
  if (parsed.data.monthlyLimit) {
    try {
      monthlyLimitPence = parsePounds(parsed.data.monthlyLimit);
    } catch {
      redirect(flashUrl('/signup', { error: 'Enter the monthly limit in pounds, for example 50.' }));
    }
  }
  const r = await signUp(db, { ...parsed.data, monthlyLimitPence });
  const base = env().APP_URL;
  if (r.status === 'underage') redirect(flashUrl('/signup', { error: r.reason }));
  if (r.status === 'excluded') redirect(flashUrl('/signup', { error: 'This email address is self-excluded. You cannot open an account until the exclusion ends.' }));
  if (demoMode()) {
    // A demo sends no email, so the confirmation step is skipped and the visitor is logged in straight away.
    if (r.status === 'exists') redirect(flashUrl('/signup', { error: 'That made-up email is already in use here. Change it a little and try again.' }));
    await verifyEmail(db, r.verifyToken);
    const old = await sessionToken();
    if (old) await deleteSession(db, old);
    const s = await createSession(db, r.userId, 'player');
    await setSessionCookie(s.token, s.expiresAt);
    redirect(flashUrl('/', { notice: DEMO_WELCOME }));
  }
  if (r.status === 'created') await trySendMail(verifyEmailMail(normaliseEmail(parsed.data.email), `${base}/verify-email?token=${r.verifyToken}`));
  if (r.status === 'exists') await trySendMail(accountExistsMail(normaliseEmail(parsed.data.email), `${base}/login`, `${base}/forgot-password`));
  // The same message either way, so the form does not reveal which emails have accounts.
  redirect(flashUrl('/login', { notice: 'Check your email: we have sent you a link to confirm your address.' }));
}

export async function verifyEmailAction(fd: FormData) {
  await assertSameOrigin();
  const ok = await verifyEmail(getDb(), field(fd, 'token'));
  redirect(flashUrl('/login', ok ? { notice: 'Email confirmed. You can now log in.' } : { error: 'That link has expired or has already been used.' }));
}

export async function resendVerificationAction(fd: FormData) {
  await assertSameOrigin();
  if (demoMode()) redirect(flashUrl('/login', { error: DEMO_NO_EMAIL }));
  const db = getDb();
  const email = normaliseEmail(field(fd, 'email'));
  if (await hit(db, `verify:${email}`, RATE_RULES.verifyResend)) {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    if (u && !u.emailVerifiedAt && !u.deletedAt) {
      const token = await createEmailToken(db, u.id, 'verify_email');
      await trySendMail(verifyEmailMail(email, `${env().APP_URL}/verify-email?token=${token}`));
    }
  }
  redirect(flashUrl('/login', { notice: 'If that address has an unconfirmed account, we have sent a new link.' }));
}

export async function loginAction(fd: FormData) {
  await assertSameOrigin();
  const db = getDb();
  const email = normaliseEmail(field(fd, 'email')).slice(0, 254);
  const ip = await clientIp();
  if (!(await hit(db, `login:${ip}`, RATE_RULES.login)) || !(await hit(db, `login-email:${email}`, RATE_RULES.loginEmail))) {
    redirect(flashUrl('/login', { error: 'Too many attempts. Wait 15 minutes and try again.' }));
  }
  const r = await checkLogin(db, email, field(fd, 'password').slice(0, 256));
  if (r.status === 'invalid') redirect(flashUrl('/login', { error: 'That email and password do not match an account.' }));
  if (r.status === 'unverified') redirect(flashUrl('/login?resend=1', { error: 'Please confirm your email address first. We can send a new link.' }));
  const old = await sessionToken();
  if (old) await deleteSession(db, old);
  const s = await createSession(db, r.user.id, r.user.role);
  await setSessionCookie(s.token, s.expiresAt);
  if (r.user.totpEnabledAt) redirect('/login/2fa');
  if (STAFF_ROLES.includes(r.user.role)) redirect('/account/security?setup=required');
  redirect('/account');
}

export async function totpLoginAction(fd: FormData) {
  await assertSameOrigin();
  const db = getDb();
  const s = await requirePasswordSession();
  if (!(await hit(db, `totp:${s.user.id}`, RATE_RULES.totp))) redirect(flashUrl('/login/2fa', { error: 'Too many attempts. Wait 15 minutes.' }));
  if (!s.user.totpSecretEnc || !s.user.totpEnabledAt) redirect('/account');
  const step = checkTotp(decryptSecret(env().APP_SECRET, s.user.totpSecretEnc), field(fd, 'code'), new Date(), s.user.totpLastStep);
  if (step === null) redirect(flashUrl('/login/2fa', { error: 'That code is not right. Check your authenticator app and try again.' }));
  await db.update(users).set({ totpLastStep: step }).where(eq(users.id, s.user.id));
  await markSessionMfa(db, s.token);
  redirect(STAFF_ROLES.includes(s.user.role) ? '/admin' : '/account');
}

export async function logoutAction() {
  await assertSameOrigin();
  const s = await currentSession();
  if (s) await deleteSession(getDb(), s.token);
  await clearSessionCookie();
  redirect('/');
}

export async function forgotPasswordAction(fd: FormData) {
  await assertSameOrigin();
  if (demoMode()) redirect(flashUrl('/login', { error: DEMO_NO_EMAIL }));
  const db = getDb();
  const email = normaliseEmail(field(fd, 'email')).slice(0, 254);
  if ((await hit(db, `reset:${await clientIp()}`, RATE_RULES.reset)) && (await hit(db, `reset-email:${email}`, RATE_RULES.reset))) {
    const r = await requestPasswordReset(db, email);
    if (r) await trySendMail(resetMail(email, `${env().APP_URL}/reset-password?token=${r.token}`));
  }
  redirect(flashUrl('/login', { notice: 'If that address has an account, we have emailed a link to reset the password. It lasts one hour.' }));
}

export async function resetPasswordAction(fd: FormData) {
  await assertSameOrigin();
  if (demoMode()) redirect(flashUrl('/login', { error: DEMO_NO_EMAIL }));
  const token = field(fd, 'token');
  const parsed = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, 'The passwords do not match.').safeParse({ password: field(fd, 'password'), confirm: field(fd, 'confirm') });
  if (!parsed.success) redirect(flashUrl(`/reset-password?token=${encodeURIComponent(token)}`, { error: firstError(parsed.error) }));
  const ok = await resetPassword(getDb(), token, parsed.data.password);
  redirect(flashUrl('/login', ok ? { notice: 'Password changed. Please log in.' } : { error: 'That link has expired or has already been used.' }));
}
