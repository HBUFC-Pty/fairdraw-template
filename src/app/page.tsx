import Link from 'next/link';
import { liveCompetitions, finishedCompetitions } from '@/lib/public/queries';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import { progressClass } from '@/components/CompetitionFacts';
import { FairDrawLink } from '@/components/SiteFooter';

export default async function Home() {
  const live = await liveCompetitions();
  const recent = (await finishedCompetitions(6)).filter((r) => r.d.randomness);
  const now = new Date();
  return (
    <>
      <h1>Live competitions</h1>
      <p className="muted">
        Every draw is made with public randomness and published with a record anyone can re-run. Free entry by post is always available.{' '}
        <Link href="/fairness">How our draws work</Link>.
      </p>
      {live.length === 0 ? <p>No competitions are open right now.</p> : null}
      <div className="grid">
        {live.map(({ c, sold }) => (
          <article className="card" key={c.id}>
            {c.images[0] ? <img src={c.images[0].url} alt={c.images[0].alt} loading="lazy" /> : null}
            <h3><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h3>
            <p className="muted">{c.summary}</p>
            <p>
              {formatPence(c.ticketPricePence)} a ticket. {c.opensAt > now ? `Opens ${formatUk(c.opensAt)}.` : `Closes ${formatUk(c.closesAt)}.`}
            </p>
            <div className="progress" aria-hidden="true"><span className={progressClass(sold, c.maxTickets)} /></div>
            <p className="muted num">{sold.toLocaleString('en-GB')} of {c.maxTickets.toLocaleString('en-GB')} sold</p>
          </article>
        ))}
      </div>
      {recent.length ? (
        <>
          <h2>Recent results</h2>
          <ul>
            {recent.map((r) => (
              <li key={r.c.id}>
                <Link href={`/competitions/${r.c.slug}`}>{r.c.title}</Link>: winning ticket {r.winners.map((w) => w.ticket).join(', ') || 'none (no entries)'}
              </li>
            ))}
          </ul>
          <p><Link href="/results">All results</Link>. <FairDrawLink /></p>
        </>
      ) : null}
    </>
  );
}
