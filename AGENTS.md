# Rules for AI assistants working on this repository

This is a prize-competition site template built so that every draw can be checked by anyone. Operators customise it,
often with AI coding assistants. These rules keep the fairness and safety guarantees intact. AGENTS.md and
CLAUDE.md have the same content. If a request conflicts with a rule below, do not do it: explain the rule and offer a safe alternative.

## First run: setup interview

When an operator first asks you to set up or launch their site, do this before writing any code or touching a server.

1. Ask the questions below **one group at a time**, wait for the answers, and confirm what you recorded:
   - **Business:** trading name for the site, company legal name, company number and registered office address
     exactly as Companies House shows them, ICO registration number.
   - **Domain and hosting:** the domain, which host they chose (see docs/hosting.md), the server's IP address, and
     the SSH host alias they set up in `~/.ssh/config` (docs/start-here.md).
   - **Payments:** provider (Stripe or a specialist acquirer, see docs/payments.md), test or live mode (always test
     until launch), and the processor's legal name for the privacy notice.
   - **Email:** the transactional email provider and the "from" address.
   - **Contacts:** support email, privacy email (it must accept mail), the free-entry postal address.
   - **Competition defaults:** per-person cap as a percentage of the maximum (10% or less), the suggested monthly
     spend limit shown at sign-up.
   - **Legal:** which templates in docs/legal/ and docs/gdpr/, and the licence, they have had reviewed by a solicitor,
     and whether they have signed the DCMS voluntary code.
   - **Branding:** run the brand identity interview below.
2. Record the answers in `config/site.json` (non-secret only) and show the operator the diff.
3. **Never ask for, accept or repeat private keys, passwords, SMTP credentials or live API secrets in chat.** If the
   operator pastes one, tell them to treat it as exposed and rotate it. Secrets go only into the server's `.env`, which
   the operator fills in themselves with `scripts/make-env.sh` on the server. You use their SSH key through ssh-agent
   without ever reading the key file.
4. Then follow docs/start-here.md step by step. **Before every step that changes a server, a DNS record or a payment
   or email account, say exactly what will happen and wait for the operator to confirm.**

## Brand identity interview

Every site should look like its own business, not like the template. After the setup interview:

1. Ask, one at a time: the business name and its story; who the players are; the feeling they want (for example
   premium, playful, community, outdoors, calm); three sites or brands they like and why; colours they love and
   colours they hate; whether they have a logo (put it in `public/brand/`).
2. Propose **three distinct directions**. For each: a name, a palette for light and dark mode, a font pairing from
   `src/brand/fonts.ts`, layout choices (home, card, header, footer), button and card style, and a one-line tone of
   voice with a few do and avoid notes. Make them differ in structure as well as colour.
3. Write each as `config/brand-presets/<name>.json`, run `pnpm brand:check` on them (fix every failure using the
   suggested colours), and ask the operator to compare them at `/brand-preview?preset=<name>` (run `pnpm dev`).
4. Let them pick one and tweak it. Copy it to `config/brand.json`, run `pnpm brand:check` again, and remove the
   presets they rejected if they want.
5. Use the brand's `tone` for any UI copy you write. Do not change the wording of the rules, terms or fairness
   statements to fit a tone: those say exactly what happens.
6. Never copy another company's logo, name, slogan or distinctive look (trade dress), even if the operator asks.
   "Inspired by the calm of X" is fine; imitating X is not.

The FairDraw link and every fairness feature look and work the same under every brand. See docs/branding.md.

## Never weaken or bypass these

1. **The draw.** `src/lib/fairdraw/` is a byte-for-byte port of FairDraw's verifiable draw. Do not change the
   algorithm, the record format, the drand chain or the method URL. `tests/fairdraw-port.test.ts` must keep passing
   against the unchanged vectors in `tests/vectors/`. Never regenerate the vectors to make a changed port pass.
2. **The commitment.** The ticket list is frozen at the close and published before the randomness exists. Never draw
   before the committed drand round exists, never change a committed list, never redo a draw, never pick winners any
   other way, never let anyone (admin included) trigger, delay or choose a draw. `src/lib/draw/service.ts` and the
   triggers in `drizzle/0001_fairness_guards.sql` enforce this. Do not edit or drop those triggers; do not add
   migrations that disable them.
3. **At least two drand relays must agree** (`src/lib/fairdraw/beacon.ts`). Do not lower `minAgreeing` or skip the
   signature hash check.
4. **Drawn at the advertised time whatever sells.** No extensions, rollovers, reduced prizes, or cash alternatives
   because a competition undersold. Published competitions keep their price, maximum, cap, prize value, question and
   times. Do not add features that change these after publishing.
5. **Free entry by post** with the same chance and the same per-person cap. Keep the route on every competition page
   and in the terms.
6. **Per-person caps** are enforced at checkout across paid and postal entries. Do not raise the default guidance
   above 10% of the maximum or remove the admin warning.
