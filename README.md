# FairDraw competition site template

A secure, production-quality starting point for UK prize-competition operators who want to run competitions that
anyone can check. Built with Next.js (App Router), TypeScript, PostgreSQL 16 and Drizzle ORM, and designed to be
customised safely with AI coding assistants.

Every draw uses [FairDraw's verifiable draw](https://fairdraw.partyofone.quest/guides/getting-to-10.html#draw): the
ticket list is frozen and fingerprinted at the close, the winner is picked with public drand randomness that did not
exist until the advertised draw time, and the full record is published so anyone can re-run it, in their browser or
with FairDraw's own tools. The database itself refuses to change a committed list or redo a draw.

> **Status:** a template. The legal and GDPR documents are starting points, not legal advice: have them, and this
> licence, reviewed by a solicitor before you rely on them. See "What has and has not been tested" below.

## What you get

- **Competitions**: prize description and value, images, ticket price, maximum tickets, per-person cap (enforced at
  checkout across paid and free entries; admins are warned above 10% of the maximum), scheduled close and draw times,
  optional question, status lifecycle (draft, live, closed, drawn). Ticket numbers are picked at random from the
  unsold pool with a cryptographic RNG, or chosen by the player; each ticket records which.
- **Drawn whatever sells**: every competition is drawn at its advertised time for the full prize. No extensions,
  rollovers or reduced prizes. Published terms and times are locked by database triggers.
- **Free entry by post**: recorded by staff, same chance, same cap, shown in the entry list.
- **Verifiable draws**: commitment at close, drand randomness confirmed by at least two relays, winners picked with
  HMAC-SHA256 and rejection sampling, records as JSON at stable URLs, and a "verify this draw" page that re-runs the
  draw in the browser. A scheduled worker closes and draws on time and records scheduled and actual times.
- **Public pages, no login**: competitions stay online after they finish; results with tickets sold, maximum,
  winning tickets and both draw times; entry lists with ticket numbers and codes, never names; winners shown as first
  name and initial only with their consent.
- **Accounts**: sign-up with date of birth and an 18+ check (with a hook for third-party age verification), email
  confirmation, password reset, optional TOTP 2FA (mandatory for staff), spend limits (daily, weekly, monthly, down
  to £0, increases after 24 hours), take a break, self-exclusion, JSON data export and account deletion.
- **Payments** through a `PaymentProvider` interface: a Stripe adapter (Checkout Sessions, signed and idempotent
  webhooks, test mode), a test adapter for local development, and stubs for specialist UK acquirers. Read
  [docs/payments.md](docs/payments.md): Stripe often refuses prize-competition merchants.
- **Admin**: roles (owner, admin, support), competition management, postal entries, refunds, minimal player support
  views, and an append-only, hash-chained audit log of every admin and automatic action.
- **Security**: argon2id, random session ids stored hashed, `__Host-` cookies (httpOnly, Secure, SameSite=Lax),
  nonce-based Content-Security-Policy and strict security headers, Server Action origin checks, Zod validation on every
  input, Postgres-backed rate limiting on login, sign-up, reset, 2FA and checkout.
- **Privacy by default**: no trackers, no analytics, one strictly necessary cookie, so no cookie banner. A scheduled
  retention job deletes or anonymises data on schedule. Templates for the privacy notice, ROPA, DPIA, DSAR and breach
  procedures and the cookie statement are in [docs/gdpr/](docs/gdpr/).
- **Legal templates** in [docs/legal/](docs/legal/): competition terms (prize competition and free draw exemptions),
  responsible play, complaints, and a checklist for the DCMS voluntary code for prize draw operators.

## Ten-minute local quickstart

You need Node.js 24 and pnpm (`corepack enable`), and a PostgreSQL 16 database. The easiest way to get the database
and a mail catcher is Docker:

```sh
git clone <your copy of this repository> my-site && cd my-site
pnpm install
cp .env.example .env
```

Edit `.env` for development (Next.js, Docker Compose and the `pnpm` scripts all read it):

```sh
APP_URL=http://localhost:3000
COOKIE_SECURE=false
DATABASE_URL=postgres://fairdraw:devpassword@localhost:5432/fairdraw
POSTGRES_PASSWORD=devpassword
APP_SECRET=<openssl rand -hex 32>
ENTRY_CODE_SECRET=<openssl rand -hex 32>
PAYMENT_PROVIDER=test
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_REQUIRE_TLS=false
SITE_DOMAIN=localhost
ACME_EMAIL=dev@example.com
```

Start Postgres (published on 127.0.0.1 only) and Mailpit, then migrate, seed demo data and run:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up -d postgres mailpit
pnpm db:migrate
pnpm db:seed
pnpm dev            # http://localhost:3000
pnpm worker         # in another terminal: closes and draws competitions on schedule
```

Emails (sign-up confirmation, password reset) appear in Mailpit at http://localhost:8025. Demo logins (all data is
fictional): `owner@example.test` / `demo-owner-password` (you will be asked to set up 2FA) and `player@example.test` /
`demo-player-password`. The seed includes a competition already drawn with a real drand round: open it and press
"Verify this draw".

No Docker? Any PostgreSQL 16 works: create a database and point `DATABASE_URL` at it.

## Checks

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm check:dashes && pnpm build
pnpm audit
```

Tests run against an in-process Postgres (PGlite) with every migration and fairness trigger applied, so no database
server is needed. They cover the FairDraw port (vectors generated by running FairDraw's PHP), unbiased selection,
commitment immutability, ticket allocation, caps, spend limits, the age check, webhook signatures, auth flows and the
audit-log chain. CI (`.github/workflows/ci.yml`) runs all of the above plus a Docker build and config checks.

## Deploying

Self-hosted on a UK or EU VPS with Docker Compose (Postgres, app, worker, Caddy with automatic TLS): follow
[docs/deploy.md](docs/deploy.md). It covers DNS, firewall, SSH hardening, unattended upgrades, encrypted nightly
backups with a restore test, logs, updating and rolling back.

## Fairness features and FairDraw's rubric

| FairDraw check | How this template meets it |
| --- | --- |
| Draw results pass the draw-position test (20) | Uniform pick over the frozen list (HMAC-SHA256, rejection sampling) |
| Coverage (5) | Sold, maximum and winning tickets published for every draw |
| The draw mechanism can be verified (10) | drand public randomness, every input published, records re-run with FairDraw's tools |
| The draw's inputs can be verified (3) | List frozen at close, public, and kept after the draw |
| Drawn on time (2) | Worker draws at the advertised time; scheduled and actual times shown |
| Full results published (8) | Results page: sold, maximum, every winning ticket |
| Finished competitions stay up (4) | Pages kept; the database refuses to delete published competitions |
| Entry lists (5) | Public, no login, codes instead of names |
| A record of every draw (8) | JSON record per draw at a stable URL, plus a verify page |
| Return to players (6) | Prize value required; admin warning below 60% (your pricing decides this) |
| Free entry (5) | Postal route on every competition, same chance and cap, no account needed |
| Draws whatever is sold (4) | Hard-wired and stated in the terms |
| Per-person caps (3) | Shown and enforced; warning above 10% of the maximum |
| Claims hold up (2) | No unverifiable claims by default |
| The promoter is who it says it is (3) | Company name, number and address in footer and terms (must match Companies House) |
| Privacy notice (3) | Names the payment processor from settings; privacy contact configurable |
| Voluntary code (2) | Checklist provided; you must sign the code yourself |
| Age and spending controls (3) | Date of birth 18+ check at sign-up; daily, weekly and monthly limits |
| Engagement (4) | Up to you: reply to FairDraw's audit email |

More detail, and how to ask for an audit, in [docs/fairdraw.md](docs/fairdraw.md). FairDraw audits sites built on
this template with the same rubric as every other site, and discloses that its author published the template.

## Building with AI assistants

[AGENTS.md](AGENTS.md) (and the identical [CLAUDE.md](CLAUDE.md)) tells AI coding assistants what they must never
weaken: the draw, the commitment, caps, spend limits, age checks, security headers and name-free entry lists.
[docs/ai-building.md](docs/ai-building.md) has prompts for rebranding and extending the site safely.

## What has and has not been tested

- Tested locally: lint, typecheck, the full test suite, the production build, `pnpm audit`, and an end-to-end run of
  the built app against a real PostgreSQL server (sign-up, email confirmation, login, checkout with the test
  provider, spend limits, data export, admin 2FA, publishing, postal entry, and the worker closing and drawing a
  competition on time with real drand randomness, verified with FairDraw's own verifier).
- Not run: the Docker image, Compose stack and Caddyfile (written and structurally checked, and CI builds and
  validates them, but they have not been run by the authors); Stripe against the live API (the adapter's webhook
  handling is tested with Stripe's own signing helper); the acquirer stubs (deliberately unimplemented).

## Licence

MIT, with one additional condition: any public deployment must keep a visible link to FairDraw
(https://fairdraw.partyofone.quest), such as "Draw checks by FairDraw", on public results pages or in the site footer.
Because of that condition this is **not** the OSI-approved MIT licence. Have the licence reviewed by a solicitor before
you rely on it. Full text: [LICENSE](LICENSE).

Security issues: see [SECURITY.md](SECURITY.md).
