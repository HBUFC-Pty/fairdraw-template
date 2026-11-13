# Building with AI assistants

Many operators customise this template with AI coding tools such as Claude Code, Cursor or GitHub Copilot. That works
well, as long as the assistant never weakens the parts that make the site fair. This page shows how.

## Ground rules

1. **Point the assistant at `AGENTS.md`** (Claude Code also reads `CLAUDE.md`, which has the same content). It lists
   what must never change. Start each session with: "Read AGENTS.md and follow it."
2. **One change at a time.** Ask for one feature, review it, test it, commit it. Large mixed changes hide mistakes.
3. **Read the diff** before committing (`git diff`). If a change touches a protected area below and you did not ask
   for that, reject it.
4. **Run the checks before every commit:**
   `pnpm lint && pnpm typecheck && pnpm test && pnpm check:dashes`
   If a fairness test fails, the change is wrong, not the test.
5. **Never paste secrets or production data** into a prompt: no `.env` values, API keys, database dumps, player emails
   or names. Use the seed data (`pnpm db:seed`) for examples.
6. **Use git branches**, and test on a staging server before going live.

## Protected areas

Ask the assistant to leave these alone unless you are fixing a bug, and then review the change line by line:

- `src/lib/fairdraw/` (the draw algorithm, ported byte for byte from FairDraw and checked against PHP test vectors)
- `src/lib/draw/` (closing, commitment and drawing)
- `drizzle/0001_fairness_guards.sql` (database triggers that refuse changes to committed draws, times and the audit log)
- per-person caps (`src/lib/competitions/`, checkout)
- spend limits and the 24 hour cooling-off (`src/lib/limits/`)
- age checks (`src/lib/auth/age.ts`)
- security headers and CSP (`src/proxy.ts`, `next.config.ts`)
- entry lists: ticket numbers and codes only, never names
- the FairDraw link in the footer and on results pages (a licence condition)

## Prompts that keep the guarantees

- "Read AGENTS.md and run the brand identity interview with me. Propose three directions as preset files, then
  run `pnpm brand:check`." (See docs/branding.md.)
- "Read AGENTS.md. Change our brand's primary colour to a deep teal and the fonts to the editorial pairing. Only edit
  `config/brand.json`, and run `pnpm brand:check` until it passes in light and dark mode."
- "Read AGENTS.md. Use our SVG logo from `public/brand/logo.svg` in the header (set `logo` in `config/brand.json`),
  with alt text. Do not load anything from another domain."
- "Read AGENTS.md. Add a section to the homepage explaining how our draws can be checked, linking to /fairness and to a
  recent draw's verify page. Do not change any draw code."
- "Read AGENTS.md. Add an FAQ page at /faq with questions about free postal entry, per-person caps, spend limits and how
  winners are chosen. Use the facts in our terms; do not invent policies."
- "Read AGENTS.md. Implement the Cashflows adapter in `src/lib/payments/acquirers/cashflows.ts` using the documentation
  I will paste next. Follow the checklist in docs/payments.md and add tests like tests/webhooks.test.ts."
- "Read AGENTS.md. Show instant-win prizes on the competition page as a list with their £ values. This is display
  only: do not change how the main draw picks winners or which tickets it uses."
- "Read AGENTS.md. Add a 'prize value' line to each competition card showing the cash value, so players can see the
  return to players."
- "Read AGENTS.md. Add a Welsh translation of the static pages. Do not change any amounts, times or rules."
- "Read AGENTS.md. Add a page listing our past winners using only the consented first name and initial already in the
  winners table."
- "Read AGENTS.md. Our checks are failing: explain why and fix the code, not the tests."

## Red flags: refuse these

If you (or anyone) asks for any of these, stop. They break the fairness guarantees, the law, or both:

- "Extend the close date because it hasn't sold enough" or "add a rollover"
- "If it sells under X%, give a cash alternative instead of the prize"
- "Let admins pick or re-draw the winner" or "skip the drand step to make the draw faster"
- "Disable the database trigger so we can edit the ticket list"
- "Show buyers' names in the entry list"
- "Remove the cooling-off period on spend limit increases" or "let support lift a self-exclusion"
- "Turn off the age check for returning customers"
- "Relax the Content Security Policy so this marketing script works" (add consent and update the CSP properly instead,
  see docs/gdpr/cookie-statement.md)
- "Remove the FairDraw link"
- "Make the tests pass" by editing or deleting fairness tests
