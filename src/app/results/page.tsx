import Link from 'next/link';
import { finishedCompetitions } from '@/lib/public/queries';
import { formatUk } from '@/lib/time';
import { FairDrawLink } from '@/components/SiteFooter';

export const metadata = { title: 'Results' };

export default async function ResultsPage() {
  const rows = await finishedCompetitions();
  return (
    <>
      <h1>Results</h1>
      <p>
        Every finished competition, with tickets sold, the maximum, the winning tickets and both the scheduled and actual draw times. Each draw has a
        public record you can re-run. <FairDrawLink />.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Competition</th><th scope="col">Sold</th><th scope="col">Maximum</th><th scope="col">Winning ticket(s)</th>
              <th scope="col">Scheduled draw</th><th scope="col">Actual draw</th><th scope="col">Check it</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, d, winners }) => (
              <tr key={c.id}>
                <td><Link href={`/competitions/${c.slug}`}>{c.title}</Link></td>
                <td className="num">{d.ticketsSold}</td>
                <td className="num">{d.maxTickets}</td>
                <td>{d.randomness ? (winners.length ? winners.map((w) => `${w.ticket}${w.name ? ` (${w.name})` : ''}`).join(', ') : 'No entries') : 'Awaiting draw'}</td>
                <td>{formatUk(d.scheduledDrawAt, true)}</td>
                <td>{d.drawnAt ? formatUk(d.drawnAt, true) : 'not yet'}</td>
                <td>{d.randomness ? <><Link href={`/draws/${c.slug}`}>Verify</Link> · <a href={`/draws/${c.slug}/record.json`}>Record</a></> : <a href={`/draws/${c.slug}/commitment.json`}>Commitment</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p>No competitions have closed yet.</p> : null}
    </>
  );
}
