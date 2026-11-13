'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users, SPEND_PERIODS } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { assertSameOrigin, field } from '@/lib/web/request';
import { flashUrl } from '@/lib/web/flash';
import { clearSessionCookie, requirePasswordSession, requireUser } from '@/lib/web/session';
import { cancelPendingIncrease, PERIOD_LABEL, setLimit } from '@/lib/limits/spend';
import { BREAK_OPTIONS, deleteAccount, EXCLUSION_OPTIONS, selfExclude, setWinnerConsent, takeBreak } from '@/lib/account/service';
import { parsePounds, formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import { verifyPassword } from '@/lib/auth/password';
import { checkTotp } from '@/lib/auth/totp';
import { decryptSecret } from '@/lib/crypto';
import { markSessionMfa, STAFF_ROLES } from '@/lib/auth/service';
import { hit, RATE_RULES } from '@/lib/rate-limit';
import { appendAudit } from '@/lib/audit';

const period = z.enum(SPEND_PERIODS);

export async function setLimitAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireUser();
  const p = period.safeParse(field(fd, 'period'));
  if (!p.success) redirect('/account/limits');
  const raw = field(fd, 'amount');
  let next: number | null = null;
  if (raw !== '') {
    try {
      next = parsePounds(raw);
    } catch {
      redirect(flashUrl('/account/limits', { error: 'Enter the limit in pounds, for example 20, or leave it blank for no limit.' }));
    }
  }
  const r = await setLimit(getDb(), s.user.id, p.data, next);
  const what = `${PERIOD_LABEL[p.data]} limit ${next === null ? 'removed' : `set to ${formatPence(next)}`}`;
  redirect(flashUrl('/account/limits', { notice: r.applied === 'now' ? `${what}. This applies now.` : `${what}. Because this raises your limit, it takes effect on ${formatUk(r.effectiveAt)}. You can cancel it before then.` }));
}

export async function cancelIncreaseAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireUser();
  const p = period.safeParse(field(fd, 'period'));
  if (p.success) await cancelPendingIncrease(getDb(), s.user.id, p.data);
  redirect(flashUrl('/account/limits', { notice: 'Pending increase cancelled.' }));
}

export async function takeBreakAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireUser();
  const key = field(fd, 'length') as keyof typeof BREAK_OPTIONS;
  if (!(key in BREAK_OPTIONS) || field(fd, 'confirm') !== 'yes') redirect(flashUrl('/account/break', { error: 'Choose how long, and tick the box to confirm.' }));
  const until = await takeBreak(getDb(), s.user.id, BREAK_OPTIONS[key]);
  redirect(flashUrl('/account/break', { notice: `Your break has started. You cannot enter competitions until ${formatUk(until)}.` }));
}

export async function selfExcludeAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireUser();
  const key = field(fd, 'length') as keyof typeof EXCLUSION_OPTIONS;
  if (!(key in EXCLUSION_OPTIONS) || field(fd, 'confirm') !== 'yes') redirect(flashUrl('/account/break', { error: 'Choose how long, and tick the box to confirm.' }));
  const until = await selfExclude(getDb(), s.user.id, EXCLUSION_OPTIONS[key]);
  redirect(flashUrl('/account/break', { notice: `You are self-excluded until ${formatUk(until)}. This cannot be undone early.` }));
}

export async function winnerConsentAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireUser();
  const id = z.uuid().safeParse(field(fd, 'competitionId'));
  if (!id.success) redirect('/account');
  const consent = field(fd, 'consent') === 'yes';
  await setWinnerConsent(getDb(), s.user.id, id.data, consent);
  redirect(flashUrl('/account', { notice: consent ? 'Thank you: your first name and initial will show on the results.' : 'Your name will not be shown on the results.' }));
}

export async function deleteAccountAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireUser();
  if (STAFF_ROLES.includes(s.user.role)) redirect(flashUrl('/account/delete', { error: 'Staff accounts must be removed by the site owner first.' }));
  if (field(fd, 'confirm') !== 'yes' || !(await verifyPassword(s.user.passwordHash, field(fd, 'password')))) {
    redirect(flashUrl('/account/delete', { error: 'Enter your password and tick the box to confirm.' }));
  }
  await deleteAccount(getDb(), s.user.id);
  await clearSessionCookie();
  redirect(flashUrl('/', { notice: 'Your account has been deleted.' }));
}

export async function confirmTotpAction(fd: FormData) {
  await assertSameOrigin();
  const db = getDb();
  const s = await requirePasswordSession();
  if (!(await hit(db, `totp:${s.user.id}`, RATE_RULES.totp))) redirect(flashUrl('/account/security', { error: 'Too many attempts. Wait 15 minutes.' }));
  if (!s.user.totpSecretEnc || s.user.totpEnabledAt) redirect('/account/security');
  const step = checkTotp(decryptSecret(env().APP_SECRET, s.user.totpSecretEnc), field(fd, 'code'), new Date(), null);
  if (step === null) redirect(flashUrl('/account/security', { error: 'That code is not right. Scan the QR code again and enter the current code.' }));
  await db.update(users).set({ totpEnabledAt: new Date(), totpLastStep: step }).where(eq(users.id, s.user.id));
  await markSessionMfa(db, s.token);
  if (STAFF_ROLES.includes(s.user.role)) await appendAudit(db, { id: s.user.id, role: s.user.role }, { action: 'staff.totp_enabled', targetType: 'user', targetId: s.user.id });
  redirect(flashUrl(STAFF_ROLES.includes(s.user.role) ? '/admin' : '/account/security', { notice: 'Two-factor authentication is on.' }));
}

export async function disableTotpAction(fd: FormData) {
  await assertSameOrigin();
  const db = getDb();
  const s = await requireUser();
  if (STAFF_ROLES.includes(s.user.role)) redirect(flashUrl('/account/security', { error: 'Two-factor authentication is required for staff accounts.' }));
  if (!s.user.totpSecretEnc) redirect('/account/security');
  const step = checkTotp(decryptSecret(env().APP_SECRET, s.user.totpSecretEnc), field(fd, 'code'), new Date(), s.user.totpLastStep);
  if (step === null) redirect(flashUrl('/account/security', { error: 'That code is not right.' }));
  await db.update(users).set({ totpEnabledAt: null, totpSecretEnc: null, totpLastStep: null }).where(eq(users.id, s.user.id));
  redirect(flashUrl('/account/security', { notice: 'Two-factor authentication is off.' }));
}
