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
import { competitionBySlug } from '@/lib/public/queries';
import { publicInstant } from '@/lib/public/instant';
import { JSON_HEADERS } from '@/lib/public/draw-files';

/**
 * The instant prizes of a competition. Before the close: the commitment and the prizes won so far. From the close: the
 * salt and the full list as well, which anyone can check against the commitment (src/lib/competitions/instant.ts).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const r = await competitionBySlug((await ctx.params).slug);
  const inst = r ? await publicInstant(r.c) : null;
  if (!r || !inst) return Response.json({ error: 'no instant prizes here' }, { status: 404 });
  const body = inst.record ?? {
    method: 'fairdraw-instant-v1',
    commit: inst.commit,
    committed_at: inst.committedAt.toISOString(),
    closes_at: r.c.closesAt.toISOString(),
    won_so_far: inst.won.map((w) => ({ ticket: w.ticket, title: w.title, value_pence: w.valuePence, won_at: w.wonAt.toISOString() })),
    note: 'The salt and the full list of instant-win numbers are published here at the close, so anyone can check this commitment.',
  };
  return new Response(JSON.stringify(body, null, 2) + '\n', { headers: JSON_HEADERS });
}
