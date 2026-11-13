# FairDraw

[FairDraw](https://fairdraw.partyofone.quest) is an independent site that audits UK prize-competition draws from
public information. Each audited site gets a score out of 10 built from 19 checks in four pillars, explained on
FairDraw's [scoring page](https://fairdraw.partyofone.quest/scoring.html). FairDraw's guide
[Getting to a 10](https://fairdraw.partyofone.quest/guides/getting-to-10.html) says what each check needs.

This template was published by FairDraw's author to make the fair way the easy way. Using it does not guarantee any
score: scores come from what your live site actually publishes and does, measured the same way for every site.

## How the template maps to the rubric

| Check | Points | What the template does | What you still have to do |
| --- | --- | --- | --- |
| Draw results pass the draw-position test | 20 | Uniform draws with HMAC-SHA256 and rejection sampling over the committed list | Run draws; points come with time and sample size |
| Coverage | 5 | Publishes sold, maximum and winning tickets for every draw | Nothing, unless you hide results |
| The draw mechanism can be verified | 10 | drand public randomness, every input published, records re-run with FairDraw's tools | Keep records online |
| The draw's inputs can be verified | 3 | Ticket list frozen at the close, published and kept after the draw | Keep lists online |
| Drawn on time | 2 | Worker draws at the advertised time; scheduled and actual times published | Keep the worker running and monitored |
| Full results published | 8 | Results page shows sold, maximum and every winning ticket | Nothing |
| Finished competitions stay up | 4 | Finished pages stay; the database refuses to delete published competitions | Do not remove them |
| Entry lists | 5 | Public entry lists, no login, codes instead of names | Nothing |
| A record of every draw | 8 | JSON draw record per draw at a stable URL, plus a verify page | Nothing |
| Return to players | 6 | Prize value is a required field | Size prizes and maximums so prize value is 60% or more of maximum takings; state £ values for instant wins |
| Free entry | 5 | Postal route on every competition, same chance, same cap, no account needed | Publicise it; process post promptly and fairly |
| Draws whatever is sold | 4 | Hard-wired: no extensions, rollovers or prize cuts; stated in the terms | Do not add such clauses |
| Per-person caps | 3 | Cap shown on every competition and enforced; admin warning above 10% of the maximum | Choose caps of 10% or less |
| Claims hold up | 2 | No ratings or "certified RNG" claims by default | Only make claims a reader can check; never reward reviews |
| The promoter is who it says it is | 3 | Company name, number and address from settings, shown in terms and footer | Match Companies House exactly |
| Privacy notice | 3 | Notice names the processor from `PAYMENT_PROCESSOR_NAME` | Set it to the processor you actually use; check the privacy address receives mail |
| Voluntary code | 2 | Checklist in `docs/legal/` | Sign the DCMS voluntary code so you appear on the gov.uk list |
| Age and spending controls | 3 | DOB 18+ check at sign-up; daily, weekly and monthly limits | Nothing |
| Engagement | 4 | | Reply to FairDraw's audit email within 14 days |

## Asking for an audit

When your site has been running for a while and has published some draws:

- if FairDraw has already audited it, find it in the [audits](https://fairdraw.partyofone.quest/#audits) and use the
  "Request a new audit" button under its score;
- otherwise, suggest it at https://fairdraw.partyofone.quest/suggest.html.

Audits of sites built on this template use exactly the same rubric as every other site, and the audit page discloses
that FairDraw's author published the template.

## The link back

The licence (see `LICENSE`) requires every public deployment to keep a visible link to FairDraw
(https://fairdraw.partyofone.quest), such as "Draw checks by FairDraw", on every public results page or in the site
footer. The template already has both. Keep them.
