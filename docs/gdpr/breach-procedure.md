# Personal data breach procedure (template)

> **Template, not legal advice.** Have this procedure reviewed by a qualified solicitor or data protection adviser
> before you rely on it.

A personal data breach is a security incident that leads to accidental or unlawful destruction, loss, alteration,
unauthorised disclosure of, or access to, personal data.

## Within the first hours

1. **Contain**: revoke leaked credentials, rotate `APP_SECRET`, database and SMTP passwords and payment keys as needed,
   delete all sessions (`DELETE FROM sessions;`), take affected systems offline if necessary.
2. **Record** in the breach log: when it happened, when you found out, what data and how many people, how, actions
   taken. Start the clock: the 72 hours run from when you became aware.
3. **Preserve evidence**: logs, database snapshots, the audit log (its hash chain shows whether it was altered).

## Decide whether to report

- **ICO**: report within 72 hours of becoming aware unless the breach is unlikely to result in a risk to people's
  rights and freedoms. If you do not have full details, report what you know and follow up. https://ico.org.uk/
- **Individuals**: tell affected people without undue delay if the breach is likely to result in a high risk to them,
  in plain language: what happened, likely consequences, what you are doing, what they should do, who to contact.
- **Processors** must tell you without undue delay; check your contracts.
- **Payment processor**: tell them at once if payment data or keys may be affected.

## Decision log

Record every breach in the log, including ones you decide not to report, with the reasons for each decision, who
decided, and when. Keep the log for [6] years.

| Date found | Description | Data and people affected | Risk assessment | Reported to ICO (date, ref) | Individuals told (date) | Decided by | Lessons |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Afterwards

Review the cause, fix it, update the DPIA and this procedure.
