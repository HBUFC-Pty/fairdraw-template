import { FlashMessage } from '@/components/Flash';
import { resetPasswordAction } from '../actions/auth';

export const metadata = { title: 'Choose a new password' };

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : '';
  return (
    <>
      <h1>Choose a new password</h1>
      <FlashMessage searchParams={sp} />
      <form className="stack" action={resetPasswordAction}>
        <input type="hidden" name="token" value={token} />
        <label>New password<span className="hint">At least 12 characters.</span><input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>
        <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>
        <button type="submit">Change password</button>
      </form>
    </>
  );
}
