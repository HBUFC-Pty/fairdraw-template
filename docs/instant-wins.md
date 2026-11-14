# Instant wins anyone can check

Most UK prize-competition sites run instant prizes, but almost none let players check them: the winning numbers are
fixed in private, prizes can be awarded by hand, and nothing shows whether a top prize was ever really available. The
template does it differently.

## How it works

1. **When you publish**, the server picks one ticket number for each instant prize, at random over the whole range,
   and publishes a commitment on the competition page: the SHA-256 of `fairdraw-instant-v1`, a secret salt and the
   `number:tier` lines in number order. The database refuses to publish if the commitment does not match the numbers
   it stored (`drizzle/0005_instant_wins.sql`).
2. **While it is open**, numbers are always given out at random (players cannot choose them, so nobody who knows the
   winning numbers can buy one). The moment a ticket with a winning number is entered with a correct answer, paid or
   free by post, the database awards the prize. No code path, and no admin, can skip, move or hand-award a prize, and a
   winning ticket cannot be refunded away.
3. **At the close**, `/draws/<slug>/instant-wins.json` publishes the salt and the full list, won and unwon. Anyone can
   recompute the commitment and see every prize: none can have been added, moved or held back.

A competition with instant prizes is an instant win prize draw, so credit cards are refused for it (DCMS code clause
1.3) and the main draw still happens at the advertised time like any other.

## Setting it up

In the admin competition form, list the instant prizes one per line, `how many | prize | value`, for example
`5 | £10 voucher | 10`, and choose how players reveal a win (scratch card, prize wheel or coin drop). Everything is
fixed once you publish.

**Legal note:** instant wins sit inside a prize competition with a free postal entry route and the same chance for
free entries. Take legal advice before you run them, and never run a separate paid game of chance: that is gaming
under the Gambling Act 2005 and needs a Gambling Commission licence.

## Checking a competition

```js
// In Node 18+, with the published file:
import { verifyInstantRecord } from './src/lib/competitions/instant';
verifyInstantRecord(JSON.parse(fs.readFileSync('instant-wins.json', 'utf8')));
```

Or by hand: join `fairdraw-instant-v1`, a newline, the salt, a newline, and the `ticket:tier` lines sorted by ticket
number (newline separated, no newline at the end), take the SHA-256, and compare it with `commit`.
