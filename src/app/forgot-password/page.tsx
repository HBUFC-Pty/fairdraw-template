import { FlashMessage } from '@/components/Flash';
import { forgotPasswordAction } from '../actions/auth';

export const metadata = { title: 'Reset your password' };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <h1>Reset your password</h1>
      <FlashMessage searchParams={await searchParams} />
      <form className="stack" action={forgotPasswordAction}>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <button type="submit">Email me a reset link</button>
      </form>
    </>
  );
}
