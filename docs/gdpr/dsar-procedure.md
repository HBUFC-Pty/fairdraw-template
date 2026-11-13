# Data subject rights procedure

> **Template, not legal advice.** Have this procedure reviewed by a qualified solicitor or data protection adviser
> before you rely on it. The ICO's guidance may change following the Data (Use and Access) Act 2025: check the current
> pages linked below before relying on any time limit here.

This procedure covers subject access requests (SARs) and the other rights people have under UK GDPR. The steps follow
the structure of the ICO's guidance on the right of access:
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/right-of-access/

## The rights people have

Part A below is what you can tell players (it can go in your privacy notice or a reply).

### Part A: your rights with respect to your information

We apply the same data rights to everyone. They include:

- **Right of Access.** This includes your right to access the personal information we gather about you, and your right
  to obtain information about the sharing, storage, security and processing of that information.
- **Right to Correction.** You have the right to request correction of your personal information.
- **Right to Erasure / "To Be Forgotten".** This is your right to request, subject to certain limitations under
  applicable law, that your personal information be erased from our possession and, by extension, from all of our
  service providers. Fulfilment of some data deletion requests may prevent you from using our services because our
  website may then no longer work for you. In such cases, a data deletion request may result in closing your account.
- **Right to Complain.** You have the right to make a complaint regarding our handling of your personal information
  with the Information Commissioner's Office (ICO): https://ico.org.uk/make-a-complaint/
- **Right to Restrict Processing.** This is your right to request restriction of how and why your personal information
  is used or processed.
- **Right to Object.** You have the right, in certain situations, to object to how or why your personal information is
  processed.
- **Right to Portability.** You have the right to receive the personal information we have about you and the right to
  transmit it to another party. You can download your data yourself from your account ("Your data", then "Download my
  data").
- **Right to not Be Subject to Automated Decision-Making.** You have the right to object to and prevent any decision
  that could have a legal or similarly significant effect on you from being made solely based on automated processes.
  This right is limited if the decision is necessary for performance of any contract between you and us, is allowed by
  applicable law, or is based on your explicit consent.

Many of these rights can be exercised by signing in and updating your account information. Please note that certain
information may be exempt from such requests under applicable law. For example, we need to retain certain information
to meet our legal obligations, such as accounting records.

In some cases, we also need to take reasonable steps to verify your identity before responding to a request, which may
include, at a minimum, depending on the sensitivity of the information you are requesting and the type of request you
are making, verifying your name and email address. If we are unable to verify you, we may be unable to respond to your
requests. If you have questions about exercising these rights or need assistance, please contact us at
[privacy email] or at [registered office address]. If someone is acting on your behalf, we will need written consent
signed by you before proceeding.

## Part B: how we handle a request (for staff)

### Time limit

Respond without undue delay and at the latest within one month of receiving the request (or of receiving any
information you reasonably asked for to confirm the person's identity). Count from the day you receive it to the same
date in the following month; if that date does not exist, use the last day of that month. Many organisations use 28
days so they always meet the deadline.

You can extend by a further two months if the request is complex or the person has made a number of requests. Tell
them within the first month, with your reasons. Requests are normally free. Source:
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/right-of-access/what-should-we-consider-when-responding-to-a-request/

### Steps

1. **Recognise and log** the request: date received, who, what they ask for, deadline. Requests can arrive by any
   channel and do not need to mention the law or use any particular words.
2. **Check identity** proportionately. A request from the account's own email address, or made while logged in, is
   usually enough. Ask for more only if you have real doubt, and do not ask for more than you need.
3. **Find the data.** Players can download a full JSON export themselves at Account, Your data ("Download my data").
   If they cannot log in, a developer can produce the same file with `exportUserData` in
   `src/lib/account/service.ts`. Also check: postal entries under their email, emails in your mailbox, notes, backups
   (tell them backups expire on the backup schedule) and your processors.
4. **Other rights.** Correction: edit the record. Erasure: the player can use Account, Delete account, which keeps only
   what the law requires (see `retention.md`); explain what is kept and why. Withdrawal of winner-name consent: the
   player can do it in their account. Automated decisions: see section 4 of `privacy-notice.md`.
5. **Exemptions.** Remove other people's information. Take advice before refusing any part of a request.
6. **Respond** securely, in a commonly used electronic format, and record what was sent and when.
7. **Tell them** they can complain to the ICO: https://ico.org.uk/make-a-complaint/

## Credit and licence

Part A is adapted from the "Your rights with respect to your information" section of the 37signals (Basecamp) privacy
policy, https://github.com/basecamp/policies/blob/master/privacy/index.md, by 37signals LLC, licensed under the Creative
Commons Attribution 4.0 International licence (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/). Changes: the
US-specific "Right to Know" and "Right to Non-Discrimination" and the reference to selling data were removed; the
complaint right now names the ICO; the portability right points to this site's own export instead of 37signals'
products; "Fulfillment" became "Fulfilment" (UK spelling); "applications" became "website"; the example of retained
information now refers to accounting records; 37signals' contact details became placeholders; the sentence on authorised agents was rewritten in plain UK wording;
and the paragraph on appeals and supervisory authorities (which follows US state law) was removed. Part B is the template
authors' own wording, following the ICO guidance cited above; no ICO text is copied except short factual statements of
the time limits. This document's licence is separate from the template's code licence (CPAL-1.0).
