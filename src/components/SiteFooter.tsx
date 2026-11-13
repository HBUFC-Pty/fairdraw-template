import Link from 'next/link';
import { env } from '@/lib/env';

/** The FairDraw link is a licence condition: keep it visible in the footer (see LICENSE). */
export const FAIRDRAW_URL = 'https://fairdraw.partyofone.quest';

export function FairDrawLink() {
  return (
    <a className="fairdraw-link" href={FAIRDRAW_URL} rel="noopener">
      Draw checks by FairDraw
    </a>
  );
}

export function SiteFooter() {
  const e = env();
  return (
    <footer className="site">
      <div className="wrap">
        <ul>
          <li><Link href="/terms">Terms</Link></li>
          <li><Link href="/free-entry">Free entry by post</Link></li>
          <li><Link href="/fairness">How our draws work</Link></li>
          <li><Link href="/results">Results</Link></li>
          <li><Link href="/responsible-play">Responsible play</Link></li>
          <li><Link href="/privacy">Privacy</Link></li>
          <li><Link href="/cookies">Cookies</Link></li>
          <li><FairDrawLink /></li>
        </ul>
        <p>
          {e.SITE_NAME} is run by {e.OPERATOR_LEGAL_NAME}, company number {e.OPERATOR_COMPANY_NUMBER}, registered office {e.OPERATOR_REGISTERED_ADDRESS}.
          Contact: <a href={`mailto:${e.CONTACT_EMAIL}`}>{e.CONTACT_EMAIL}</a>. Players must be 18 or over.
          {e.VOLUNTARY_CODE_SIGNATORY ? ' We have signed the voluntary code of good practice for prize draw operators.' : ''}
        </p>
      </div>
    </footer>
  );
}
