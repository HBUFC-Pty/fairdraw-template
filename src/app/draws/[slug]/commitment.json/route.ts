import { drawBySlug, JSON_HEADERS } from '@/lib/public/draw-files';
import { commitFromRow } from '@/lib/draw/service';

/** The commitment published at the close (FairDraw's fairdraw_commit() format), plus the advertised draw time. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const r = await drawBySlug((await ctx.params).slug);
  if (!r) return Response.json({ error: 'not closed yet' }, { status: 404 });
  const body = { ...commitFromRow(r.d), scheduled_draw_at: r.d.scheduledDrawAt.toISOString(), tickets: `/draws/${r.c.slug}/tickets.txt` };
  return new Response(JSON.stringify(body, null, 2) + '\n', { headers: JSON_HEADERS });
}
