/**
 * Creating, editing and publishing competitions. Once a competition is live its price, size, cap, number of winners,
 * skill question, prize value and times are fixed (the database enforces this too). Every competition is drawn at
 * its advertised time whatever sells: there is no extension, rollover or reduced prize. Do not add one.
 */
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db';
import { competitions } from '../db/schema';
import { appendAudit, type AuditActor } from '../audit';
import { capAboveTenPercent } from './allocation';

const imageSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u.startsWith('/') ? !u.startsWith('//') : /^https:\/\/[^\s]+$/.test(u), 'image URL must start with / or https://'),
  alt: z.string().trim().min(1, 'every image needs alt text').max(200),
});

export const competitionInputSchema = z
  .object({
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lower-case letters, numbers and hyphens').max(80),
    title: z.string().trim().min(3).max(120),
    summary: z.string().trim().max(300).default(''),
    prizeDescription: z.string().trim().min(10).max(5000),
    prizeValuePence: z.number().int().min(1),
    images: z.array(imageSchema).max(10).default([]),
    ticketPricePence: z.number().int().min(1).max(100_000),
    maxTickets: z.number().int().min(1).max(10_000_000),
    perPersonCap: z.number().int().min(1),
    winnerCount: z.number().int().min(1).max(100).default(1),
    opensAt: z.date(),
    closesAt: z.date(),
    drawAt: z.date(),
    skillQuestion: z
      .object({
        question: z.string().trim().min(5).max(300),
        options: z.array(z.string().trim().min(1).max(100)).min(2).max(6),
        correctIndex: z.number().int().min(0),
      })
      .refine((q) => q.correctIndex < q.options.length, 'the correct answer must be one of the options')
      .nullable()
      .default(null),
  })
  .refine((c) => c.perPersonCap <= c.maxTickets, { message: 'the per-person cap cannot exceed the maximum tickets', path: ['perPersonCap'] })
  .refine((c) => c.winnerCount <= c.maxTickets, { message: 'more winners than tickets', path: ['winnerCount'] })
  .refine((c) => c.opensAt < c.closesAt, { message: 'the close time must be after the opening time', path: ['closesAt'] })
  .refine((c) => c.drawAt >= c.closesAt, { message: 'the draw time must be at or after the close time', path: ['drawAt'] })
  .refine((c) => c.drawAt.getTime() - c.closesAt.getTime() <= 7 * 86400_000, { message: 'draw within 7 days of the close', path: ['drawAt'] });

export type CompetitionInput = z.infer<typeof competitionInputSchema>;

export function capWarning(input: { perPersonCap: number; maxTickets: number }): string | null {
  return capAboveTenPercent(input.perPersonCap, input.maxTickets)
    ? `The per-person cap (${input.perPersonCap}) is more than 10% of the maximum (${input.maxTickets}). FairDraw's rubric gives full marks only at 10% or less, and a high cap lets one person buy a large share of the odds.`
    : null;
}

export async function createCompetition(db: Db, actor: AuditActor, input: CompetitionInput, now = new Date()) {
  const data = competitionInputSchema.parse(input);
  const [c] = await db.insert(competitions).values({ ...data, status: 'draft', createdAt: now, updatedAt: now }).returning();
  await appendAudit(db, actor, { action: 'competition.create', targetType: 'competition', targetId: c!.id, details: { slug: data.slug, capWarning: capWarning(data) !== null } }, now);
  return c!;
}

export async function updateDraft(db: Db, actor: AuditActor, id: string, input: CompetitionInput, now = new Date()) {
  const data = competitionInputSchema.parse(input);
  const [cur] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!cur) throw new Error('competition not found');
  if (cur.status !== 'draft') throw new Error('only drafts can be edited; a published competition keeps its terms');
  await db.update(competitions).set({ ...data, updatedAt: now }).where(eq(competitions.id, id));
  await appendAudit(db, actor, { action: 'competition.update', targetType: 'competition', targetId: id, details: { slug: data.slug } }, now);
}

/** Text-only edits allowed after publishing: the description and images (for typos and better photos). */
export async function updatePublishedText(db: Db, actor: AuditActor, id: string, patch: { summary: string; prizeDescription: string; images: z.infer<typeof imageSchema>[] }, now = new Date()) {
  const data = z.object({ summary: z.string().trim().max(300), prizeDescription: z.string().trim().min(10).max(5000), images: z.array(imageSchema).max(10) }).parse(patch);
  await db.update(competitions).set({ ...data, updatedAt: now }).where(eq(competitions.id, id));
  await appendAudit(db, actor, { action: 'competition.update_text', targetType: 'competition', targetId: id }, now);
}

export async function publishCompetition(db: Db, actor: AuditActor, id: string, now = new Date()) {
  const [cur] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!cur) throw new Error('competition not found');
  if (cur.status !== 'draft') throw new Error('only drafts can be published');
  if (cur.closesAt <= now) throw new Error('the close time has already passed');
  await db.update(competitions).set({ status: 'live', updatedAt: now }).where(eq(competitions.id, id));
  await appendAudit(db, actor, { action: 'competition.publish', targetType: 'competition', targetId: id }, now);
}

export async function cancelDraft(db: Db, actor: AuditActor, id: string, now = new Date()) {
  await db.update(competitions).set({ status: 'cancelled', updatedAt: now }).where(eq(competitions.id, id));
  await appendAudit(db, actor, { action: 'competition.cancel_draft', targetType: 'competition', targetId: id }, now);
}

/** True while a live competition accepts entries. */
export function isOpen(c: { status: string; opensAt: Date; closesAt: Date }, now: Date): boolean {
  return c.status === 'live' && c.opensAt <= now && now < c.closesAt;
}
