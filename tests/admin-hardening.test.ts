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
/** Admin powers tightened after the red team of November 2026: prize text, postal entries and ticket releases. */
import { beforeEach, describe, expect, it } from 'vitest';
import { and, desc, eq } from 'drizzle-orm';
import { addPaidTickets, backdate, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { auditLog, tickets } from '../src/lib/db/schema';
import { updatePublishedText } from '../src/lib/competitions/service';
import { recordPostalEntry } from '../src/lib/competitions/postal';
import { AdminError, issueRefund } from '../src/lib/admin/service';
import { postalEntryMail } from '../src/lib/mail';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

const text = { summary: 'Now with photos', prizeDescription: 'The same prize, described more clearly.', images: [] };

describe('prize text', () => {
  it('can be edited while open, with the old and new text kept in the audit log', async () => {
    const admin = await makeUser(db, { role: 'admin' });
    const c = await makeCompetition(db);
    await updatePublishedText(db, { id: admin.id, role: 'admin' }, c.id, text);
    const [a] = await db.select().from(auditLog).where(eq(auditLog.action, 'competition.update_text')).orderBy(desc(auditLog.id)).limit(1);
    expect(JSON.stringify(a!.details)).toContain(c.prizeDescription);
    expect(JSON.stringify(a!.details)).toContain(text.prizeDescription);
  });

  it('cannot be edited after the close, even before the draw', async () => {
    const admin = await makeUser(db, { role: 'admin' });
    const c = await makeCompetition(db);
    await backdate(db, c.id, new Date(Date.now() - 60_000));
    await expect(updatePublishedText(db, { id: admin.id, role: 'admin' }, c.id, text)).rejects.toThrow(/only be edited while the competition is open/);
  });
});

describe('postal entries', () => {
  const entry = (competitionId: string, receivedAt: Date) => ({ competitionId, fullName: 'Pat Post', email: 'pat@example.test', postalAddress: '1 High Street, York', answerIndex: null, receivedAt });

  it('rejects an envelope dated before the competition opened, and refuses a date in the future', async () => {
    const admin = await makeUser(db, { role: 'admin' });
    const c = await makeCompetition(db);
    const early = await recordPostalEntry(db, { id: admin.id, role: 'admin' }, entry(c.id, new Date(c.opensAt.getTime() - 86400_000)));
    expect(early).toMatchObject({ status: 'rejected', reason: 'Received before the competition opened.' });
    await expect(recordPostalEntry(db, { id: admin.id, role: 'admin' }, entry(c.id, new Date(Date.now() + 86400_000)))).rejects.toThrow(/cannot be in the future/);
  });

  it('cannot be recorded after the close, whatever date is typed in', async () => {
    const admin = await makeUser(db, { role: 'admin' });
    const c = await makeCompetition(db);
    const closesAt = new Date(Date.now() - 60_000);
    await backdate(db, c.id, closesAt);
    const late = await recordPostalEntry(db, { id: admin.id, role: 'admin' }, entry(c.id, new Date(closesAt.getTime() - 3600_000)));
    expect(late.status).toBe('rejected');
    expect(late.status === 'rejected' && late.reason).toMatch(/must be recorded before the close/);
  });

  it('tells the entrant their ticket and code, or why it was not entered', () => {
    expect(postalEntryMail('pat@example.test', 'Drill', { ticket: 42, code: 'ab12cd34ef' }).text).toMatch(/ticket number is 42 and its entry code is ab12cd34ef/);
    expect(postalEntryMail('pat@example.test', 'Drill', { reason: 'Received after the close time.' }).text).toMatch(/could not enter it: Received after the close time\./);
  });
});

describe('refunds that release tickets', () => {
  it('must refund the full value of the tickets released, never 1p for the lot', async () => {
    const admin = await makeUser(db, { role: 'admin' });
    const u = await makeUser(db);
    const c = await makeCompetition(db, { ticketPricePence: 250 });
    const o = await addPaidTickets(db, c.id, u.id, [1, 2, 3]);
    await expect(issueRefund(db, { id: admin.id, role: 'admin' }, { orderId: o.id, amountPence: 1, reason: 'test', releaseTickets: true })).rejects.toBeInstanceOf(AdminError);
    const active = await db.select().from(tickets).where(and(eq(tickets.orderId, o.id), eq(tickets.status, 'active')));
    expect(active).toHaveLength(3);
    const r = await issueRefund(db, { id: admin.id, role: 'admin' }, { orderId: o.id, amountPence: 750, reason: 'test', releaseTickets: true });
    expect(r.released).toBe(3);
    // A partial refund without releasing anything is still allowed.
    const o2 = await addPaidTickets(db, c.id, u.id, [4]);
    expect((await issueRefund(db, { id: admin.id, role: 'admin' }, { orderId: o2.id, amountPence: 1, reason: 'goodwill', releaseTickets: false })).released).toBe(0);
  });
});
