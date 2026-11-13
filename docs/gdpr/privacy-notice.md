# Privacy notice: answers for the ICO generator

> **Template, not legal advice.** Have your privacy notice reviewed by a qualified solicitor or data protection adviser
> before you rely on it. This guide was written from the template's code; if you change what the site collects, change
> your answers too.

This template does not ship a privacy notice of its own. Make yours with the Information Commissioner's Office (ICO)
free privacy notice generator, using the answers below, then paste the result into `content/privacy.md`. The
site's `/privacy` page shows that file, together with sections the generator does not cover (cookies, public entry
lists, draw records, winners, age checks).

## 1. Open the right generator

1. Go to the ICO page **Create your own privacy notice**:
   https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/create-your-own-privacy-notice/
2. Choose **Privacy notice generator for customers or suppliers: general business**:
   https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/create-your-own-privacy-notice/png-general-business/

What the ICO says about the tool (checked on 13 November 2026):

- It is for small and medium-sized businesses and charities, for customer and supplier information.
- It is **not suitable for organisations that carry out automated decision making or must have a data protection
  officer**. See the warning in section 4 below before you rely on it.
- It **does not cover cookies**. The cookie section is in `content/privacy.md` and `cookie-statement.md`.
- It is described as being in beta, and the ICO asks you to review your notice when it reaches its final form and at
  least every 12 months.
- The ICO page noted on 4 November 2026 that Word downloads were unavailable; you can copy and paste the result instead.
- The ICO says what you type is kept only until midnight on the day you submit it.

The generator asks its questions in its own order and wording, which may change. We could not check every question
screen (the tool runs in the browser), so match each question to the topic below rather than expecting exact wording.

## 2. Your answers, topic by topic

### Who you are

- Your company's legal name, registered office address and company number exactly as Companies House shows them (the
  same values as `operator` in `config/site.json`).
- Your ICO registration number (the data protection fee).
- Contact for privacy questions: your `contact.privacyEmail`. Check it receives mail.
- Data protection officer: none (most small operators do not need one; check the ICO's guidance if unsure).

### Whose information

- **Players**: people who sign up for an account. All must be 18 or over; the service is not aimed at children.
- **Free postal entrants**: people who enter by post, who may not have an account.
- **Winners** (players or postal entrants).
- **Staff**: your own admin and support users (cover staff with the separate staff generator if you employ people).

### What personal information you collect (and where it comes from)

All of it comes directly from the person, except the payment reference, which comes from your payment processor.

| What | Where it is held | Source in the code |
| --- | --- | --- |
| Name, email address, date of birth | Account | `users` table |
| Password | Only as an argon2id hash; the password itself is never stored | `src/lib/auth/password.ts` |
| Two-factor authentication secret (if switched on) | Encrypted on the server | `src/lib/auth/totp.ts` |
| Login sessions | A random id in a cookie; the server stores only its hash, with created, last seen and expiry times | `sessions` table |
| Email confirmation and password reset links | Stored only as hashes, single use, short-lived | `auth_tokens` table |
| Orders, payment references, refunds | Amounts, dates, status and the processor's reference. **No card details**: players pay on the processor's own page | `orders`, `refunds` tables |
| Tickets and answers to competition questions | Ticket numbers, whether the answer was right, how the number was chosen | `tickets` table |
| Spend limits, breaks and self-exclusion | Limits and dates | `spend_limits`, `users` |
| Self-exclusion fingerprint | A keyed one-way hash of the email address (not the address), kept until the exclusion ends | `exclusions` table |
| Postal entries | Name, email address, postal address, answer, date received | `postal_entries` table |
| Winners | Ticket number; first name and surname initial only if the winner agrees to show it | `winners` table |
| Internet (IP) address | Used briefly as a counter key to slow down repeated login and sign-up attempts, deleted within about a day; also in your server and proxy logs | `src/lib/rate-limit.ts`, Caddy logs |
| Staff actions | The staff member's account id and what they did, in a tamper-evident log (no names or emails) | `audit_log` table |

If you added a phone number to the free entry instructions, add "phone number (postal entries)" here: the template
asks postal entrants for one but does not store it in the database. Record it in your own process if staff keep it.

No special category information (health, ethnicity and so on) is collected. Do not add any without advice.

### Why you use it, and your lawful basis

Choose these in the generator. Lawful bases are a judgement for you; these are the template authors' suggestions.

| Purpose | Lawful basis |
| --- | --- |
| Running player accounts, taking entries, running and drawing competitions, contacting winners, sending account emails (confirmation, password reset, win notices) | Contract |
| Recording free postal entries | Contract (the entrant is entering under your terms) |
| Checking players are 18 or over | Legitimate interests (protecting young people; your terms require 18+). Confirm with your adviser |
| Spend limits, breaks and self-exclusion | Contract and legitimate interests (player protection) |
| Keeping accounting records of payments and refunds | Legal obligation (UK tax and company law) |
| Preventing abuse and keeping accounts secure (rate limiting, logs, audit log) | Legitimate interests |
| Showing a winner's first name and initial | Consent (the winner can withdraw it in their account) |

The template sends **no marketing**. If you add marketing emails, you need consent or the soft opt-in under PECR, and
a new answer here.

### Who you share it with

| Organisation | Role | What they receive |
| --- | --- | --- |
| Your payment processor (`payments.processorName` in `config/site.json`) | Processor for payments (often a separate controller for fraud checks: see their terms) | Card details entered on their page, the player's email address, the order amount and reference |
| Your email provider (`email.provider`) | Processor | Recipient email address and the content of account emails |
| Your hosting provider (`hosting.host`) | Processor | Everything stored on the server |
| drand randomness relays | Not a recipient of personal data | Nothing personal: the site only fetches a public random number |
| FairDraw or anyone else checking your draws | Not a recipient | Public draw records and entry lists contain ticket numbers and codes only |

The privacy notice must name the payment processor you actually use. FairDraw checks this.

### International transfers

Check each provider's own terms and data processing agreement for where they store and process data, including their
sub-processors, and answer accordingly. Many payment and email providers process some data in the United States. If
any provider transfers data outside the UK, the generator will ask what safeguard applies (for example UK adequacy
regulations or the International Data Transfer Agreement or Addendum). Do not guess: ask the provider.

### How long you keep it

These periods are what the template's retention job actually does (`src/lib/retention.ts`, `DELETION_RETAINED` in
`src/lib/account/service.ts`, and `retention.md`):

