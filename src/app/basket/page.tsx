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
import { creditAllowance } from '@/lib/checkout/credit-card-rule';
import { checkoutAction, removeFromBasketAction } from './actions';
import { priceFor } from '@/lib/competitions/bundles';
import { Basket, Close } from '@/components/icons';
import { PrizePlaceholder } from '@/components/illustrations';

export const metadata = { title: 'Basket' };

export default async function BasketPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireUser();
  const items = await getDb()
    .select({ b: basketItems, c: competitions })
    .from(basketItems)
    .innerJoin(competitions, eq(competitions.id, basketItems.competitionId))
    .where(eq(basketItems.userId, s.user.id));
  const total = items.reduce((t, { b, c }) => t + priceFor(b.quantity, c.ticketPricePence, c.bundles), 0);
  const tickets = items.reduce((t, { b }) => t + b.quantity, 0);
  const blocked = playBlockReason(s.user, new Date());
  const credit = await creditAllowance(getDb(), s.user.id);
  const instantWin = items.some(({ c }) => c.isInstantWin);
  return (
    <div className="basket-page">
      <h1>Basket</h1>
      <FlashMessage searchParams={await searchParams} />
      {blocked ? <p className="notice warn">{blocked}</p> : null}
      {items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-art" aria-hidden="true"><Basket size={40} /></span>
          <p>Your basket is empty.</p>
          <Link className="button" href="/">See live competitions</Link>
        </div>
      ) : (
        <div className="basket-layout">
          <div className="basket-main">
            <ul className="basket-items" aria-label="Tickets in your basket">
              {items.map(({ b, c }) => {
                const img = c.images[0];
                return (
                  <li key={c.id} className="basket-item">
                    <span className="basket-thumb">
                      {img ? <img src={img.url} alt="" width={64} height={64} loading="lazy" /> : <PrizePlaceholder />}
                    </span>
                    <div className="basket-info">
                      <h2 className="basket-title"><Link href={`/competitions/${c.slug}`}>{c.title}</Link></h2>
                      <p className="basket-meta num">
                        {b.quantity.toLocaleString('en-GB')} {b.quantity === 1 ? 'ticket' : 'tickets'} · {b.chosenNumbers?.length ? `Numbers ${b.chosenNumbers.join(', ')}` : 'Random'}
                      </p>
                    </div>
                    <p className="basket-price num">{formatPence(priceFor(b.quantity, c.ticketPricePence, c.bundles))}</p>
                    <form action={removeFromBasketAction} className="basket-remove">
                      <input type="hidden" name="competitionId" value={c.id} />
                      <button type="submit" className="icon-btn bare" aria-label={`Remove ${c.title}`}><Close size={20} /></button>
                    </form>
                  </li>
                );
              })}
            </ul>
            <div className="notice basket-credit">
              <p>
                <strong>Paying by credit card?</strong> Under the industry&apos;s voluntary code we can accept at most {formatPence(credit.capPence)} by credit card
                from you each calendar month. You have {formatPence(credit.remainingPence)} left this month. If a credit card payment would go over that, we do not
                take it: the hold on your card is released and we ask you to pay by debit card instead. Debit cards are fine.
              </p>
              {instantWin ? <p><strong>Your basket includes an instant win prize draw, so credit cards cannot be used for this order.</strong> Please pay by debit card.</p> : null}
            </div>
          </div>
          <aside className="basket-summary" aria-labelledby="summary-title">
            <h2 id="summary-title" className="micro-label">Order summary</h2>
            <p className="summary-row num"><span>Tickets</span><span>{tickets.toLocaleString('en-GB')}</span></p>
            <p className="summary-total num"><span className="micro-label">Total</span><strong>{formatPence(total)}</strong></p>
            <form action={checkoutAction}><button type="submit" className="lg summary-cta" disabled={Boolean(blocked)}>Checkout</button></form>
            <p className="micro-hint">Your tickets are reserved while you pay. Your spend limits and the per-person maximum are checked now.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
