import Link from 'next/link';
import { env } from '@/lib/env';

/** The FairDraw link is a licence condition: it appears in every footer style and on results pages (see LICENSE). */
export const FAIRDRAW_URL = 'https://fairdraw.partyofone.quest';

export function FairDrawLink() {
  return (
    <a className="fairdraw-link" href={FAIRDRAW_URL} rel="noopener">
      Draw checks by FairDraw
    </a>
  );
}

function OperatorLine() {
  const e = env();
  return (
    <p>
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

/** Footer: "columns" or "minimal" (brand.layout.footer). Both carry the FairDraw link and the operator details. */
export function SiteFooter({ style }: { style: 'columns' | 'minimal' }) {
  if (style === 'minimal') {
    return (
      <footer className="site">
        <div className="wrap">
          <ul>
            {[...LINKS.play, ...LINKS.rules].map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}
            <li><FairDrawLink /></li>
          </ul>
          <OperatorLine />
        </div>
      </footer>
    );
  }
  return (
    <footer className="site">
      <div className="wrap">
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
        <OperatorLine />
      </div>
    </footer>
  );
}
