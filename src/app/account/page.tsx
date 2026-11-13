import Link from 'next/link';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { requireUser } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { competitions, orders, tickets, winners } from '@/lib/db/schema';
import { FlashMessage } from '@/components/Flash';
import { fairdrawEntryCode } from '@/lib/fairdraw/entry-codes';
import { env } from '@/lib/env';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import { logoutAction } from '../actions/auth';
import { winnerConsentAction } from '../actions/account';
import { playBlockReason } from '@/lib/checkout/service';

export const metadata = { title: 'Your account' };

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireUser();
  const db = getDb();
  const ts = await db
    .select({ t: tickets, title: competitions.title, slug: competitions.slug })
    .from(tickets)
    .innerJoin(competitions, eq(competitions.id, tickets.competitionId))
    .where(and(eq(tickets.userId, s.user.id), inArray(tickets.status, ['active', 'reserved', 'ineligible', 'refunded'])))
    .orderBy(desc(tickets.createdAt))
    .limit(500);
  const os = await db.select().from(orders).where(eq(orders.userId, s.user.id)).orderBy(desc(orders.createdAt)).limit(50);
  const ws = await db
    .select({ w: winners, title: competitions.title })
    .from(winners)
    .innerJoin(competitions, eq(competitions.id, winners.competitionId))
    .where(eq(winners.userId, s.user.id));
  const secret = env().ENTRY_CODE_SECRET;
  const blocked = playBlockReason(s.user, new Date());
  return (
    <>
      <h1>Your account</h1>
      <FlashMessage searchParams={await searchParams} />
      {blocked ? <p className="notice warn">{blocked}</p> : null}
      <p>
        <Link href="/account/limits">Spend limits</Link> · <Link href="/account/break">Take a break or self-exclude</Link> · <Link href="/account/security">Security</Link> ·{' '}
        <Link href="/account/data">Your data</Link> · <Link href="/account/delete">Delete account</Link>
      </p>
      <form action={logoutAction}><button type="submit" className="secondary">Log out</button></form>

      {ws.length ? (
        <>
          <h2>Your wins</h2>
          {ws.map(({ w, title }) => (
            <form key={w.competitionId} action={winnerConsentAction} className="card">
              <p><strong>{title}</strong>: ticket {w.ticketNumber}. Congratulations!</p>
              <input type="hidden" name="competitionId" value={w.competitionId} />
              <p>{w.publicConsent ? `Shown on results as "${w.displayName}".` : 'Your name is not shown on the results.'}</p>
              <input type="hidden" name="consent" value={w.publicConsent ? 'no' : 'yes'} />
              <button type="submit" className="secondary">{w.publicConsent ? 'Stop showing my name' : 'Show my first name and initial on the results'}</button>
            </form>
          ))}
        </>
      ) : null}

      <h2>Your tickets</h2>
      <p className="muted">Each ticket has an entry code. Find it on the competition&apos;s public entry list to check your ticket is in the draw.</p>
      {ts.length === 0 ? <p>No tickets yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Competition</th><th scope="col">Ticket</th><th scope="col">Entry code</th><th scope="col">How chosen</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {ts.map(({ t, title, slug }) => (
                <tr key={t.id}>
                  <td><Link href={`/competitions/${slug}`}>{title}</Link></td>
                  <td className="num">{t.number}</td>
                  <td className="mono">{fairdrawEntryCode(secret, t.competitionId, t.number, t.orderId ?? t.postalEntryId ?? '')}</td>
                  <td>{t.source === 'postal' ? 'Free entry, random' : t.allocation === 'random' ? 'Random' : 'Chosen by you'}</td>
                  <td>{{ active: 'Entered', reserved: 'Awaiting payment', ineligible: 'Wrong answer: not entered, refunded', refunded: 'Refunded', expired: 'Expired' }[t.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Orders</h2>
      {os.length === 0 ? <p>No orders yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Date</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {os.map((o) => (
                <tr key={o.id}><td>{formatUk(o.createdAt)}</td><td className="num">{formatPence(o.totalPence)}</td><td>{o.status.replace('_', ' ')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
