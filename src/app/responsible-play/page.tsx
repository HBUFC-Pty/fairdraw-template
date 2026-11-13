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

export const metadata = { title: 'Responsible play' };

/* Fuller template: docs/legal/responsible-play.md. Check the support services' details before going live (docs/legal/SOURCES.md). */
export default function ResponsiblePlayPage() {
  return (
    <article>
      <h1>Responsible play</h1>
      <p>Competitions should be fun. Only spend what you can afford to lose, and never chase losses.</p>
      <h2>Tools in your account</h2>
      <ul>
        <li><strong>Spend limits</strong>: daily, weekly and monthly, down to £0. Lower limits apply at once; higher limits wait 24 hours. <Link href="/account/limits">Set limits</Link>.</li>
        <li><strong>Take a break</strong>: from 24 hours to 6 weeks. <Link href="/account/break">Take a break</Link>.</li>
        <li><strong>Self-exclusion</strong>: from 6 months to 5 years. It cannot be undone early, and still applies if you delete your account.</li>
      </ul>
      <h2>Support</h2>
      <p>If you are worried about your spending, or someone else&apos;s, free and confidential help is available:</p>
      <ul>
        <li>GamCare and the National Gambling Helpline: <a href="https://www.gamcare.org.uk" rel="noopener">gamcare.org.uk</a></li>
        <li>GambleAware: <a href="https://www.gambleaware.org" rel="noopener">gambleaware.org</a></li>
        <li>Citizens Advice, for money worries: <a href="https://www.citizensadvice.org.uk/debt-and-money/" rel="noopener">citizensadvice.org.uk</a></li>
        <li>National Debtline, run by the Money Advice Trust: <a href="https://nationaldebtline.org" rel="noopener">nationaldebtline.org</a></li>
        <li>Samaritans, any time, about anything: <a href="https://www.samaritans.org" rel="noopener">samaritans.org</a></li>
        <li>Mind, for mental health: <a href="https://www.mind.org.uk" rel="noopener">mind.org.uk</a></li>
      </ul>
      <p className="muted">These include the services the DCMS Voluntary Code of Good Practice for Prize Draw Operators names in clause 1.8.</p>
      <p>You must be 18 or over to play.</p>
    </article>
  );
}
