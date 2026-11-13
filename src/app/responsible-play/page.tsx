import Link from 'next/link';

export const metadata = { title: 'Responsible play' };

/* Fuller template: docs/legal/responsible-play.md. Check the support organisations' current details before going live. */
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
        <li>GambleAware: <a href="https://www.begambleaware.org" rel="noopener">begambleaware.org</a></li>
        <li>Citizens Advice, for money worries: <a href="https://www.citizensadvice.org.uk/debt-and-money/" rel="noopener">citizensadvice.org.uk</a></li>
      </ul>
      <p>You must be 18 or over to play.</p>
    </article>
  );
}
