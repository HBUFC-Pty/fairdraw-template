import Link from 'next/link';
import { FlashMessage } from '@/components/Flash';
import { loginAction, resendVerificationAction } from '../actions/auth';

export const metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <h1>Log in</h1>
      <FlashMessage searchParams={sp} />
      <form className="stack" action={loginAction}>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
        <button type="submit">Log in</button>
      </form>
      <p><Link href="/forgot-password">Forgotten your password?</Link> · <Link href="/signup">Sign up</Link></p>
      {sp.resend ? (
        <form className="stack" action={resendVerificationAction}>
          <label>Send a new confirmation link to<input name="email" type="email" required maxLength={254} /></label>
          <button type="submit" className="secondary">Send link</button>
        </form>
      ) : null}
    </>
  );
}
