import { verifyEmailAction } from '../actions/auth';

export const metadata = { title: 'Confirm your email' };

/* The link in the email lands here; the confirmation itself is a POST so that link scanners cannot use the token. */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await searchParams).token;
  return (
    <>
      <h1>Confirm your email</h1>
      {typeof token === 'string' ? (
        <form action={verifyEmailAction}>
          <input type="hidden" name="token" value={token} />
          <button type="submit">Confirm my email address</button>
        </form>
      ) : (
        <p>This link is incomplete. Open the link from your email again.</p>
      )}
    </>
  );
}
