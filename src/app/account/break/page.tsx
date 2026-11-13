import Link from 'next/link';
import { requireUser } from '@/lib/web/session';
import { FlashMessage } from '@/components/Flash';
import { formatUk } from '@/lib/time';
import { selfExcludeAction, takeBreakAction } from '../../actions/account';

export const metadata = { title: 'Take a break' };

export default async function BreakPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireUser();
  const now = new Date();
  return (
    <>
      <h1>Take a break or self-exclude</h1>
      <FlashMessage searchParams={await searchParams} />
      {s.user.breakUntil && s.user.breakUntil > now ? <p className="notice warn">You are on a break until {formatUk(s.user.breakUntil)}.</p> : null}
      {s.user.selfExcludedUntil && s.user.selfExcludedUntil > now ? <p className="notice warn">You are self-excluded until {formatUk(s.user.selfExcludedUntil)}.</p> : null}
      <section className="card">
        <h2>Take a break</h2>
        <p>You will not be able to enter competitions until the break ends. A break cannot be shortened once started.</p>
        <form className="stack" action={takeBreakAction}>
          <label>How long
            <select name="length" required defaultValue="7d">
              <option value="1d">24 hours</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="42d">6 weeks</option>
            </select>
          </label>
          <label><input type="checkbox" name="confirm" value="yes" required /> I understand I cannot shorten the break</label>
          <button type="submit">Start my break</button>
        </form>
      </section>
      <section className="card">
        <h2>Self-exclude</h2>
        <p>
          For a longer stop. You cannot enter competitions or open a new account with this email until it ends, and it cannot be undone early. It still
          applies if you delete your account. For help, see <Link href="/responsible-play">responsible play</Link>.
        </p>
        <form className="stack" action={selfExcludeAction}>
          <label>How long
            <select name="length" required defaultValue="6m">
              <option value="6m">6 months</option><option value="1y">1 year</option><option value="2y">2 years</option><option value="5y">5 years</option>
            </select>
          </label>
          <label><input type="checkbox" name="confirm" value="yes" required /> I understand this cannot be undone early</label>
          <button type="submit" className="danger">Self-exclude</button>
        </form>
      </section>
    </>
  );
}
