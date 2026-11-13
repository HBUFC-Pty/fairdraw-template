import { drawBySlug, JSON_HEADERS } from '@/lib/public/draw-files';
import { recordFromRow } from '@/lib/draw/service';

/** The full public draw record, in exactly the format of FairDraw's fairdraw_record(). Stable URL, kept forever. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const r = await drawBySlug((await ctx.params).slug);
  if (!r) return Response.json({ error: 'no such draw' }, { status: 404 });
  const record = recordFromRow(r.d);
  if (!record) return Response.json({ error: 'not drawn yet', commitment: `/draws/${r.c.slug}/commitment.json` }, { status: 404 });
  return new Response(JSON.stringify(record, null, 2) + '\n', { headers: JSON_HEADERS });
}
