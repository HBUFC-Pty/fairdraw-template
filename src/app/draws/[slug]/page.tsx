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
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { drawBySlug } from '@/lib/public/draw-files';
import { DEFAULT_DRAND_RELAYS } from '@/lib/fairdraw/beacon';
import { FairDrawLink } from '@/components/SiteFooter';
import { VerifyDraw } from './VerifyDraw';

export const metadata = { title: 'Verify this draw' };

export default async function VerifyPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = await drawBySlug((await params).slug);
  if (!r) notFound();
  // Always the public relays, never this site's own setting: the check must not depend on the operator.
  const relays = DEFAULT_DRAND_RELAYS;
  return (
    <>
      <h1>Verify this draw: {r.c.title}</h1>
      <p>
        This page re-runs the draw in your browser. It downloads the published record and ticket list from this site, fetches the randomness for the
        committed round straight from the public drand network (not from us), and repeats the winner selection step by step.
      </p>
      {r.d.randomness ? (
        <VerifyDraw slug={r.c.slug} relays={relays} />
      ) : (
        <p className="notice warn">This competition has not been drawn yet. Its commitment is published: <a href={`/draws/${r.c.slug}/commitment.json`}>commitment.json</a>.</p>
      )}
      <h2>Check it yourself, without this site</h2>
      <ol>
        <li>Download the <a href={`/draws/${r.c.slug}/record.json`}>draw record</a> and the <a href={`/draws/${r.c.slug}/tickets.txt`}>ticket list</a>.</li>
        <li>
          Run FairDraw&apos;s independent verifier: <code>node fairdraw-verify.mjs record.json tickets.txt</code> (
          <a href="https://fairdraw.partyofone.quest/guides/code/fairdraw-verify.mjs" rel="noopener">download it from FairDraw</a>).
        </li>
        <li>Or compare the randomness with any drand relay, for example <code>https://api.drand.sh/{r.d.drandChain}/public/{r.d.drandRound}</code>.</li>
      </ol>
      <p>
        The method is FairDraw&apos;s <a href="https://fairdraw.partyofone.quest/guides/getting-to-10.html#draw" rel="noopener">verifiable draw</a>. <FairDrawLink />.{' '}
        <Link href="/fairness">How our draws work</Link>.
      </p>
    </>
  );
}
