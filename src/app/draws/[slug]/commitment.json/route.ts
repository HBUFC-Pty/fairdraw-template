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
import { drawBySlug, JSON_HEADERS } from '@/lib/public/draw-files';
import { commitFromRow } from '@/lib/draw/service';

/** The commitment published at the close (FairDraw's fairdraw_commit() format), plus the advertised draw time. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const r = await drawBySlug((await ctx.params).slug);
  if (!r) return Response.json({ error: 'not closed yet' }, { status: 404 });
  const body = { ...commitFromRow(r.d), scheduled_draw_at: r.d.scheduledDrawAt.toISOString(), tickets: `/draws/${r.c.slug}/tickets.txt` };
  return new Response(JSON.stringify(body, null, 2) + '\n', { headers: JSON_HEADERS });
}