- Unconfirmed sign-ups with no entries: deleted after 30 days.
- Accounts with no login for 3 years: anonymised (as for a deletion request).
- When a player deletes their account: name, email, date of birth, password, limits and sessions are erased at once.
- Names, email and postal addresses on postal entries: removed 180 days after the competition is drawn.
- Orders, payments and refunds: kept for 6 years from the end of the financial year (accounting records), linked only
  to an anonymous id once the account is deleted or anonymised.
- Prize wins: 6 years, with the public name removed when the account is deleted.
- Ticket numbers and draw records: kept permanently as public proof of each draw; they do not identify anyone once the
  account is anonymised.
- Self-exclusion fingerprint: until the exclusion ends.
- Staff audit log: account ids only, 6 years.
- Payment webhook event ids: 90 days. Expired sessions, used or expired email links and rate limit counters: deleted
  regularly (rate limit counters within about a day).
- Server and proxy logs: as configured on your server (see `docs/deploy.md`, section on logs).

### People's rights

Players can download their data as JSON and delete their account themselves in their account pages. Follow
`dsar-procedure.md` for everything else. Complaints to the ICO: https://ico.org.uk/make-a-complaint/

## 3. Put it on the site

1. Copy the generated notice.
2. Paste it into `content/privacy.md`, replacing the marked placeholder section. Keep the other sections.
3. Fill in the date at the bottom, run the checks (`pnpm check:dashes` will flag any long dashes the generator output
   contains: replace them with commas or colons) and deploy.
4. Set `legalReviewed.privacyNotice` in `config/site.json` once it has been reviewed.

## 4. Automated decisions: check before relying on the generator

The ICO says the generator is not suitable for organisations that carry out automated decision making. This site makes
some decisions automatically: it refuses sign-up to anyone whose date of birth shows they are under 18, blocks orders
that would break a spend limit or happen during a break or self-exclusion, and picks winners by a published random
draw with no human involvement. Whether any of these is a decision "based solely on automated processing" with legal
or similarly significant effects under UK GDPR is a question for your adviser. We could not resolve it for you. Read the
ICO's guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/automated-decision-making-and-profiling/

If your adviser says these count, the generated notice will need extra wording about automated decisions and people's
right to ask for human review.

---

Sources: ICO pages listed above, checked 13 November 2026. No ICO text is reproduced here except short factual
statements about the generator. Provenance: `docs/legal/SOURCES.md`.
