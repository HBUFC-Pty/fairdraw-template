import Link from 'next/link';
import { notFound } from 'next/navigation';
import { drawBySlug } from '@/lib/public/draw-files';
import { configuredRelays } from '@/lib/fairdraw/beacon';
import { FairDrawLink } from '@/components/SiteFooter';
import { VerifyDraw } from './VerifyDraw';

export const metadata = { title: 'Verify this draw' };

export default async function VerifyPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = await drawBySlug((await params).slug);
  if (!r) notFound();
  const relays = configuredRelays();
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
