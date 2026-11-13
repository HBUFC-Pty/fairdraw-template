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
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { PERMISSIONS, supportView } from '@/lib/admin/service';
import { formatPence } from '@/lib/money';
import { formatUk } from '@/lib/time';

export const metadata = { title: 'Player' };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff(PERMISSIONS.users);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const v = await supportView(getDb(), { id: s.user.id, role: s.user.role }, id);
  if (!v) notFound();
  const now = new Date();
  return (
    <>
      <h1>{v.email}</h1>
      <dl className="facts">
        <dt>First name</dt><dd>{v.firstName ?? '(deleted)'}</dd>
        <dt>Role</dt><dd>{v.role}</dd>
        <dt>Email confirmed</dt><dd>{v.emailVerified ? 'yes' : 'no'}</dd>
        <dt>Age check</dt><dd>{v.ageChecked} (18+)</dd>
        <dt>Two-factor</dt><dd>{v.twoFactor ? 'on' : 'off'}</dd>
        <dt>Break</dt><dd>{v.breakUntil && v.breakUntil > now ? `until ${formatUk(v.breakUntil)}` : 'none'}</dd>
        <dt>Self-exclusion</dt><dd>{v.selfExcludedUntil && v.selfExcludedUntil > now ? `until ${formatUk(v.selfExcludedUntil)}` : 'none'}</dd>
        <dt>Joined</dt><dd>{formatUk(v.createdAt)}</dd>
        <dt>Deleted</dt><dd>{v.deleted ? 'yes' : 'no'}</dd>
      </dl>
      <p className="muted">Support can see what is needed to help. Breaks and self-exclusions cannot be lifted from here.</p>
      <h2>Orders</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Order</th><th scope="col">Date</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead>
          <tbody>{v.orders.map((o) => <tr key={o.id}><td className="mono">{o.id}</td><td>{formatUk(o.createdAt)}</td><td className="num">{formatPence(o.totalPence)}</td><td>{o.status}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
