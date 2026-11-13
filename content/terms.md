<!--
TEMPLATE, NOT LEGAL ADVICE. Have it reviewed by a qualified solicitor before you rely on it if you can.

This file is the site's competition terms: /terms renders it, filling {{PLACEHOLDERS}} from config/site.json.
HTML comments like this one never appear on the site; they are notes for you.

How it is built (see docs/legal/SOURCES.md for dates and links):
- One clause for each "significant condition" in the CAP Code, Section 8 (Promotional marketing), rules 8.17 and 8.28,
  as published by the ASA at https://www.asa.org.uk/type/non_broadcast/code_section/08.html (checked 13 November
  2026). The CAP Code is cited, not copied: each comment names the rule the clause is there to satisfy.
- The free entry route follows the Gambling Commission's guidance "Free draws and prize competitions"
  (https://www.gamblingcommission.gov.uk/public-and-players/guide/page/free-draws-and-prize-competitions) and the CAP
  Executive's advice "Promotional marketing: Free entry routes"
  (https://www.asa.org.uk/advice-online/promotional-marketing-free-entry-routes.html).
- Section 15 quotes, word for word, the player protection and transparency commitments of the DCMS Voluntary Code of
  Good Practice for Prize Draw Operators, under the Open Government Licence v3.0.
- No operator's or law firm's terms were used.

Every clause describes what this template actually does. If you change the site's behaviour, change the clause.
-->

# Competition terms

These terms apply to every competition on {{SITE_NAME}}. Each competition's own page gives the details that are
specific to it: the prize, its value, the ticket price, the maximum number of tickets, the maximum per person, the
opening time, the closing time and the draw time. The competition page and these terms together are the rules of that
competition.

## 1. The promoter

<!-- CAP 8.17.9: the promoter's full name and correspondence address. -->

The promoter is {{OPERATOR_LEGAL_NAME}}, company number {{OPERATOR_COMPANY_NUMBER}}, registered office
{{OPERATOR_REGISTERED_ADDRESS}}. You can write to us at that address or email {{CONTACT_EMAIL}}.

## 2. How these competitions work in law

<!--
Gambling Act 2005: the DCMS Voluntary Code says prize draws with a free entry route do not need a licence, citing
section 14(6) and Schedule 2 of the Act. The Gambling Commission's guidance says multiple choice questions "rarely meet"
the skill test for a prize competition, so this template relies on the free entry route, not on the question.
If you accept entries from Northern Ireland, take advice: the CAP Executive's advice notes that different legislation
applies there (the Betting, Gaming, Lotteries and Amusements (Northern Ireland) Order 1985).
-->

Our competitions are free draws: you can enter every one of them for free by post (clause 5), and a free entry has the
same chance of winning as a paid one. Some competitions also ask a question; the question does not replace the free
entry route.

## 3. Who can enter

<!-- CAP 8.17.7: geographical, personal or technological restrictions such as location, age or the need to access the Internet. -->

- You must be 18 or over. We ask for your date of birth when you open an account and check it again before every
  purchase. We may ask a winner to prove their age and identity before handing over a prize.
- You must live in the United Kingdom.
- Paid entries need an account on this website, and so need internet access. Free postal entries do not.
- Our employees, and people who live with them, cannot enter.
- You cannot enter while your account is on a break or self-excluded (see our responsible play page).

## 4. How to enter and what it costs

<!-- CAP 8.17.1: how to participate, including significant conditions and costs. -->

1. Choose a competition, the number of tickets and, if you like, your own ticket numbers. Otherwise our system picks
   numbers at random from the unsold numbers, using a cryptographic random number generator. Each ticket records which.
2. If the competition asks a question, answer it.
3. Pay the ticket price shown on the competition page. Your tickets are reserved while you pay and are entered when
   your payment is confirmed. If a payment is confirmed after the reservation has lapsed, or after the competition has
   closed, we refund it in full and the tickets are not entered.
4. Your account shows each ticket with an entry code, which you can find on the competition's public entry list.

Any spend limits you have set apply to every order. Lowering a limit takes effect at once; raising or removing one
takes effect 24 hours later.

## 5. Free entry by post

<!--
CAP 8.17.2: any free entry route should be explained clearly and prominently.
Gambling Commission guidance: the free route must be no more expensive and no less convenient than the paid route, at
the normal rate (first or second class post, not special delivery), promoted at the same level as the paid route, and
the system that determines prizes must not treat the two routes differently.
-->

You can enter any competition for free, with exactly the same chance of winning as a paid entry.

1. Write your full name, postal address, email address and phone number on a piece of paper, with the name of the
   competition. If the competition asks a question, add your answer.
2. Send it by ordinary first or second class post to: {{POSTAL_ENTRY_ADDRESS}}. You do not need to use special delivery
   or any other paid service.
3. It must arrive before the competition's closing time. Send one entry per envelope.

You do not need an account and you do not need to buy anything. Each valid postal entry is given one ticket number,
picked at random from the unsold numbers in the same way as paid tickets, and appears in the public entry list like any
other ticket. Free and paid entries count towards the same maximum per person (clause 10), matched by email address.
The draw treats every ticket in the same way, however it was entered.

## 6. Opening and closing

<!-- CAP 8.17.3 (start date) and 8.17.4 (a prominent closing date; closing dates must not be changed except in the circumstances rule 8.17.4.e describes). -->

Each competition page shows when it opens, when it closes and when it will be drawn. **We never change a closing time
or a draw time once a competition is published.** If every ticket sells before the closing time, the competition closes
early and is still drawn at the advertised draw time.

## 7. Proof of purchase

<!-- CAP 8.17.5: any proof of purchase requirements. -->

No proof of purchase is needed for any entry.

## 8. Prizes

<!-- CAP 8.17.6: the number and nature of prizes; which will be won; whether they are awarded in instalments or shared. -->

Each competition page states the prize, its value and the number of winners. **Every competition is drawn at its
advertised time for the full prize, however many tickets are sold.** Every prize listed will be won, unless no tickets
at all have been entered. Prizes are not paid in instalments and are not shared between winners.

## 9. Availability

<!-- CAP 8.17.8: limits on availability that a consumer needs to judge whether taking part is worthwhile. -->

Each competition has a maximum number of tickets, shown on its page with the number sold so far. When they are all
sold, the competition closes.

## 10. Limit on entries

<!-- CAP 8.28.1: any restriction on the number of entries. -->

Each competition page shows the maximum number of entries one person can hold. It applies to paid and free entries
together.

## 11. Cash alternatives

<!-- CAP 8.28.2: whether the promoter may substitute a cash alternative for any prize. -->

We do not swap a prize for cash or for a smaller prize. If a competition page offers a cash alternative, the winner may
choose it; we never impose it, and never because of low ticket sales.

## 12. How the winner is chosen

<!-- CAP 8.28.6: the criteria and mechanism for judging entries. -->

At the closing time we freeze the list of entered tickets and publish it, with its SHA-256 fingerprint and the number
of a future round of the drand public randomness beacon, timed for the advertised draw. When that round is published,
we fetch its randomness from at least two independent drand servers, check that they agree, and pick the winner or
winners from the frozen list with the published method. Every ticket in the list has the same chance. We then publish
the full draw record, which anyone can re-run. The method is
[FairDraw's verifiable draw](https://fairdraw.partyofone.quest/guides/getting-to-10.html#draw). Nobody, including us,
can change a frozen list or make a draw again.

Where a competition asks a question, a ticket with a wrong answer is not entered into the draw and its price is
refunded after the close.

## 13. How and when winners are told, and when prizes arrive

<!-- CAP 8.28.4 (how and when winners will be notified) and 8.28.3 (the date prizes arrive, if more than 30 days after the close). -->

We email each winner, at the address on their account or postal entry, within 2 working days of the draw. Results are
published on the results page as soon as the draw is made. We aim to deliver prizes within 30 days of the draw; if a
competition page gives a longer time, that applies.

## 14. What we publish about winners

<!--
CAP 8.28.5 (information showing a valid award took place, and the chance to object) and 8.28.9 (any intention to use
winners in publicity). This template publishes more about the draw than the rule asks (the draw record) and less about
the winner: the name appears only if the winner opts in.
-->

For every competition we publish the number of tickets sold, the maximum, the winning ticket number or numbers, the
scheduled and actual draw times and the draw record. We publish a winner's first name and the initial of their surname
only if the winner agrees, and they can withdraw that agreement at any time in their account. We do not use winners in
publicity without their agreement. If the Advertising Standards Authority asks us to show that a prize was awarded, we
will give it the winner's details.

## 15. Our commitments under the DCMS Voluntary Code

<!--
Copied word for word from the Voluntary Code of Good Practice for Prize Draw Operators (Department for Culture, Media and
Sport, updated 19 October 2026, checked 13 November 2026), clauses 1.1, 1.2, 1.4, 1.5, 1.8, 1.9 and 2.1 to 2.5, under
the Open Government Licence v3.0. Keep the attribution line below.
Clauses left out because this template does not carry them out for you; add them back once you do:
- 1.3 (credit card limits): configure your payment provider first.
- 1.6 and 1.7 (monitoring players for signs of harm and intervening): put a process in place first.
- 1.10 (instant win prize draws): the template has none.
- 1.11 (marketing): your own advertising must follow it.
- 2.6 (charitable contributions): only if you make them.
Clause 1.9 asks for an appropriate time between opening and closing; the template does not enforce a minimum, so set
sensible dates for every competition.
Whether or not you have signed the Code, only keep commitments you actually meet.
-->

We follow these commitments from the Voluntary Code of Good Practice for Prize Draw Operators, quoted exactly:

> 1.1 Operators should only make prize draws available for players aged 18 or over. Operators should implement a reasonable age verification process. Advertisements for prize draws should not be targeted at anyone below the age of 18.

> 1.2 Operators should have an appropriate, transparent and robust complaints process for players and, where required to resolve a complaint, an appropriate dispute resolution process for players.

> 1.4 Subject to the credit card limit in clause 1.3, operators should set suitable and proportionate maximum monthly totals spend limits for all players, or provide the facility for players to set individual monthly total spend limits (in either case across all prize draws offered by the operator) which cannot be exceeded. For player-set limits, players should be reasonably able to set such limits either when they first register an account on an operator’s website, or following completion of their first entry or purchase, and in any event before further entries are permitted. Operators should allow customers to set their individual spend limit at £0.

> 1.5 Operators should provide players with options to suspend their account temporarily or to close their account permanently. Any request for a temporary suspension of an account should be actioned by the operator in a timely manner and last for a minimum period of 6 months. During the period of suspension, the operator should not permit the player to take part in its prize draws, and should not send any marketing material (such as e-mail, text or promotional push notifications) to them. In addition, where technology is available, operators are also encouraged to provide a “pause” option for players where the player can set a shorter period (such as a week) in which they are unable to take part in its prize draws.

> 1.8 Operators should signpost players to available support for those experiencing harm (or those players that could be reasonably expected to experience harm). This should include relevant information on responsible play and available resources for dealing with such harm, as well as targeted support for individuals who identify themselves as experiencing harm. This includes, but is not limited to, directing players towards relevant support services (subject to the type of harm being suffered) such as Citizens Advice, Money Advice Trust, National Debtline, Samaritans, Mind, or any other suitable support service.

> 1.9 Operators should ensure that an appropriate time period elapses between a prize draw opening and concluding with a view to encouraging responsible play.

> 2.1 For every variant of prize draw product offered by an operator, players should be provided with a clear summary of how that prize draw will be conducted alongside the relevant rules and game mechanisms to ensure transparency and integrity of the draws themselves. This should include a statement that the prizes are to be awarded in accordance with the laws of chance.

> 2.2 Promoters of prize draws should ensure that prizes are awarded fairly in accordance with the rules and terms displayed to players. This should be by an independent person, or under the supervision of an independent person, unless winners are selected by a computer process that produces verifiably random and auditable results, or by a certified physical drawing machine. Entries to any variant of prize draw product offered by an operator (whether via the free entry route or the paid entry route) should have an equal chance of winning each available prize. Physical drawing devices which are certified should not require supervision. Operators should provide details of the mechanism used for draws on their website.

> 2.3 Where possible, prior to entering a draw, operators should provide players with clear and easily accessible information regarding the likelihood of winning a prize and how prizes will be allocated. Whilst the exact likelihood of winning a prize will depend on the number of tickets sold, information of that nature could include, but is not limited to, the maximum number of tickets available (where applicable) or data from previous comparable prize draws.

> 2.4 Operators should clearly and prominently provide players with details of any “free entry” option(s) for the prize draw before the point of purchase, and in line with the requirements of the Act. Free entry routes may be (a) ordinary post (i.e. ordinary first- or second-class post, without special arrangements for delivery), or (b) any other method of communication which is neither more expensive nor less convenient than entering the draw by a paid entry route. To the extent required by the Act, all free entry routes should be publicised, promoted and displayed in such a way as to be likely to come to the attention of all potential players. Operators should ensure that the terms and conditions relating to any draw are such that the arrangements allow sufficient time for players to use any free entry route, so that any such entry may be validly received and entered into the draw. To the extent that a free entry route is not effective - where it does not offer a genuine choice to a person as to whether to participate by paying or by sending a communication - it is very likely to signify that persons are, in practice, required to pay to participate in the arrangement.

> 2.5 Operators should promptly provide the winning player with the advertised prize for a draw, or a reasonable cash alternative. To ensure the integrity of each draw, operators should not provide a prize of lower value due to low ticket sales, change the date on which a draw ends, or cancel a draw due to low ticket sales.

In keeping with clause 2.1: prizes are awarded in accordance with the laws of chance, using the method in clause 12.

Contains public sector information licensed under the Open Government Licence v3.0.

## 16. Refunds and cancellation

Because the draw cannot be changed once the list is frozen, entries cannot be cancelled after the close. We do not
cancel a competition because of low ticket sales. If we ever have to cancel a competition before its close for
reasons outside our control, we refund every paid entry in full.

## 17. Complaints

Email {{CONTACT_EMAIL}} or write to us at the address in clause 1. We aim to reply within 14 days. If you are not
happy with our answer, tell us and we will review it at a more senior level.

## 18. Keeping a copy of these terms

<!-- CAP 8.28 (opening words): participants must be able to retain conditions or easily access them throughout the promotion. -->

These terms are linked from the foot of every page and can be printed or saved at any time. Competitions published
under a version of these terms keep that version's rules.

## 19. Privacy

We use your details to run the competitions, as explained in our [privacy notice](/privacy).

## 20. The law that applies

These terms are governed by the law of England and Wales. You can also bring proceedings in Scotland or Northern
Ireland if you live there.
