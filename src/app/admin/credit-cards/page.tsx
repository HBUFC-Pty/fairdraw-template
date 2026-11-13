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
import { and, gte, inArray, lt, sql } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { appendAudit } from '@/lib/audit';
import { ACCEPTED_STATUSES, CREDIT_LIKE } from '@/lib/checkout/credit-card-rule';
import { creditCardCapPence } from '@/lib/site-config';
import { formatPence } from '@/lib/money';
import { fromUkLocalInput, ukMonthBounds } from '@/lib/time';

export const metadata = { title: 'Credit card payments' };

/**
 * Monthly report for DCMS code clause 1.3: credit-funded payments accepted per player in a UK calendar month. Minimal
 * data: an account id, the total and the number of payments. Open a player's support record for anything more.
 */
export default async function CreditCardReport({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireStaff(PERMISSIONS.refunds);
  const q = (await searchParams).month;
  const month = typeof q === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(q) ? q : ukMonthBounds(new Date()).label;
  const { start, end } = ukMonthBounds(fromUkLocalInput(`${month}-01T12:00`));
  const rows = await getDb()
    .select({ userId: orders.userId, total: sql<string>`sum(${orders.capturePence})`, payments: sql<string>`count(*)` })
    .from(orders)
    .where(and(inArray(orders.paymentFunding, CREDIT_LIKE), inArray(orders.status, [...ACCEPTED_STATUSES]), gte(orders.decidedAt, start), lt(orders.decidedAt, end)))
    .groupBy(orders.userId)
    .orderBy(sql`sum(${orders.capturePence}) desc`);
  const [declined] = await getDb()
    .select({ n: sql<string>`count(*)` })
    .from(orders)
    .where(and(inArray(orders.decision, ['decline_credit_cap', 'decline_instant_win_credit']), gte(orders.decidedAt, start), lt(orders.decidedAt, end)));
  await appendAudit(getDb(), { id: s.user.id, role: s.user.role }, { action: 'report.credit_cards', targetType: 'report', targetId: month });
  const cap = creditCardCapPence();
  return (
    <>
      <h1>Credit card payments: {month}</h1>
      <p>
        Credit-funded payments accepted per player in the calendar month (UK time), under DCMS code clause 1.3. The limit is {formatPence(cap)} per player.
        Payments of unknown funding type count as credit. {Number(declined?.n ?? 0)} payment(s) were declined under the rule this month.
      </p>
      <form method="get" className="stack">
        <label>Month<input name="month" type="month" defaultValue={month} /></label>
        <button type="submit">Show</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Account</th><th scope="col">Credit card total</th><th scope="col">Payments</th><th scope="col">Within limit</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td><Link href={`/admin/users/${r.userId}`}><code>{r.userId.slice(0, 8)}</code></Link></td>
                <td className="num">{formatPence(Number(r.total))}</td>
                <td className="num">{r.payments}</td>
                <td>{Number(r.total) <= cap ? 'Yes' : 'NO: investigate'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p>No credit card payments in this month.</p> : null}
    </>
  );
}
