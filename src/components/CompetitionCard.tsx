import Link from 'next/link';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import type { Competition } from '@/lib/public/queries';
import { progressClass } from './CompetitionFacts';

export type CardStyle = 'classic' | 'compact' | 'poster';

/** A live competition in a list. Three structural styles, chosen by brand.layout.card. */
export function CompetitionCard({ c, sold, style, now }: { c: Competition; sold: number; style: CardStyle; now: Date }) {
  const img = c.images[0];
  const when = c.opensAt > now ? `Opens ${formatUk(c.opensAt)}.` : `Closes ${formatUk(c.closesAt)}.`;
  const progress = (
    <>
      <div className="progress" aria-hidden="true"><span className={progressClass(sold, c.maxTickets)} /></div>
      <p className="muted num">{sold.toLocaleString('en-GB')} of {c.maxTickets.toLocaleString('en-GB')} sold. Max {c.perPersonCap} per person.</p>
    </>
  );
  if (style === 'compact') {
    return (
      <article className="card comp-card compact">
        {img ? <img src={img.url} alt={img.alt} loading="lazy" /> : <span />}
        <div>
          <h3><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h3>
          <p>{formatPence(c.ticketPricePence)} a ticket. {when}</p>
          {progress}
        </div>
      </article>
    );
  }
  if (style === 'poster') {
    return (
      <article className="card comp-card poster">
        {img ? <img src={img.url} alt={img.alt} loading="lazy" /> : null}
        <div className="poster-body">
          <h3><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h3>
          <p>{c.summary}</p>
          <p>{formatPence(c.ticketPricePence)} a ticket. {when}</p>
        </div>
        <div className="card">{progress}</div>
      </article>
    );
  }
  return (
    <article className="card comp-card classic">
      {img ? <img src={img.url} alt={img.alt} loading="lazy" /> : null}
      <h3><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h3>
      <p className="muted">{c.summary}</p>
      <p>{formatPence(c.ticketPricePence)} a ticket. {when}</p>
      {progress}
    </article>
  );
}
