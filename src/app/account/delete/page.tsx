import { requireUser } from '@/lib/web/session';
import { FlashMessage } from '@/components/Flash';
import { DELETION_RETAINED } from '@/lib/account/service';
import { deleteAccountAction } from '../../actions/account';

export const metadata = { title: 'Delete your account' };

export default async function DeletePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  return (
    <>
      <h1>Delete your account</h1>
      <FlashMessage searchParams={await searchParams} />
      <p>
        This erases your name, email address, date of birth, password, limits and sessions, and logs you out. It cannot be undone. Any tickets you hold in
        competitions that have not been drawn yet stay in those draws, but we will have no way to contact you if you win.
      </p>
      <h2>What we have to keep, and why</h2>
      <ul>{DELETION_RETAINED.map((r) => <li key={r}>{r}</li>)}</ul>
      <form className="stack" action={deleteAccountAction}>
        <label>Your password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
        <label><input type="checkbox" name="confirm" value="yes" required /> I understand my account will be deleted permanently</label>
        <button type="submit" className="danger">Delete my account</button>
      </form>
    </>
  );
}
