# Data protection impact assessment (template)

> **Template, not legal advice.** Have this assessment reviewed by a qualified solicitor or data protection adviser
> before you rely on it. Follow the ICO's current DPIA guidance and screening checklist.

## 1. Need for a DPIA

[Explain why you are doing one. Online prize competitions involve age checks, payments and potentially vulnerable
people (problem gambling), so a DPIA is good practice even if not strictly required.]

## 2. Description of processing

- Nature: [how data is collected, stored, used, shared; see the ROPA]
- Scope: [volume of players, data categories, retention]
- Context: [players are adults 18+; some may be vulnerable; expectations about privacy of who entered]
- Purposes: [run fair competitions, comply with law, protect players]

## 3. Consultation

[Who you consulted: staff, adviser, processors, players.]

## 4. Necessity and proportionality

[Lawful bases, data minimisation (entry lists show ticket numbers and codes only; winners shown only with consent;
no trackers), retention, how rights are supported (in-app export and deletion), processor contracts, transfers.]

## 5. Risks

| Risk | Likelihood | Severity | Overall |
| --- | --- | --- | --- |
| Under-18s entering | [ ] | [ ] | [ ] |
| Account takeover | [ ] | [ ] | [ ] |
| Harm to vulnerable players | [ ] | [ ] | [ ] |
| Database breach | [ ] | [ ] | [ ] |
| Players identified from public entry lists | [ ] | [ ] | [ ] |
| Staff misuse of data | [ ] | [ ] | [ ] |

## 6. Measures

| Risk | Measures (template provides) | Further measures (you add) | Residual risk |
| --- | --- | --- | --- |
| Under-18s | DOB check at sign-up, age verification hook | [ ] | [ ] |
| Account takeover | argon2id, rate limits, hashed sessions, staff 2FA | [ ] | [ ] |
| Vulnerable players | Spend limits, cooling-off, breaks, self-exclusion | [ ] | [ ] |
| Breach | TLS, encrypted backups, least privilege, firewall | [ ] | [ ] |
| Identification from lists | Codes not names; winner names only with consent | [ ] | [ ] |
| Staff misuse | Roles, minimal support view, hash-chained audit log | [ ] | [ ] |

## 7. Sign-off

Measures approved by: [name, date]. Residual risks approved by: [name, date]. Adviser's comments: [ ].
Review date: [date].
