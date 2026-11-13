'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { ROLES } from '@/lib/db/schema';
import { assertSameOrigin, field } from '@/lib/web/request';
import { flashUrl } from '@/lib/web/flash';
import { requireStaff } from '@/lib/web/session';
import { cancelDraft, competitionInputSchema, createCompetition, publishCompetition, updateDraft, updatePublishedText, type CompetitionInput } from '@/lib/competitions/service';
import { recordPostalEntry } from '@/lib/competitions/postal';
import { AdminError, issueRefund, PERMISSIONS, setRole } from '@/lib/admin/service';
import { parsePounds } from '@/lib/money';
import { fromUkLocalInput } from '@/lib/time';

function actorOf(s: Awaited<ReturnType<typeof requireStaff>>) {
  return { id: s.user.id, role: s.user.role };
}

function parseImages(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [url, ...alt] = l.split('|');
      return { url: (url ?? '').trim(), alt: alt.join('|').trim() };
    });
}

function readCompetitionForm(fd: FormData): CompetitionInput {
  const question = field(fd, 'question');
  const options = field(fd, 'options')
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean);
  return competitionInputSchema.parse({
    slug: field(fd, 'slug'),
    title: field(fd, 'title'),
    summary: field(fd, 'summary'),
    prizeDescription: field(fd, 'prizeDescription'),
    prizeValuePence: parsePounds(field(fd, 'prizeValue')),
    images: parseImages(field(fd, 'images')),
    ticketPricePence: parsePounds(field(fd, 'ticketPrice')),
    maxTickets: Number(field(fd, 'maxTickets')),
    perPersonCap: Number(field(fd, 'perPersonCap')),
    winnerCount: Number(field(fd, 'winnerCount') || '1'),
    opensAt: fromUkLocalInput(field(fd, 'opensAt')),
    closesAt: fromUkLocalInput(field(fd, 'closesAt')),
    drawAt: fromUkLocalInput(field(fd, 'drawAt')),
    skillQuestion: question ? { question, options, correctIndex: Number(field(fd, 'correct')) - 1 } : null,
  });
}

function errorText(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues.map((i) => `${i.path.join('.') || 'form'}: ${i.message}`).join('; ');
  if (e instanceof AdminError || e instanceof Error) return e.message;
  return 'Something went wrong.';
}

/** Run an admin operation; on failure go back with the error. redirect() is only ever called outside the try. */
async function attempt<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

export async function saveCompetitionAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireStaff(PERMISSIONS.competitions);
  const id = field(fd, 'id');
  const r = await attempt(async () => {
    const input = readCompetitionForm(fd);
    if (id) {
      await updateDraft(getDb(), actorOf(s), z.uuid().parse(id), input);
      return id;
    }
    return (await createCompetition(getDb(), actorOf(s), input)).id;
  });
  if (!r.ok) redirect(flashUrl(id ? `/admin/competitions/${encodeURIComponent(id)}` : '/admin/competitions/new', { error: r.error }));
  redirect(flashUrl(`/admin/competitions/${r.value}`, { notice: 'Saved as a draft.' }));
}

export async function updateTextAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireStaff(PERMISSIONS.competitions);
  const id = z.uuid().parse(field(fd, 'id'));
  const r = await attempt(() =>
    updatePublishedText(getDb(), actorOf(s), id, { summary: field(fd, 'summary'), prizeDescription: field(fd, 'prizeDescription'), images: parseImages(field(fd, 'images')) }),
  );
  redirect(flashUrl(`/admin/competitions/${id}`, r.ok ? { notice: 'Description updated.' } : { error: r.error }));
}

export async function publishAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireStaff(PERMISSIONS.competitions);
  const id = z.uuid().parse(field(fd, 'id'));
  if (field(fd, 'confirm') !== 'yes') redirect(flashUrl(`/admin/competitions/${id}`, { error: 'Tick the box to confirm the terms are final.' }));
  const r = await attempt(() => publishCompetition(getDb(), actorOf(s), id));
  redirect(flashUrl(`/admin/competitions/${id}`, r.ok ? { notice: 'Published. Its terms and times are now fixed.' } : { error: r.error }));
}

export async function cancelDraftAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireStaff(PERMISSIONS.competitions);
  const id = z.uuid().parse(field(fd, 'id'));
  const r = await attempt(() => cancelDraft(getDb(), actorOf(s), id));
  if (!r.ok) redirect(flashUrl(`/admin/competitions/${id}`, { error: r.error }));
  redirect(flashUrl('/admin/competitions', { notice: 'Draft cancelled.' }));
}

export async function postalEntryAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireStaff(PERMISSIONS.postal);
  const competitionId = z.uuid().parse(field(fd, 'competitionId'));
  const back = `/admin/competitions/${competitionId}/postal`;
  const r = await attempt(() => {
    const answer = field(fd, 'answer');
    return recordPostalEntry(getDb(), actorOf(s), {
      competitionId,
      fullName: field(fd, 'fullName'),
      email: field(fd, 'email'),
      postalAddress: field(fd, 'postalAddress'),
      answerIndex: answer === '' ? null : Number(answer) - 1,
      receivedAt: fromUkLocalInput(field(fd, 'receivedAt')),
    });
  });
  if (!r.ok) redirect(flashUrl(back, { error: r.error }));
  redirect(flashUrl(back, { notice: r.value.status === 'accepted' ? `Accepted: ticket ${r.value.ticket} allocated at random.` : `Rejected: ${r.value.reason}` }));
}

export async function refundAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireStaff(PERMISSIONS.refunds);
  const r = await attempt(() =>
    issueRefund(getDb(), actorOf(s), {
      orderId: z.uuid().parse(field(fd, 'orderId')),
      amountPence: parsePounds(field(fd, 'amount')),
      reason: z.string().trim().min(3).max(300).parse(field(fd, 'reason')),
      releaseTickets: field(fd, 'release') === 'yes',
    }),
  );
  redirect(
    flashUrl(
      '/admin/refunds',
      r.ok ? { notice: `Refund queued; ${r.value.released} ticket(s) released. The worker sends it to the payment provider within a minute.` } : { error: r.error },
    ),
  );
}

export async function setRoleAction(fd: FormData) {
  await assertSameOrigin();
  const s = await requireStaff(PERMISSIONS.staff);
  const r = await attempt(() => setRole(getDb(), actorOf(s), field(fd, 'email'), z.enum(ROLES).parse(field(fd, 'role'))));
  redirect(flashUrl('/admin/staff', r.ok ? { notice: 'Role updated. They must log in again, and staff must set up two-factor authentication.' } : { error: r.error }));
}
