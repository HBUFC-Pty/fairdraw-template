import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import type { Competition } from '@/lib/public/queries';

export function progressClass(sold: number, max: number) {
  return `p${Math.min(100, Math.round((sold / max) * 10) * 10)}`;
}

export function CompetitionFacts({ c, sold }: { c: Competition; sold: number }) {
  return (
    <dl className="facts">
      <dt>Ticket price</dt>
      <dd>{formatPence(c.ticketPricePence)}</dd>
      <dt>Tickets sold</dt>
      <dd className="num">{sold.toLocaleString('en-GB')} of {c.maxTickets.toLocaleString('en-GB')}</dd>
      <dt>Maximum per person</dt>
      <dd>{c.perPersonCap.toLocaleString('en-GB')} tickets (paid and free entries together)</dd>
      <dt>Prize value</dt>
      <dd>{formatPence(c.prizeValuePence)}</dd>
      <dt>Closes</dt>
      <dd>{formatUk(c.closesAt)}</dd>
      <dt>Draw</dt>
      <dd>{formatUk(c.drawAt)}</dd>
      <dt>Winners</dt>
      <dd>{c.winnerCount}</dd>
    </dl>
  );
}

export function DrawnWhateverSold({ c }: { c: Competition }) {
  return (
    <p>
      <strong>This competition will be drawn on {formatUk(c.drawAt)} for the full prize, however many tickets are sold.</strong> We never extend the
      closing date, roll the prize over or swap it for a smaller one.
    </p>
  );
}