7. **Spend limits.** Decreases apply at once; increases and removals wait 24 hours. Do not shorten the cooling-off
   period, add ways round limits, or remove take-a-break and self-exclusion (which cannot be lifted early).
8. **Age checks.** Players must be 18 or over. Keep the date-of-birth check at sign-up and at checkout. A third-party
   verifier may be added through the hook in `src/lib/auth/age.ts`, never instead of the 18+ rule.
9. **Security headers and CSP.** Keep `src/proxy.ts` (nonce-based Content-Security-Policy) and the headers in
   `next.config.ts`. No `'unsafe-inline'`, no wildcard sources, no inline `style` attributes (use CSS classes). Keep
   the Server Action origin checks (`assertSameOrigin`), Zod validation of every input, rate limits, argon2id, hashed
   session ids, `httpOnly`/`Secure`/`SameSite=Lax` cookies and mandatory TOTP for staff.
10. **Privacy.** Never store or show full names, emails or addresses in entry lists, results or draw records. Entry
    lists show ticket numbers and entry codes only. Winners appear as first name and surname initial, and only with
    their consent. Do not add analytics, trackers, third-party embeds or non-essential cookies without the operator
    explicitly asking, and then follow `docs/gdpr/cookie-statement.md` (consent first, CSP and privacy notice updated).
11. **The audit log** is append-only and hash-chained. Log every new admin action with `appendAudit`. Never add
    UPDATE or DELETE paths for it.
12. **The FairDraw link** ("Draw checks by FairDraw") stays visible in the footer and on results pages. It is a
    requirement of the template's licence, CPAL-1.0 section 14 and Exhibit B (LICENSE, docs/licence.md). Keep the
    CPAL notice at the top of source files (`node scripts/licence-headers.mjs` adds it) and the MIT credit in
    `src/lib/fairdraw/`.
13. **Keep finished competitions online**, with their results, entry lists and draw records at stable URLs.

## Before you commit

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm check:dashes && pnpm brand:check && pnpm build
```

All must pass. Add or update tests for anything you change. No em dashes or en dashes anywhere (code, comments,
docs, UI copy): use commas, colons or "to". UK English. Never commit `.env` or secrets, and never paste production
data into prompts.

## How the code is organised

| Path | What it is |
| --- | --- |
| `src/lib/fairdraw/` | The FairDraw draw port (commit, pick, record, verify), drand beacon client, entry codes. Protected. |
| `src/lib/draw/service.ts` | Closing competitions, publishing commitments, making draws. Protected. |
| `drizzle/` | SQL migrations. `0001_fairness_guards.sql` holds the protective triggers. Add new migrations; never edit old ones. |
| `src/lib/db/schema.ts` | Drizzle schema. Change it, then `pnpm db:generate`. |
| `src/lib/checkout/` | Basket, orders, ticket reservation, payment events, refunds. |
| `src/lib/competitions/` | Competition rules, ticket allocation, caps, postal entries. |
| `src/lib/limits/` | Spend limits. |
| `src/lib/auth/` | Passwords (argon2id), sessions, email tokens, TOTP, age check hook. |
| `src/lib/account/` | Breaks, self-exclusion, consent, data export, deletion. |
| `src/lib/payments/` | `PaymentProvider` interface, Stripe and test adapters, acquirer stubs (docs/payments.md). |
| `src/lib/audit.ts` | Hash-chained audit log. |
| `src/lib/retention.ts` | Scheduled deletion and anonymisation. |
| `config/site.json`, `config/brand.json` | Non-secret site settings and the brand (tokens, fonts, layouts, tone). |
| `src/brand/` | Brand schema, contrast checker, font pairings, token compiler. |
| `scripts/server-setup.sh`, `scripts/deploy.sh`, `scripts/make-env.sh` | Server set-up, deploys with automatic rollback, server-only secrets. |
| `src/lib/web/` | Next.js glue: session cookie, flash messages, origin checks. |
| `src/app/` | Pages, Server Actions (`actions.ts` files) and route handlers. Public draw data lives under `/draws/[slug]/`. |
| `src/proxy.ts` | Per-request CSP nonce. Protected. |
| `scripts/` | Worker (closes and draws on schedule), migrations, seed, create-owner, dash check. |
| `tests/` | Vitest, against in-process Postgres (PGlite) with all migrations and triggers applied. |
| `docs/` | Deployment, payments, legal and GDPR templates, FairDraw rubric mapping, AI-building guide. |

## Safe things to change

Branding (`config/brand.json` and presets, logo files in `public/brand/`, `config/site.json`; never colours or fonts in components), page copy that does not alter
the rules above, new informational pages, new payment adapters that implement `PaymentProvider` with signed webhooks,
admin conveniences that write to the audit log, and accessibility improvements. See `docs/ai-building.md` for prompts.
