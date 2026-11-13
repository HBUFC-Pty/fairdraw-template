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
import { desc } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { refunds } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { FlashMessage } from '@/components/Flash';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';
import { refundAction } from '../actions';

export const metadata = { title: 'Refunds' };

export default async function RefundsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff(PERMISSIONS.refunds);
  const rows = await getDb().select().from(refunds).orderBy(desc(refunds.createdAt)).limit(200);
  return (
    <>
      <h1>Refunds</h1>
      <FlashMessage searchParams={await searchParams} />
      <form className="stack" action={refundAction}>
        <label>Order id<input name="orderId" required pattern="[0-9a-f-]{36}" /></label>
        <label>Amount (£)<input name="amount" required inputMode="decimal" /></label>
        <label>Reason<input name="reason" required minLength={3} maxLength={300} /></label>
        <label><input type="checkbox" name="release" value="yes" /> Also release the order&apos;s tickets from competitions that have not closed yet</label>
        <p className="muted">Tickets in competitions that have already closed stay in the frozen draw list; only the money is refunded.</p>
        <button type="submit">Issue refund</button>
      </form>
      <h2>Recent refunds</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Created</th><th scope="col">Order</th><th scope="col">Amount</th><th scope="col">Reason</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{formatUk(r.createdAt)}</td><td className="mono">{r.orderId}</td><td className="num">{formatPence(r.amountPence)}</td><td>{r.reason}</td><td>{r.status}{r.error ? `: ${r.error}` : ''}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
