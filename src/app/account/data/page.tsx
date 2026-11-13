import { requireUser } from '@/lib/web/session';

export const metadata = { title: 'Your data' };

export default async function DataPage() {
  await requireUser();
  return (
    <>
      <h1>Your data</h1>
      <p>Download everything we hold about you as a JSON file: your account details, limits, orders, refunds, tickets with entry codes, wins and sessions.</p>
      <p><a className="button" href="/account/data/export.json" download>Download my data</a></p>
      <p>To correct anything, or for a copy in another format, email our privacy contact (see the <a href="/privacy">privacy notice</a>).</p>
    </>
  );
}
