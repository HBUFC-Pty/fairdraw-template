import QRCode from 'qrcode';
import { eq } from 'drizzle-orm';
import { requirePasswordSession } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { newTotpSecret, totpUri } from '@/lib/auth/totp';
import { STAFF_ROLES } from '@/lib/auth/service';
import { FlashMessage } from '@/components/Flash';
import { confirmTotpAction, disableTotpAction } from '../../actions/account';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Security' };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requirePasswordSession();
  if (s.user.totpEnabledAt && !s.session.mfaVerifiedAt) redirect('/login/2fa');
  const sp = await searchParams;
  const staff = STAFF_ROLES.includes(s.user.role);
  let qr: string | null = null;
  let secret: string | null = null;
  if (!s.user.totpEnabledAt) {
    // Keep one pending secret until it is confirmed, so reloading the page does not invalidate a scanned code.
    if (s.user.totpSecretEnc) secret = decryptSecret(env().APP_SECRET, s.user.totpSecretEnc);
    else {
      secret = newTotpSecret();
      await getDb().update(users).set({ totpSecretEnc: encryptSecret(env().APP_SECRET, secret) }).where(eq(users.id, s.user.id));
    }
    qr = await QRCode.toDataURL(totpUri(secret, s.user.email, env().SITE_NAME), { margin: 1, width: 220 });
  }
  return (
    <>
      <h1>Security</h1>
      <FlashMessage searchParams={sp} />
      {sp.setup === 'required' ? <p className="notice warn">Staff accounts must use two-factor authentication. Set it up below to continue to the admin area.</p> : null}
      <h2>Two-factor authentication</h2>
      {s.user.totpEnabledAt ? (
        <>
          <p>On. You will be asked for a code from your authenticator app each time you log in.</p>
          {staff ? <p className="muted">Required for staff accounts, so it cannot be switched off here.</p> : (
            <form className="stack" action={disableTotpAction}>
              <label>Current code<input name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required maxLength={6} /></label>
              <button type="submit" className="secondary">Switch off</button>
            </form>
          )}
        </>
      ) : (
        <>
          <p>Scan this QR code with an authenticator app (for example one built into your phone or password manager), then enter the 6-digit code it shows.</p>
          {qr ? <img className="qr" src={qr} alt="QR code for your authenticator app" /> : null}
          <p className="muted">Or enter this key by hand: <code>{secret}</code></p>
          <form className="stack" action={confirmTotpAction}>
            <label>6-digit code<input name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required maxLength={6} /></label>
            <button type="submit">Switch on</button>
          </form>
        </>
      )}
    </>
  );
}
