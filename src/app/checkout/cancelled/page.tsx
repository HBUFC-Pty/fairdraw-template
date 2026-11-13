import Link from 'next/link';

export const metadata = { title: 'Payment not completed' };

export default function CancelledPage() {
  return (
    <>
      <h1>Payment not completed</h1>
      <p>You have not been charged. Your reserved numbers will be released shortly. <Link href="/">Back to competitions</Link>.</p>
    </>
  );
}
