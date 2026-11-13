/*
 * The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may
 * not use this file except in compliance with the License. You may obtain a copy of the License at
 * https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections
 * 14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for
 * the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
 * Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either
 * express or implied. See the License for the specific language governing rights and limitations under the License.
 * The Original Code is FairDraw operator template.
 * The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are
 * Copyright (c) 2026 Harrison Jones. All Rights Reserved.
 */
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { basketItems, competitions } from '@/lib/db/schema';
import { FlashMessage } from '@/components/Flash';
import { formatPence } from '@/lib/money';
import { playBlockReason } from '@/lib/checkout/service';
import { checkoutAction, removeFromBasketAction } from './actions';

export const metadata = { title: 'Basket' };

export default async function BasketPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireUser();
  const items = await getDb()
    .select({ b: basketItems, c: competitions })
    .from(basketItems)
    .innerJoin(competitions, eq(competitions.id, basketItems.competitionId))
    .where(eq(basketItems.userId, s.user.id));
  const total = items.reduce((t, { b, c }) => t + b.quantity * c.ticketPricePence, 0);
  const blocked = playBlockReason(s.user, new Date());
  return (
    <>
      <h1>Basket</h1>
      <FlashMessage searchParams={await searchParams} />
      {blocked ? <p className="notice warn">{blocked}</p> : null}
      {items.length === 0 ? <p>Your basket is empty. <Link href="/">See live competitions</Link>.</p> : (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Competition</th><th scope="col">Tickets</th><th scope="col">Numbers</th><th scope="col">Price</th><th scope="col"><span className="skip">Remove</span></th></tr></thead>
              <tbody>
                {items.map(({ b, c }) => (
                  <tr key={c.id}>
                    <td><Link href={`/competitions/${c.slug}`}>{c.title}</Link></td>
                    <td className="num">{b.quantity}</td>
                    <td>{b.chosenNumbers?.length ? b.chosenNumbers.join(', ') : 'Random'}</td>
                    <td className="num">{formatPence(b.quantity * c.ticketPricePence)}</td>
                    <td>
                      <form action={removeFromBasketAction}>
                        <input type="hidden" name="competitionId" value={c.id} />
                        <button type="submit" className="secondary">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p><strong>Total: {formatPence(total)}</strong></p>
          <p className="muted">Your tickets are reserved while you pay. Your spend limits and the per-person maximum are checked now.</p>
          <form action={checkoutAction}><button type="submit" disabled={Boolean(blocked)}>Pay securely</button></form>
        </>
      )}
    </>
  );
}
