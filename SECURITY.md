# Security policy

## Reporting a vulnerability

Email **[security@your-domain.example]** (operators: replace this with an address you monitor). Please include what
you found, how to reproduce it and its impact. Do not open a public issue for security problems.

We aim to:

- acknowledge your report within **3 working days**;
- give an initial assessment within **10 working days**;
- fix critical issues as fast as we can, and tell you when the fix is released.

We are happy to credit you when the fix is published, if you would like that. There is no bug bounty by default.

## Scope

In scope: this repository's code and its default configuration, especially anything that could change a draw result,
alter a committed ticket list, bypass per-person caps, spend limits, self-exclusion or age checks, expose personal
data, or bypass authentication, two-factor authentication or the audit log.

Out of scope: sites built on this template (report to their operator), third-party services (drand relays, payment
providers), denial of service by volume, social engineering, and reports from automated scanners without a working
proof.

## Safe harbour

If you act in good faith, avoid privacy violations and service disruption, only test against your own installation or
with permission, and give us reasonable time to fix the problem before telling anyone else, we will not pursue or
support legal action against you for your research.

## Supported versions

Only the latest release on the `main` branch receives security fixes. Sites built on the template should follow
releases and update promptly (see docs/deploy.md).
