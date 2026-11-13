/**
 * Free entry by post. An admin records each postal entry received before the close. A free entry gets a randomly
 * allocated ticket with exactly the same chance as a paid one, counts towards the same per-person cap (matched by
 * email address), and appears in the public entry list like any other ticket.
 */
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db';
import { competitions, postalEntries, tickets, users } from '../db/schema';
import { appendAudit, type AuditActor } from '../audit';
import { allocateRandom, cryptoRandomInt, withinCap, type RandomIntFn } from './allocation';
import { entriesHeld, takenNumbers } from './queries';

export const postalEntrySchema = z.object({
  competitionId: z.uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  postalAddress: z.string().trim().min(5).max(500),
  answerIndex: z.number().int().min(0).nullable(),
  receivedAt: z.date(),
});

export type PostalEntryInput = z.infer<typeof postalEntrySchema>;

export type PostalResult = { status: 'accepted'; ticket: number; entryId: string } | { status: 'rejected'; reason: string; entryId: string };

export async function recordPostalEntry(db: Db, actor: AuditActor, input: PostalEntryInput, opts: { now?: Date; rand?: RandomIntFn } = {}): Promise<PostalResult> {
  const now = opts.now ?? new Date();
  const data = postalEntrySchema.parse(input);
  const email = data.email.trim().toLowerCase();
  const result = await db.transaction(async (tx) => {
    const [c] = await tx.select().from(competitions).where(eq(competitions.id, data.competitionId)).for('update');
    if (!c) throw new Error('competition not found');
    let reason: string | null = null;
    if (c.status !== 'live') reason = 'The competition has closed.';
    else if (data.receivedAt >= c.closesAt) reason = 'Received after the close time.';
    else if (c.skillQuestion && data.answerIndex === null) reason = 'No answer to the competition question.';
    const held = reason ? 0 : await entriesHeld(tx, c.id, { email });
    if (!reason && !withinCap(held, 1, c.perPersonCap)) reason = `This person already holds ${held} entries, the per-person cap.`;
    let ticket: number | null = null;
    if (!reason) {
      const taken = await takenNumbers(tx, c.id);
      if (taken.size >= c.maxTickets) reason = 'The competition has sold out.';
      else ticket = allocateRandom(c.maxTickets, taken, 1, opts.rand ?? cryptoRandomInt)[0] ?? null;
    }
    const [entry] = await tx
      .insert(postalEntries)
      .values({
        competitionId: c.id,
        fullName: data.fullName,
        email,
        postalAddress: data.postalAddress,
        answerIndex: data.answerIndex,
        receivedAt: data.receivedAt,
        status: reason ? 'rejected' : 'accepted',
        rejectionReason: reason,
        recordedBy: actor.id,
        createdAt: now,
      })
      .returning({ id: postalEntries.id });
    if (reason || ticket === null) return { status: 'rejected', reason: reason ?? 'unknown', entryId: entry!.id } as const;
    const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
    await tx.insert(tickets).values({
      competitionId: c.id,
      number: ticket,
      userId: u?.id ?? null,
      postalEntryId: entry!.id,
      source: 'postal',
      allocation: 'random',
      status: 'active',
      answerCorrect: c.skillQuestion ? data.answerIndex === c.skillQuestion.correctIndex : null,
      createdAt: now,
    });
    return { status: 'accepted', ticket, entryId: entry!.id } as const;
  });
  await appendAudit(db, actor, {
    action: 'postal_entry.record',
    targetType: 'postal_entry',
    targetId: result.entryId,
    details: { competition: data.competitionId, status: result.status, ...(result.status === 'accepted' ? { ticket: result.ticket } : { reason: result.reason }) },
  }, now);
  return result;
}
