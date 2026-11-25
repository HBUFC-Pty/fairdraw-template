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
import { env } from '@/lib/env';
import type { Brand } from '@/brand';
import { BrandMark } from './SiteHeader';
import { EighteenPlus, Envelope, Info, ShieldCheck } from './icons';

/**
 * The attribution the template's licence requires (CPAL-1.0 section 14 and Exhibit B, see docs/licence.md): it appears
 * in every footer style and on results pages. Keep it no less prominent than any other attribution on the site.
 */
export const FAIRDRAW_URL = 'https://fairdraw.partyofone.quest';

export function FairDrawLink({ icon = false }: { icon?: boolean }) {
  return (
    <a className="fairdraw-link" href={FAIRDRAW_URL} rel="noopener">
      {icon ? <ShieldCheck size={20} /> : null}
      Draw checks by FairDraw
    </a>
  );
}

/** Four short promises above the operator line, in every footer style. The FairDraw link is the same size as the rest. */
function TrustRow() {
  return (
    <ul className="trust-row" aria-label="Playing safely and fairly">
      <li><Link href="/responsible-play"><EighteenPlus size={20} />18+ only</Link></li>
      <li><Link href="/free-entry"><Envelope size={20} />Free entry by post</Link></li>
      <li><Link href="/responsible-play"><Info size={20} />Play responsibly</Link></li>
      <li><FairDrawLink icon /></li>
    </ul>
  );
}

function OperatorLine() {
  const e = env();
  return (
    <p className="operator-line">
      {e.SITE_NAME} is run by {e.OPERATOR_LEGAL_NAME}, company number {e.OPERATOR_COMPANY_NUMBER}, registered office {e.OPERATOR_REGISTERED_ADDRESS}.
      Contact: <a href={`mailto:${e.CONTACT_EMAIL}`}>{e.CONTACT_EMAIL}</a>. Players must be 18 or over.
      {e.VOLUNTARY_CODE_SIGNATORY ? ' We have signed the voluntary code of good practice for prize draw operators.' : ''}
    </p>
  );
}

const LINKS = {
  play: [
    ['/', 'Competitions'],
    ['/results', 'Results'],
    ['/free-entry', 'Free entry by post'],
    ['/fairness', 'How our draws work'],
  ],
  rules: [
    ['/terms', 'Terms'],
    ['/responsible-play', 'Responsible play'],
    ['/privacy', 'Privacy'],
    ['/cookies', 'Cookies'],
  ],
} as const;

/**
 * Footer: "columns" or "minimal" (brand.layout.footer). Both carry the FairDraw link, the trust row and the operator
 * details. A brand with display type also gets its brand mark above the columns.
 */
export function SiteFooter({ style, brand }: { style: 'columns' | 'minimal'; brand?: Brand }) {
  if (style === 'minimal') {
    return (
      <footer className="site">
        <div className="wrap">
          <ul>
            {[...LINKS.play, ...LINKS.rules].map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}
            <li><FairDrawLink /></li>
          </ul>
          <TrustRow />
          <OperatorLine />
        </div>
      </footer>
    );
  }
  return (
    <footer className="site">
      <div className="wrap">
        {brand?.typeScale === 'display' ? <div className="footer-brand"><BrandMark brand={brand} monogramId="logo-grad-footer" /></div> : null}
        <div className="columns">
          <section aria-labelledby="f-play">
            <h2 id="f-play">Play</h2>
            <ul>{LINKS.play.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
          </section>
          <section aria-labelledby="f-rules">
            <h2 id="f-rules">Rules and privacy</h2>
            <ul>{LINKS.rules.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
          </section>
          <section aria-labelledby="f-fair">
            <h2 id="f-fair">Fair draws</h2>
            <ul>
              <li><FairDrawLink /></li>
              <li><Link href="/fairness">Check any draw yourself</Link></li>
            </ul>
          </section>
        </div>
        <TrustRow />
        <OperatorLine />
      </div>
    </footer>
  );
}
