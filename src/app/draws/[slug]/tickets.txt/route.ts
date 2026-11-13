import { drawBySlug } from '@/lib/public/draw-files';

/** The frozen list of ticket numbers committed at the close, one per line (input to FairDraw's verifier). */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const r = await drawBySlug((await ctx.params).slug);
  if (!r) return new Response('not closed yet\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(r.d.ticketList.join('\n') + (r.d.ticketList.length ? '\n' : ''), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}
