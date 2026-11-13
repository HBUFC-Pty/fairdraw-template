import Link from 'next/link';
import { env } from '@/lib/env';
import { TemplateWarning } from '@/components/TemplateWarning';
import { FairDrawLink } from '@/components/SiteFooter';

export const metadata = { title: 'Terms' };

/*
 * Generated competition terms. The fuller template, with notes for your solicitor, is docs/legal/terms-template.md.
 * Have both reviewed before relying on them. Do not remove the "drawn whatever is sold" clause, the free entry route,
 * the per-person cap or the 18+ rule: see AGENTS.md.
 */
export default function TermsPage() {
  const e = env();
  return (
    <article>
      <TemplateWarning />
      <h1>Competition terms</h1>
      <h2>1. The promoter</h2>
      <p>
        The promoter is {e.OPERATOR_LEGAL_NAME}, a company registered in England and Wales with company number {e.OPERATOR_COMPANY_NUMBER}, registered
        office {e.OPERATOR_REGISTERED_ADDRESS}. Contact us at <a href={`mailto:${e.CONTACT_EMAIL}`}>{e.CONTACT_EMAIL}</a>.
      </p>
      <h2>2. What our competitions are</h2>
      <p>
        Our competitions are prize competitions with a free entry route. Every competition can be entered free of charge by post, and a free entry has
        exactly the same chance of winning as a paid entry. Where a competition asks a question, only entries with the correct answer go into the draw.
      </p>
      <h2>3. Who can enter</h2>
      <p>
        You must be 18 or over and live in the United Kingdom. We check your date of birth when you sign up. Our staff and their households cannot enter.
        You cannot enter while you are taking a break or have self-excluded.
      </p>
      <h2>4. Entering</h2>
      <ul>
        <li>Each competition shows its ticket price, the maximum number of tickets, the maximum per person, the closing time and the draw time.</li>
        <li>The maximum per person applies to paid and free entries together, matched by email address.</li>
        <li>Ticket numbers are either chosen by you or picked at random by our system from the unsold numbers, using a cryptographic random number generator. We record which.</li>
        <li>Tickets are reserved while you pay and are entered once payment is confirmed. A payment confirmed after its reservation lapsed or after the close is refunded in full.</li>
        <li>Where there is a question, a ticket with a wrong answer is not entered into the draw and its price is refunded after the close.</li>
        <li>Spend limits you set apply to every order. Lowering a limit takes effect at once; raising or removing one takes effect after 24 hours.</li>
      </ul>
      <h2>5. Free entry by post</h2>
      <p>
        Send your full name, postal address, email address, phone number and, if the competition asks a question, your answer, to {e.POSTAL_ENTRY_ADDRESS}.
        Write the name of the competition on the entry. One entry per envelope, sent with the correct postage. Entries must arrive before the closing time.
        No purchase, account or deposit is needed. Each valid postal entry gets one ticket number picked at random from the unsold numbers and appears in
        the public entry list like any other ticket. <Link href="/free-entry">More about free entry</Link>.
      </p>
      <h2>6. Closing and the draw</h2>
      <p>
        <strong>Every competition is drawn at its advertised time for the full prize, however many tickets are sold.</strong> We never extend a closing
        date, roll a prize over to another competition, reduce a prize or replace it with a cash alternative because too few tickets sold. If a competition
        sells out, it closes early and is still drawn at the advertised draw time.
      </p>
      <p>
        At the close we freeze the list of entered tickets and publish it with its SHA-256 fingerprint and the number of a future round of the drand public
        randomness beacon, timed for the advertised draw. When that round is published we fetch its randomness from at least two independent drand
        servers, pick the winner(s) with the published method, and publish the full draw record. Anyone can re-run the draw from the record. The method is{' '}
        <a href="https://fairdraw.partyofone.quest/guides/getting-to-10.html#draw" rel="noopener">FairDraw&apos;s verifiable draw</a>. Nobody, including us,
        can change the frozen list or make a draw again.
      </p>
      <h2>7. Results and winners</h2>
      <p>
        Results show the tickets sold, the maximum, the winning ticket(s) and the scheduled and actual draw times, and stay online after the competition
        ends. Entry lists show ticket numbers and codes, never names. We contact winners by email. We show a winner&apos;s first name and the initial of
        their surname only if they agree. We may ask a winner to prove their age and identity before handing over a prize. <FairDrawLink />.
      </p>
      <h2>8. Refunds and cancellation</h2>
      <p>
        Because the draw cannot be changed once committed, entries cannot be cancelled after the close. If we ever have to cancel a competition before its
        close for reasons outside our control, every paid entry is refunded in full.
      </p>
      <h2>9. Complaints</h2>
      <p>Email <a href={`mailto:${e.CONTACT_EMAIL}`}>{e.CONTACT_EMAIL}</a>. We aim to reply within 14 days.</p>
      <h2>10. Privacy</h2>
      <p>See our <Link href="/privacy">privacy notice</Link>.</p>
    </article>
  );
}
