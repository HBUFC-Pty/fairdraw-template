# Cookie statement (template)

> **Template, not legal advice.** Have this statement reviewed by a qualified solicitor or data protection adviser
> before you rely on it.

## The cookie we use

We use one cookie, and only when you log in:

| Name | Purpose | Lasts |
| --- | --- | --- |
| `__Host-fd_session` (or `fd_session` when the site runs without HTTPS in development) | Keeps you logged in. It holds a random id; the matching record is stored hashed on our server. | 30 days for players, 12 hours for staff, or until you log out |

It is strictly necessary to provide the account you asked for, so under PECR it does not need your consent, and we do
not show a cookie banner. It is marked HttpOnly, Secure and SameSite=Lax.

We use no analytics, advertising or social media cookies, pixels, fingerprinting or similar storage.

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

Last updated: [date].
