/**
 * Public entry list without names: each sold ticket is shown with a short code instead of the buyer's name.
 * The buyer sees the same code in their account, so they can find their own ticket on the public list; nobody else
 * can tell who bought it.
 *
 * A TypeScript port of fairdraw_entry_code / fairdraw_public_entry_list from FairDraw's guide "Getting to a 10":
 * https://fairdraw.partyofone.quest/guides/getting-to-10.html#entry-lists
 * Keep this credit if you copy or adapt this file. Checked against the PHP original in tests/fairdraw-port.test.ts.
 *
 * ENTRY_CODE_SECRET must be a long random value kept on the server, never published.
 */
import { createHmac } from 'node:crypto';

/** The 10-character code shown next to a ticket. Same inputs, same code; different for every ticket and order. */
export function fairdrawEntryCode(secret: string, competitionId: string, ticket: number, orderId: string): string {
  return createHmac('sha256', secret).update(`${competitionId}:${ticket}:${orderId}`).digest('hex').slice(0, 10);
}

/** Rows for the public list: ticket number and code only, sorted by ticket. */
export function fairdrawPublicEntryList(secret: string, competitionId: string, sold: ReadonlyArray<readonly [number, string]>) {
  return sold
    .map(([ticket, orderId]) => ({ ticket, code: fairdrawEntryCode(secret, competitionId, ticket, orderId) }))
    .sort((a, b) => a.ticket - b.ticket);
}
