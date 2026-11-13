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
import { FairDrawLink } from '@/components/SiteFooter';

export const metadata = { title: 'How our draws work' };

export default function FairnessPage() {
  return (
    <article>
      <h1>How our draws work</h1>
      <p>You should not have to take our word that a draw was fair. Every draw on this site can be checked by anyone, without an account.</p>
      <ol>
        <li>
          <strong>At the close</strong> we freeze the list of entered tickets and publish it, with its SHA-256 fingerprint and the number of a future
          round of <a href="https://drand.love" rel="noopener">drand</a>, a public randomness beacon run by independent organisations. That round is timed
          for the advertised draw, so its randomness does not exist yet and nobody, including us, can know it.
        </li>
        <li>
          <strong>At the draw time</strong> we fetch that round&apos;s randomness from at least two independent drand servers and check they agree.
        </li>
        <li>
          <strong>We pick the winner</strong> with HMAC-SHA256 and rejection sampling, so every ticket in the frozen list has exactly the same chance, and
          publish the full record. The same inputs always give the same winner, so anyone can re-run it.
        </li>
      </ol>
      <p>
        The method and the record format are <a href="https://fairdraw.partyofone.quest/guides/getting-to-10.html#draw" rel="noopener">FairDraw&apos;s verifiable draw</a>,
        so FairDraw&apos;s independent tools can check our draws too. <FairDrawLink />.
      </p>
      <h2>Our promises</h2>
      <ul>
        <li>Every competition is drawn at its advertised time, for the full prize, however many tickets are sold. No extensions, no rollovers.</li>
        <li>Free entry by post, with the same chance as a paid entry.</li>
        <li>A maximum number of tickets per person on every competition.</li>
        <li>Public entry lists with ticket numbers and codes, never names.</li>
        <li>Results with tickets sold, the maximum, the winning tickets and the scheduled and actual draw times, kept online for good.</li>
        <li>Nobody can change a frozen list or redo a draw: our database refuses it, and every staff action is recorded in a tamper-evident log.</li>
      </ul>
      <p><Link href="/results">See every result</Link>.</p>
    </article>
  );
}
