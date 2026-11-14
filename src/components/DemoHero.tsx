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
import { TEMPLATE_REPO_URL } from '@/lib/demo';

/** The home page's opening section on a demo site: what this is, who it is for, and how to try it. */
export function DemoHero() {
  return (
    <section className="demo-hero" aria-labelledby="demo-title">
      <div>
        <p className="demo-kicker">FairDraw competition site template: demo</p>
        <h1 id="demo-title">Try a competition site where every draw can be checked</h1>
        <p>
          Thinking of running prize competitions? This demo lets you try what your players would see before you build your own site from
          the template.
        </p>
        <ol className="demo-steps">
          <li>Sign up with made-up details (we suggest some).</li>
          <li>Enter a competition and pay with the test card. Prices are in points.</li>
          <li>Watch it close and draw at the advertised time, then check the draw yourself.</li>
        </ol>
        <p className="demo-actions">
          <Link className="button" href="/signup">Try it as a player</Link>
          <Link className="button secondary" href="/results">See finished draws</Link>
          <a className="button secondary" href={TEMPLATE_REPO_URL}>Get the template</a>
        </p>
        <p className="muted">
          Nothing here is real: prices and prizes are points with no value, so there is nothing to win or claim, payments are test only, and
          the other players are made up. A short competition draws every few hours, and every draw is a real one made with public drand
          randomness.
        </p>
      </div>
      <div className="hero">
        <img src="/images/demo-hero.svg" alt="Two raffle tickets and a green tick: a draw anyone can check" width={600} height={400} />
      </div>
    </section>
  );
}
