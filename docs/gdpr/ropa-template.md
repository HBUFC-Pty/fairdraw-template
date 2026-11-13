# Record of processing activities (template)

> **Template, not legal advice.** Have this record reviewed by a qualified solicitor or data protection adviser before
> you rely on it. UK GDPR Article 30 sets out what it must contain; check against the ICO's current guidance.

The columns follow the contents Article 30 requires. The wording is the template authors' own, not copied from a
precedent. The ICO offers its own documentation templates and guidance:
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/documentation/how-do-we-document-our-processing-activities/

Controller: [Operator Ltd], [registered office address], ICO registration [number]. Contact: [privacy@example.com].
Data protection lead: [name, role].

| Activity | Purpose | Data subjects | Categories of data | Lawful basis | Recipients and processors | Transfers outside UK | Retention | Security measures |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Player accounts | Provide accounts | Players | Email, password hash, name, date of birth | Contract; legal obligation (age) | Hosting [provider], email [provider] | [state] | See retention.md | argon2id, hashed sessions, TLS, encrypted backups |
| Competition entries and payments | Run competitions, accounting | Players | Orders, tickets, payment references | Contract; legal obligation | [payment processor], hosting | [state] | 6 years (financial) | Signed webhooks, no card data stored |
| Postal entries | Free entry route | Postal entrants | Name, address, email, phone, answer | Contract | Hosting | [state] | 180 days after draw | Admin only, 2FA, audit log |
| Responsible play | Limits, breaks, exclusion | Players | Limits, exclusion dates, keyed email hash | Contract; legitimate interests | Hosting | [state] | Until exclusion ends | As above |
| Winners | Prize delivery, results | Winners | Contact details, consented display name | Contract; consent (publication) | Couriers [name] | [state] | 6 years | As above |
| Security and audit | Protect accounts, accountability | Players, staff | Sessions, rate limits, audit ids | Legitimate interests | Hosting | [state] | See retention.md | Append-only hash chain |
| Staff accounts | Run the site | Staff | Email, name, role, TOTP secret (encrypted) | Contract; legitimate interests | Hosting | [state] | Employment plus [period] | Mandatory 2FA |
