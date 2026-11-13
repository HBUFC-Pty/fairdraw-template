import { env } from '@/lib/env';
import { TemplateWarning } from '@/components/TemplateWarning';
import { RETENTION } from '@/lib/retention';

export const metadata = { title: 'Privacy notice' };

/* Fuller template with lawful bases and a processor list: docs/gdpr/privacy-notice-template.md. Keep the two in step. */
export default function PrivacyPage() {
  const e = env();
  return (
    <article>
      <TemplateWarning />
      <h1>Privacy notice</h1>
      <p>
        {e.OPERATOR_LEGAL_NAME} (company number {e.OPERATOR_COMPANY_NUMBER}, {e.OPERATOR_REGISTERED_ADDRESS}) is the controller of your personal data. ICO
        registration number: {e.OPERATOR_ICO_NUMBER}. Privacy questions: <a href={`mailto:${e.PRIVACY_EMAIL}`}>{e.PRIVACY_EMAIL}</a>, or write to us at our
        registered office.
      </p>
      <h2>What we collect and why</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Data</th><th scope="col">Why</th><th scope="col">Lawful basis</th></tr></thead>
          <tbody>
            <tr><td>Name, email, password (stored only as a secure hash)</td><td>Your account and entries</td><td>Contract</td></tr>
            <tr><td>Date of birth</td><td>Checking you are 18 or over</td><td>Legal obligation and legitimate interests (protecting young people)</td></tr>
            <tr><td>Orders, tickets, payments, refunds</td><td>Running competitions; accounting records</td><td>Contract; legal obligation</td></tr>
            <tr><td>Spend limits, breaks, self-exclusion</td><td>Responsible play</td><td>Legitimate interests; contract</td></tr>
            <tr><td>Postal entries (name, address, email, phone)</td><td>Recording free entries and contacting winners</td><td>Contract</td></tr>
            <tr><td>Security logs, rate-limit counters</td><td>Protecting accounts from attack</td><td>Legitimate interests</td></tr>
          </tbody>
        </table>
      </div>
      <h2>Who receives it</h2>
      <p>
        Card payments are processed by {e.PAYMENT_PROCESSOR_NAME}, which receives your payment details to take payment. We never see or store your full card
        number. Our hosting provider and email provider process data on our behalf under contract. The drand randomness servers used for draws receive no
        personal data. Public entry lists and results show ticket numbers and codes only; a winner&apos;s first name and initial are shown only with their
        agreement.
      </p>
      <h2>How long we keep it</h2>
      <ul>
        <li>Unverified sign-ups with no entries: deleted after {RETENTION.unverifiedAccountDays} days.</li>
        <li>Accounts with no log-in for {RETENTION.inactiveAccountYears} years: anonymised.</li>
        <li>Names and addresses on postal entries: removed {RETENTION.postalEntryDetailsDaysAfterDraw} days after the draw.</li>
        <li>Orders, payments and refunds: {RETENTION.financialRecordYears} years, as UK tax and company law require; linked only to an anonymous id once your account is deleted or anonymised.</li>
        <li>Ticket numbers and draw records: kept permanently as public proof of each draw. They do not identify you.</li>
      </ul>
      <h2>Cookies</h2>
      <p>We use one strictly necessary cookie to keep you logged in. No analytics, advertising or tracking cookies.</p>
      <h2>International transfers</h2>
      <p>[State where your hosting, email and payment providers process data, and the safeguards used for any transfer outside the UK.]</p>
      <h2>Your rights</h2>
      <p>
        You can access, correct, export or delete your data, and object to or restrict some processing. You can download your data and delete your account
        from your account pages. You can complain to the Information Commissioner&apos;s Office: <a href="https://ico.org.uk/make-a-complaint/" rel="noopener">ico.org.uk/make-a-complaint</a>.
      </p>
      <p>We do not send marketing.</p>
    </article>
  );
}
