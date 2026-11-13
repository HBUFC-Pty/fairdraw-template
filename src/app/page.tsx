import Link from 'next/link';
import { liveCompetitions, finishedCompetitions } from '@/lib/public/queries';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import { CompetitionCard } from '@/components/CompetitionCard';
import { Carousel } from '@/components/Carousel';
import { FairDrawLink } from '@/components/SiteFooter';
import { brand } from '@/brand';
import { env } from '@/lib/env';

/** Home page in one of three layouts (brand.layout.home): hero, grid or featured. The content is the same. */
export default async function Home() {
  const live = await liveCompetitions();
  const recent = (await finishedCompetitions(6)).filter((r) => r.d.randomness);
  const now = new Date();
  const style = brand.layout.card;
  const cards = live.map(({ c, sold }) => <CompetitionCard key={c.id} c={c} sold={sold} style={style} now={now} />);
  const intro = (
    <p className="muted">
      Every draw is made with public randomness and published with a record anyone can re-run. Free entry by post is always available.{' '}
      <Link href="/fairness">How our draws work</Link>.
    </p>
  );
  const empty = live.length === 0 ? <p>No competitions are open right now.</p> : null;
  const lead = live[0];

  let body: React.ReactNode;
  if (brand.layout.home === 'hero' && lead) {
    const img = lead.c.images[0];
    body = (
      <>
        <section className="home-hero" aria-labelledby="hero-title">
          <div>
            <h1 id="hero-title">{lead.c.title}</h1>
            <p>{lead.c.summary}</p>
            <p>{formatPence(lead.c.ticketPricePence)} a ticket. Drawn {formatUk(lead.c.drawAt)}, however many tickets are sold.</p>
            <p><Link className="button" href={`/competitions/${lead.c.slug}`}>See the prize</Link></p>
          </div>
          {img ? <div className="hero"><img src={img.url} alt={img.alt} /></div> : null}
        </section>
        {intro}
        {live.length > 1 ? <><h2>More competitions</h2><div className="grid">{cards.slice(1)}</div></> : null}
      </>
    );
  } else if (brand.layout.home === 'featured' && live.length > 0) {
    body = (
      <>
        <h1>{env().SITE_NAME}</h1>
        {intro}
        <Carousel label="Live competitions">{cards}</Carousel>
      </>
    );
  } else {
    body = (
      <>
        <h1>Live competitions</h1>
        {intro}
        {empty}
        <div className="grid">{cards}</div>
      </>
    );
  }

  return (
    <>
      {body}
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
