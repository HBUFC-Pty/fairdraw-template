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
import { ArrowRight, Beacon, Envelope, Ticket } from '../icons';

const STEPS = [
  { title: 'Pick a prize', Icon: Ticket },
  { title: 'Get tickets or enter free by post', Icon: Envelope },
  { title: 'Watch the draw, then check it', Icon: Beacon },
] as const;

/** Three steps, no paragraphs. Stage 4 replaces the icons with illustrations. */
export function HowItWorks() {
  return (
    <section className="home-section band bleed" aria-labelledby="how-title">
      <div className="section-head">
        <h2 id="how-title">How it works</h2>
      </div>
      <ol className="steps">
        {STEPS.map(({ title, Icon }, i) => (
          <li key={title} className="step">
            <span className="step-ring" aria-hidden="true"><Icon size={34} /></span>
            <span className="step-no">Step {i + 1}</span>
            <h3 className="step-title">{title}</h3>
          </li>
        ))}
      </ol>
      <p className="steps-more"><Link className="section-link" href="/fairness">How draws work<ArrowRight /></Link></p>
    </section>
  );
}
