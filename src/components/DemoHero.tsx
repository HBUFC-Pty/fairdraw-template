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

/** The opening section of a demo site's home page in the hero, grid and featured layouts: what this is and how to try it. */
export function DemoHero() {
  return (
    <section className="demo-hero" aria-labelledby="demo-title">
      <div>
        <p className="demo-kicker">Template demo</p>
        <h1 id="demo-title">Prize draws anyone can check</h1>
        <p>Sign up with made-up details, pay with the test card, then check the draw.</p>
        <p className="demo-actions">
          <Link className="button" href="/signup">Try it as a player</Link>
          <a className="button secondary" href={TEMPLATE_REPO_URL}>Get the template</a>
        </p>
      </div>
      <div className="hero">
        <img src="/images/demo-hero.svg" alt="Two raffle tickets and a green tick: a draw anyone can check" width={600} height={600} />
      </div>
    </section>
  );
}
