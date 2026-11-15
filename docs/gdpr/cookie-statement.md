# Cookie statement

> **Template, not legal advice.** Have this statement reviewed by a qualified solicitor or data protection adviser
> before you rely on it.

This statement explains the cookie this site uses and the options you have to control it. Our [privacy notice](/privacy)
explains how we collect, use and store your information more generally.

## What are cookies?

Cookies are small pieces of data, stored in text files, that are stored on your computer or other device when websites
are loaded in a browser. They are widely used to "remember" you and your preferences, either for a single visit
(through a "session cookie") or for multiple repeat visits (using a "persistent cookie"). They ensure a consistent and
efficient experience for visitors, and perform essential functions such as allowing users to register and remain logged
in. Cookies may be set by the site that you are visiting (known as "first party cookies"), or by third parties, such as
those who serve content or provide advertising or analytics services on the website ("third party cookies"). Both
websites and HTML emails may also contain other tracking technologies such as "web beacons" or "pixels." We do not use
any of these: our emails are plain text.

## The cookie we use

We use one first party cookie, and only when you log in:

| Name | Purpose | Lasts |
| --- | --- | --- |
| `__Host-fd_session` (or `fd_session` when the site runs without HTTPS in development) | Keeps you logged in. It holds a random id; the matching record is stored hashed on our server. | 30 days for players, 12 hours for staff, or until you log out |

It is strictly necessary to provide the account you asked for, so under the Privacy and Electronic Communications
Regulations (PECR) it does not need your consent, and we do not show a cookie banner. It is marked HttpOnly, Secure
and SameSite=Lax.

We use no analytics, advertising or social media cookies, pixels, fingerprinting or similar storage.

## Controlling cookies

Visitors may wish to restrict the use of cookies or completely prevent them from being set. Most browsers provide for
ways to control cookie behaviour such as the length of time they are stored: either through built-in functionality or
by using third party plugins. If you disable cookies, please be aware that you will not be able to log in to this
site. To find out more on how to manage and delete cookies, visit [aboutcookies.org](https://www.aboutcookies.org/).

## The optional visit counter (for operators)

Setting `STATS_TOKEN` turns on the template's own visit counter (`src/lib/stats.ts`). It sets no cookie and stores
nothing on the visitor's device. It counts page views per minute and unique visitors with a keyed hash of IP address
and browser that changes every day, keeps the rows for 48 hours, and does not count browsers that send Global Privacy
Control or Do Not Track. While it is on, the privacy notice adds a "Visit counts" section and the cookies page
mentions it, so keep this statement in step. Because the visitor hash is made from details the browser sends, take
advice on whether PECR rules on "similar technologies" apply to your use, and record it in your ROPA.

## If you add analytics (for operators)

Adding analytics, advertising pixels, chat widgets, embedded videos or anything else that stores or reads information
on a visitor's device and is not strictly necessary changes this:

1. You need the visitor's prior, opt-in consent before the cookie or script runs (PECR). Pre-ticked boxes and "by using
   this site you agree" do not count.
2. You need a consent banner where rejecting is as easy as accepting, with no non-essential cookies set before a
   choice, and a way to change the choice later.
3. Update the Content Security Policy in `src/proxy.ts` to allow the new script and connection hosts, and load the
   script with the request nonce only after consent.
4. Update this statement (name, provider, purpose, duration of each cookie), the privacy notice (new processor,
   purposes, lawful basis, international transfers) and your ROPA and DPIA.
5. Prefer cookieless, self-hosted, UK or EU based analytics where you can; check whether they still need consent.

Follow the ICO's guidance on cookies and similar technologies:
https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/

Last updated: [date].

## Credit and licence

The sections "What are cookies?" and "Controlling cookies" are adapted from the Automattic Cookie Policy in
Legalmattic, https://github.com/Automattic/legalmattic/blob/master/Cookie-Policy.md, by Automattic Inc., licensed under
the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0,
https://creativecommons.org/licenses/by-sa/4.0/). Changes: the last two sentences about web beacons were replaced by a
statement that this site uses none; in "Controlling cookies", a dash was replaced by a colon, "behavior" and "utilizing"
were changed to UK spelling and wording ("behaviour", "using"), the sentence about features not working was made
specific to logging in, links about advertising opt-outs were removed (this site has no advertising), and the
aboutcookies.org mention was made a link. The opening paragraph is new, adapted from the opening of the same policy.

Because it adapts CC BY-SA material, **this whole document is licensed under CC BY-SA 4.0**, including the parts the
template authors wrote, and any adaptation you make of it must stay under CC BY-SA 4.0 with this credit. This licence is
separate from the template's code licence (CPAL-1.0).
