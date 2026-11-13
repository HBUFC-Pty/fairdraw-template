# DCMS voluntary code checklist (template)

> **Template, not legal advice.** Have your compliance reviewed by a qualified solicitor. This checklist summarises
> themes only; it is not the code.

The Department for Culture, Media and Sport publishes the voluntary code of good practice for prize draw operators:
https://www.gov.uk/government/publications/voluntary-code-of-good-practice-for-prize-draw-operators

**Read the current gov.uk text and check every item below against it.** The code may have changed since this template
was written, and this list deliberately does not quote it or give clause numbers. Where the code asks for something
not listed here, add it.

Signing up to the code puts you on the gov.uk signatory list, which FairDraw's rubric checks.

| Theme (check against the code) | Where the template helps | What you still need to do | Done |
| --- | --- | --- | --- |
| Age: players are 18 or over | Date of birth and 18+ check at sign-up (`src/lib/auth/age.ts`); hook for third-party age verification | Decide whether to add a verification provider; check age before paying out prizes | [ ] |
| Spending controls | Daily, weekly and monthly limits down to £0; 24 hour cooling-off on increases | Make sure players can find them; mention them at sign-up | [ ] |
| Breaks and self-exclusion | Take a break and self-exclusion, enforced at checkout | Train staff not to lift exclusions | [ ] |
| Free entry route | Postal entry recorded by admin, same chance, same cap, in the entry list | Publicise it as clearly as paid entry; process post promptly | [ ] |
| Clear information before entry | Price, maximum tickets, per-person cap, close and draw times on every page | Write accurate prize descriptions and values | [ ] |
| Fair and transparent draws | Commitment then public randomness, published records, verify page | Keep records online | [ ] |
| Draw happens as advertised | Drawn at the advertised time whatever sells; database refuses changes to times once live | Nothing, unless you change the code (do not) | [ ] |
| Publishing results | Results page with sold, maximum, winning tickets, scheduled and actual time | Contact winners and deliver prizes | [ ] |
| Per-person limits | Cap enforced at checkout; admin warning above 10% of the maximum | Choose sensible caps | [ ] |
| Complaints | Complaints procedure template (`complaints.md`) | Publish it, staff it, keep a log | [ ] |
| Data protection | Privacy notice, retention job, DSAR and breach procedures in `docs/gdpr/` | Register with the ICO; complete the ROPA and DPIA | [ ] |
| Marketing and advertising | No marketing emails or trackers by default | Follow advertising rules (CAP code) for anything you add | [ ] |
| Promoter identity | Company name, number and address from `.env` on terms and footer | Match Companies House exactly | [ ] |
| Anything else in the current code | | Add a row for each further item | [ ] |
