# Rules for AI assistants working on this repository

This is a prize-competition site template built so that every draw can be checked by anyone. Operators customise it,
often with AI coding assistants. These rules keep the fairness and safety guarantees intact. AGENTS.md and
CLAUDE.md have the same content. If a request conflicts with a rule below, do not do it: explain the rule and offer a safe alternative.

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
    licence condition (LICENSE).
13. **Keep finished competitions online**, with their results, entry lists and draw records at stable URLs.

## Before you commit

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm check:dashes && pnpm build
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
| `src/lib/web/` | Next.js glue: session cookie, flash messages, origin checks. |
| `src/app/` | Pages, Server Actions (`actions.ts` files) and route handlers. Public draw data lives under `/draws/[slug]/`. |
| `src/proxy.ts` | Per-request CSP nonce. Protected. |
| `scripts/` | Worker (closes and draws on schedule), migrations, seed, create-owner, dash check. |
| `tests/` | Vitest, against in-process Postgres (PGlite) with all migrations and triggers applied. |
| `docs/` | Deployment, payments, legal and GDPR templates, FairDraw rubric mapping, AI-building guide. |

## Safe things to change

Branding (`src/app/globals.css` custom properties, `SITE_NAME`, images in `public/`), page copy that does not alter
the rules above, new informational pages, new payment adapters that implement `PaymentProvider` with signed webhooks,
admin conveniences that write to the audit log, and accessibility improvements. See `docs/ai-building.md` for prompts.
