import Link from 'next/link';
import { notFound } from 'next/navigation';
import { competitionBySlug, publicEntryList } from '@/lib/public/queries';

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: 'Entry list' };

/** Public entry list: ticket numbers and codes only. Never add names here: see AGENTS.md. */
export default async function EntriesPage({ params }: Props) {
  const r = await competitionBySlug((await params).slug);
  if (!r) notFound();
  const list = await publicEntryList(r.c, r.draw?.ticketList ?? null);
  const free = list.filter((e) => e.free).length;
  return (
    <>
      <h1>Entry list: {r.c.title}</h1>
      <p>
        {r.draw ? `The frozen list committed at the close: ${list.length} tickets.` : `${list.length} tickets so far.`} {free} of them are free postal entries,
        with exactly the same chance as paid entries. Each ticket shows a short code instead of a name; you can see your own codes in your account.
      </p>
      <p><Link href={`/competitions/${r.c.slug}`}>Back to the competition</Link>{r.draw ? <> · <a href={`/draws/${r.c.slug}/tickets.txt`}>Plain ticket list</a></> : null}</p>
      <div className="table-wrap">
        <table>
          <caption className="muted">Ticket numbers and entry codes</caption>
          <thead><tr><th scope="col">Ticket</th><th scope="col">Entry code</th><th scope="col">Route</th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.ticket}><td className="num">{e.ticket}</td><td className="mono">{e.code}</td><td>{e.free ? 'Free (post)' : 'Paid'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
