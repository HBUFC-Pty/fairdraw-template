# Personal data breach procedure

> **Template, not legal advice.** Have this procedure reviewed by a qualified solicitor or data protection adviser
> before you rely on it. The ICO notes that its breach guidance is under review following the Data (Use and Access) Act
> 2025: check the current pages linked below.

Neither of the open-licensed policy collections we looked at (Automattic's Legalmattic and 37signals' policies) has a
breach notification procedure, so this one follows the ICO's own guide. The "What the law requires" section and the two
checklists are copied from the ICO's guide (see the credit at the end); the steps for this site are the template
authors' own.

- ICO guide: https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/personal-data-breaches-a-guide/
- ICO quick guide for small organisations, the first 72 hours:
  https://ico.org.uk/for-organisations/advice-for-small-organisations/personal-data-breaches/72-hours-how-to-respond-to-a-personal-data-breach/
- ICO self-assessment (do we need to report?): https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach-assessment/
- Report a breach to the ICO: https://ico.org.uk/for-organisations/report-a-breach/

## What the law requires

The UK GDPR introduces a duty on all organisations to report certain personal data breaches to the relevant supervisory
authority. You must do this within 72 hours of becoming aware of the breach, where feasible.

If the breach is likely to result in a high risk of adversely affecting individuals' rights and freedoms, you must also
inform those individuals without undue delay.

You should ensure you have robust breach detection, investigation and internal reporting procedures in place. This will
facilitate decision-making about whether or not you need to notify the relevant supervisory authority or the affected
individuals, or both.

You must also keep a record of any personal data breaches, regardless of whether you are required to notify.

A personal data breach means a breach of security leading to the accidental or unlawful destruction, loss, alteration,
unauthorised disclosure of, or access to, personal data.

## Checklists

### Preparing for a personal data breach

- [ ] We know how to recognise a personal data breach.
- [ ] We understand that a personal data breach isn't only about loss or theft of personal data.
- [ ] We have prepared a response plan for addressing any personal data breaches that occur.
- [ ] We have allocated responsibility for managing breaches to a dedicated person or team.
- [ ] Our staff know how to escalate a security incident to the appropriate person or team in our organisation to
  determine whether a breach has occurred.

### Responding to a personal data breach

- [ ] We have in place a process to assess the likely risk to individuals as a result of a breach.
- [ ] We have a process to inform affected individuals about a breach when their rights and freedoms are at high risk.
- [ ] We know we must inform affected individuals without undue delay.
- [ ] We know who is the relevant supervisory authority for our processing activities.
- [ ] We have a process to notify the ICO of a breach within 72 hours of becoming aware of it, even if we do not have
  all the details yet.
- [ ] We know what information we must give the ICO about a breach.
- [ ] We know what information about a breach we must provide to individuals, and that we should provide advice to help
  them protect themselves from its effects.
- [ ] We document all breaches, even if they don't all need to be reported.

## Steps for this site

Person responsible for breaches: [name, role]. Deputy: [name, role].

### Within the first hours

1. **Contain**: revoke leaked credentials; rotate the database and SMTP passwords and payment keys as needed with
   `scripts/make-env.sh set KEY`; delete all sessions (`DELETE FROM sessions;`) to log everyone out; take affected
   systems offline if necessary. Rotating `APP_SECRET` also disables everyone's two-factor set-up, so do it only if it
   may have leaked.
2. **Record** in the breach log below: when it happened, when you found out, what data and how many people, how,
   actions taken. The 72 hours run from when you became aware.
3. **Preserve evidence**: logs, database snapshots, and the admin audit log (its hash chain shows whether it was
   altered; check it on the admin audit page).

### Decide whether to report

- **ICO**: use the self-assessment, and report within 72 hours where feasible unless the breach is unlikely to result
  in a risk to people's rights and freedoms. If you do not have full details, report what you know and follow up.
- **Individuals**: if the breach is likely to result in a high risk to them, tell affected people without undue delay,
  in plain language: what happened, likely consequences, what you are doing, what they should do, who to contact.
- **Processors** (hosting, email, payments) must tell you without undue delay; check your contracts.
- **Payment processor**: tell them at once if payment data or keys may be affected.

### Breach log

Record every breach, including ones you decide not to report, with the reasons for each decision, who decided, and
when. Keep the log for [6] years.

| Date found | Description | Data and people affected | Risk assessment | Reported to ICO (date, reference) | Individuals told (date) | Decided by | Lessons |
| --- | --- | --- | --- | --- | --- | --- | --- |

### Afterwards

Review the cause, fix it, and update the DPIA and this procedure.

## Credit and licence

"What the law requires" (the four paragraphs of the ICO's "At a glance" section, and the definition of a personal data
breach from its "In brief" section) and both checklists are copied from: Information Commission's Office, "Personal
data breaches: a guide" (last updated 20 August 2025), licensed under the Open Government Licence v3.0,
https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. The attribution follows the wording the
ICO asks for on https://ico.org.uk/global/copyright-and-re-use-of-materials/. Changes: the checklist boxes were
written as markdown checkboxes, and curly apostrophes as straight ones. The ICO has not reviewed or endorsed this
template. This document's licence terms are separate from the template's code licence (CPAL-1.0).
