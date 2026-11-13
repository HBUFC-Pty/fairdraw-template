# Competition terms (template)

> **Template, not legal advice.** Have it reviewed by a qualified solicitor before you rely on it if you can.

The competition terms now live in **[content/terms.md](../../content/terms.md)**. The site renders that file at
`/terms`, filling in your company details from `config/site.json`, so what you edit is exactly what players see.

## How the terms are built

- **One clause per significant condition** in the CAP Code, Section 8 (Promotional marketing), rules 8.17 (all
  promotions) and 8.28 (prize promotions). Each clause carries a comment naming the rule it satisfies, for example
  `<!-- CAP 8.28.2: ... -->`. Comments never appear on the site. The CAP Code is cited, not copied.
- **The free entry route** (clause 5) follows the Gambling Commission's guidance on free draws and prize competitions
  and the CAP Executive's advice on free entry routes: ordinary first or second class post, no more expensive and no
  less convenient than paying, promoted at the same level, and treated identically in the draw.
- **The DCMS Voluntary Code's own words** (clause 15) are quoted exactly for the commitments this template carries out,
  under the Open Government Licence v3.0, with the required attribution. The comment above that clause lists the
  commitments left out because the template does not do them for you (for example the credit card limit in 1.3).
- **No operator's or law firm's terms were copied.**

Every source, its licence, the date it was checked and what was copied or changed is in [SOURCES.md](SOURCES.md).

## What to fill in or decide

1. Your company details, contact email and free entry address in `config/site.json` (they fill the `{{PLACEHOLDERS}}`).
2. Clause 3: who can enter. If you accept entries from Northern Ireland, take advice first: different legislation
   applies there.
3. Clause 13: how quickly you notify winners and deliver prizes. Only promise what you can do.
4. Clause 15: keep only the DCMS commitments you meet, and add back the ones the comment lists once you meet them.
5. Every competition page must show its own closing date, draw date, prize and value, maximum tickets and maximum per
   person. The template does this automatically.
