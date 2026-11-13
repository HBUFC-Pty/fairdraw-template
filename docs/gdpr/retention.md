# Retention schedule

> **Template, not legal advice.** Have this schedule reviewed by a qualified solicitor or data protection adviser
> before you rely on it.

The retention job (`src/lib/retention.ts`, run daily by the worker) and account deletion
(`deleteAccount` in `src/lib/account/service.ts`) enforce the periods below. If you change a period, change the code,
this file and the privacy notice together.

| Data | Period | How it ends | Where in code |
| --- | --- | --- | --- |
| Unverified account with no orders, tickets or recorded postal entries | 30 days from sign-up | Deleted | `RETENTION.unverifiedAccountDays` |
| Inactive player account (no login) | 3 years from last login (or sign-up) | Anonymised as for a deletion request; skipped while a self-exclusion is running | `RETENTION.inactiveAccountYears` |
| Postal entry name, email and address | 180 days after the competition is drawn | Set to empty; ticket kept | `RETENTION.postalEntryDetailsDaysAfterDraw` |
| Payment webhook event ids | 90 days | Deleted | `RETENTION.webhookEventDays` |
| Sessions | On expiry (30 days players, 12 hours staff) | Deleted | `pruneTokensAndSessions` |
| Email verification and password reset tokens | On expiry (48 hours, 1 hour) | Deleted | `pruneTokensAndSessions` |
| Rate limit counters | 1 day | Deleted | `pruneRateLimits` |
| Self-exclusion fingerprint (keyed hash of email) | Until the exclusion ends | Deleted | `exclusions` table |
| Orders, payments, refunds | 6 years from the end of the financial year | Kept, linked to an anonymous id once the account is anonymised. The template does not delete them automatically: review yearly with your accountant | `RETENTION.financialRecordYears` |
| Ticket numbers, draw commitments and records, winners (ticket only) | Permanently | Public proof of fairness; anonymous once the account is anonymised | database triggers refuse deletion |
| Admin audit log | 6 years | Append-only; holds account ids, never names. The database refuses deletion, so it is not pruned automatically | `audit_log` |

## On account deletion

Erased: email (replaced with an anonymous placeholder), password hash, names, date of birth, two-factor secret,
sessions, tokens, basket, spend limits, public winner name, and the name, address and email on postal entries made
with the account's email.

Kept, as the account deletion page tells the player:

- Orders, payments and refunds (amounts, dates and references, linked to an anonymised account): kept for 6 years from
  the end of the financial year, because UK tax and company law require accounting records to be kept.
- Ticket numbers and draw records: kept permanently, as public proof that each draw was fair. They do not identify the
  person once the account is anonymised.
- Prize wins: kept for 6 years as part of the accounting records. The name is removed from public results.
- Self-exclusion: a one-way keyed fingerprint of the email address (not the address itself) is kept until the exclusion
  ends, so the exclusion still works if they sign up again.
- The admin audit log keeps account ids (not names or emails) for 6 years, to show how the site was run.
