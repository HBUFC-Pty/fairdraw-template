import Link from 'next/link';
import { FlashMessage } from '@/components/Flash';
import { signUpAction } from '../actions/auth';

export const metadata = { title: 'Sign up' };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <h1>Sign up</h1>
      <FlashMessage searchParams={await searchParams} />
      <p>You must be 18 or over. We ask for your date of birth to check this.</p>
      <form className="stack" action={signUpAction}>
        <label>First name<input name="firstName" autoComplete="given-name" required maxLength={80} /></label>
        <label>Last name<input name="lastName" autoComplete="family-name" required maxLength={80} /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Date of birth<input name="dateOfBirth" type="date" autoComplete="bday" required /></label>
        <label>
          Password<span className="hint">At least 12 characters. A few random words works well.</span>
          <input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} />
        </label>
        <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>
        <label>
          Monthly spend limit (optional)
          <span className="hint">In pounds. You can set daily and weekly limits too, or change this later. Lowering a limit takes effect at once.</span>
          <input name="monthlyLimit" inputMode="decimal" placeholder="for example 50" maxLength={12} />
        </label>
        <label><input type="checkbox" name="over18" value="yes" required /> I am 18 or over</label>
        <label><input type="checkbox" name="terms" value="yes" required /> I accept the <Link href="/terms">terms</Link> and have read the <Link href="/privacy">privacy notice</Link></label>
        <button type="submit">Create account</button>
      </form>
      <p>Already signed up? <Link href="/login">Log in</Link>.</p>
    </>
  );
}
