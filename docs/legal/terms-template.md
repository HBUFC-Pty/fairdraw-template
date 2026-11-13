# Competition terms (template)

> **Template, not legal advice.** Have these terms reviewed by a qualified solicitor before you rely on them. In
> particular, your solicitor should confirm which exemption under the Gambling Act 2005 your competitions rely on and
> that these terms, your site and your free entry route meet it.

Placeholders in square brackets match the settings in `.env` (shown in brackets after each one).

## 1. The promoter

1.1 The promoter is [Operator Ltd] (`OPERATOR_LEGAL_NAME`), a company registered in England and Wales with company
number [company number] (`OPERATOR_COMPANY_NUMBER`), whose registered office is at [registered office address]
(`OPERATOR_REGISTERED_ADDRESS`). Contact: [hello@example.com] (`CONTACT_EMAIL`).

1.2 Use the name, number and address exactly as they appear at Companies House.

## 2. Legal basis of our competitions

2.1 Our competitions are prize competitions and free draws, not lotteries or gambling. They are designed to fall
within the exemptions for prize competitions and free draws in the Gambling Act 2005, which (in summary) allow a paid
competition where success depends on skill, knowledge or judgement that is sufficient to deter or prevent a
significant proportion of people from entering or winning, or a draw that anyone can enter free of charge by a route
that is as well publicised as the paid route and gives the same chance of winning.

2.2 **For the operator and your solicitor:** state here which exemption (the skill test, the free entry route, or
both) you rely on. This template always provides a free entry route by post and allows an optional skill question.
Confirm the exact statutory provisions with your solicitor; do not rely on this summary.

## 3. Who can enter

3.1 You must be 18 or over and resident in the United Kingdom. We ask for your date of birth when you create an
account and may ask for proof of age before awarding a prize.

3.2 Our employees and their households, and anyone professionally connected with a competition, may not enter.

3.3 You may not enter while you are taking a break or self-excluded from our site.

## 4. Entering

4.1 Each competition page shows the ticket price, the maximum number of tickets, the maximum number of entries per
person, the close time and the draw time.

4.2 **Per-person cap.** Maximum [N] entries per person. Paid and free postal entries count towards the same cap,
matched by email address. The cap is enforced at checkout and when postal entries are recorded.

4.3 **Ticket numbers.** You can either choose your ticket numbers from those still available, or let us allocate
them at random from the unsold numbers using a cryptographic random number generator. Your account records which
method was used for each ticket.

4.4 **Paid entries.** A paid entry is confirmed only when we receive confirmation of payment from our payment
processor. Tickets are held for you for [30] minutes while you pay. If your payment reaches us after that time or after
the competition closes, and your numbers cannot be confirmed, we refund that payment in full and those entries are not
included in the draw.

4.5 **Skill question (where set).** Some competitions include a question. Entries with an incorrect answer are not
included in the draw. Paid entries with an incorrect answer are refunded in full after the competition closes. We do
not tell you before the close whether your answer was right.

4.6 **Spending controls.** You can set daily, weekly and monthly spend limits in your account. A decrease takes effect
straight away; an increase or removal takes effect after 24 hours.

## 5. Free entry by post

5.1 You can enter any competition free of charge by post. No purchase and no account are needed.

5.2 Send your full name, postal address, email address, telephone number, the name of the competition and, if the
competition has a question, your answer, to:

[postal entry address] (`POSTAL_ENTRY_ADDRESS`)

5.3 Your entry must be received before the competition closes. One entry per envelope. Free entries have the same
chance of winning as paid entries and count towards the same per-person cap.

5.4 Each valid postal entry is given a randomly allocated ticket number and appears in the public entry list in the
same way as a paid entry. Entries that are illegible, incomplete, received late or over the per-person cap are not
entered; we keep a record of the reason.

## 6. Closing and the draw

6.1 **This competition will be drawn on [date] for the full prize, however many tickets are sold.** The close time and
draw time shown on the competition page are fixed when the competition is published. We will not extend the close,
roll a competition over, reduce or substitute the prize, or offer a cash alternative because a competition has not
sold out.

6.2 If every ticket sells before the close time, the competition closes early. It is still drawn at the advertised
draw time.

6.3 **How the draw works.** At the close we publish the sorted list of ticket numbers in the draw, its SHA-256
fingerprint, and the number of a future round of the drand public randomness beacon (quicknet) that will not exist
until the advertised draw time. Nobody, including us, can know that round's value in advance. At the draw time we
fetch that round's randomness from at least two independent drand relays, which must agree, and pick the winning
ticket or tickets with HMAC-SHA256 and rejection sampling, so every ticket in the draw has exactly the same chance.
The list cannot be changed once published and a draw cannot be repeated.

6.4 The method follows FairDraw's published method
(https://fairdraw.partyofone.quest/guides/getting-to-10.html#draw). Every draw record is published at a permanent
address on our site, and anyone can re-run the draw in their browser on the draw's "verify this draw" page.

6.5 If no tickets are in the draw, there is no winner and the record says so.

## 7. Results and winners

7.1 For every competition we publish the number of tickets sold, the maximum, the winning ticket number or numbers,
and the scheduled and actual draw times. Finished competitions stay on the site.

7.2 The public entry list shows ticket numbers and a short code only, never names. Your account shows the code for
each of your tickets so you can find them.

7.3 We contact winners by email within [2] working days of the draw. If we cannot reach a winner within [28] days,
we will [describe what happens; agree this with your solicitor, and never use it to avoid awarding a prize].

7.4 We show a winner's first name and the initial of their surname on our results page only if the winner agrees.
You can change your choice at any time in your account.

7.5 Prizes are as described on the competition page. [Delivery, collection and any cash alternative terms. A cash
alternative may be offered to a winner as a choice, but never as a reduction because a competition undersold.]

## 8. Refunds and cancellation

8.1 Because entries are for a specific draw, you cannot cancel a confirmed entry, except as required by law or as set
out in these terms (late payments and incorrect answers are refunded automatically).

8.2 We may cancel a competition only before it is published. Once published, it will be drawn.

## 9. Liability and general

9.1 Nothing in these terms limits liability that cannot be limited by law, or your statutory rights.

9.2 [Add your solicitor's standard clauses on liability, force majeure, disqualification for fraud, and governing law
(England and Wales, or as advised).]

## 10. Complaints

10.1 See our complaints procedure ([link]). If you are not satisfied, [describe any independent route your solicitor
recommends].

## 11. Privacy

11.1 We use your personal data as set out in our privacy notice ([link]).
