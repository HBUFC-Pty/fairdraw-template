import Link from 'next/link';
import { env } from '@/lib/env';

export const metadata = { title: 'Free entry by post' };

export default function FreeEntryPage() {
  const e = env();
  return (
    <article>
      <h1>Free entry by post</h1>
      <p>You can enter any of our competitions for free. A free entry has exactly the same chance of winning as a paid one.</p>
      <ol>
        <li>Write your full name, postal address, email address and phone number on a piece of paper.</li>
        <li>Add the name of the competition, and your answer if it asks a question.</li>
        <li>Post it, with the correct postage, to: <strong>{e.POSTAL_ENTRY_ADDRESS}</strong></li>
        <li>It must arrive before the competition closes. One entry per envelope.</li>
      </ol>
      <p>
        You do not need an account, and you do not need to buy anything. Free entries count towards the same per-person maximum as paid ones. When we record
        your entry it is given a ticket number picked at random from the unsold numbers, and it appears in the public entry list (as a number and a code,
        never your name). If you have an account with the same email address, you will see the ticket in your account.
      </p>
      <p><Link href="/terms">Full terms</Link>.</p>
    </article>
  );
}
