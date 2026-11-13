import { FlashMessage } from '@/components/Flash';
import { requirePasswordSession } from '@/lib/web/session';
import { redirect } from 'next/navigation';
import { totpLoginAction } from '../../actions/auth';

export const metadata = { title: 'Two-factor code' };

export default async function TotpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requirePasswordSession();
  if (!s.user.totpEnabledAt) redirect('/account/security');
  return (
    <>
      <h1>Enter your code</h1>
      <FlashMessage searchParams={await searchParams} />
      <form className="stack" action={totpLoginAction}>
        <label>
          6-digit code from your authenticator app
          <input name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required maxLength={6} />
        </label>
        <button type="submit">Continue</button>
      </form>
    </>
  );
}
