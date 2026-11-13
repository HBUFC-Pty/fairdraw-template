/*
 * The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may
 * not use this file except in compliance with the License. You may obtain a copy of the License at
 * https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections
 * 14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for
 * the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
 * Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either
 * express or implied. See the License for the specific language governing rights and limitations under the License.
 * The Original Code is FairDraw operator template.
 * The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are
 * Copyright (c) 2026 Harrison Jones. All Rights Reserved.
 */
/**
 * Fictional demo data for local development: two accounts, four competitions (draft, live, live with a question, and
 * one already drawn with a real drand round), random ticket sales and a postal entry. Every name is made up.
 * Refuses to run in production.
 *
 *   pnpm db:seed
 */
import { eq, sql } from 'drizzle-orm';
import { getDb, getPool } from '../src/lib/db';
import { competitions, users } from '../src/lib/db/schema';
import { hashPassword } from '../src/lib/auth/password';
import { createCompetition, publishCompetition } from '../src/lib/competitions/service';
import { addToBasket, applyPaymentEvent, placeOrder } from '../src/lib/checkout/service';
import { recordPostalEntry } from '../src/lib/competitions/postal';
import { closeCompetition, runDraw } from '../src/lib/draw/service';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data in production.');
  process.exit(1);
}

const db = getDb();
const countResult = (await db.execute(sql`SELECT count(*) AS n FROM competitions`)) as unknown as { rows: { n: string }[] };
const n = countResult.rows[0]?.n ?? '0';
if (Number(n) > 0) {
  console.info('Database already has competitions; not seeding again.');
  await getPool().end();
  process.exit(0);
}

const now = Date.now();
const H = 3600_000;
const D = 24 * H;
const FIRST = ['Alex', 'Sam', 'Jordan', 'Robin', 'Casey', 'Morgan', 'Riley', 'Jamie', 'Charlie', 'Frankie', 'Kit', 'Ash'];
const LAST = ['Example', 'Sample', 'Testwell', 'Placeholder', 'Demo', 'Fictional'];

async function user(email: string, password: string, over: Partial<typeof users.$inferInsert> = {}) {
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password), firstName: 'Demo', lastName: 'User', dateOfBirth: '1990-01-01', emailVerifiedAt: new Date(), ...over })
    .returning();
  return u!;
}

const owner = await user('owner@example.test', 'demo-owner-password', { role: 'owner', firstName: 'Olive', lastName: 'Owner' });
await user('player@example.test', 'demo-player-password', { firstName: 'Pat', lastName: 'Player' });
const players = [];
for (let i = 0; i < 24; i++) {
  players.push(await user(`player${i + 1}@example.test`, `demo-player-${i + 1}-password`, { firstName: FIRST[i % FIRST.length], lastName: LAST[i % LAST.length] }));
}
const actor = { id: owner.id, role: 'owner' };

/** Buy tickets as a player would (basket, order, signed payment), at time `at`. */
async function buy(competitionId: string, userId: string, quantity: number, at = new Date()) {
  await addToBasket(db, userId, { competitionId, quantity, chosenNumbers: null, answerIndex: null }, at);
  const o = await placeOrder(db, userId, { provider: 'test', reservationMinutes: 30, now: at });
  await applyPaymentEvent(db, 'test', { kind: 'payment_succeeded', eventId: `seed_${o.orderId}`, orderId: o.orderId, providerRef: `seed_${o.orderId}`, paymentRef: `seed_pay_${o.orderId}`, amountPence: o.totalPence }, at);
}

// 1. A live competition.
const lakes = await createCompetition(db, actor, {
  slug: 'lake-district-weekend',
  title: 'A weekend in the Lake District',
  summary: 'Two nights for two in a lakeside cottage, plus £300 spending money.',
  prizeDescription: 'Two nights for two people in a lakeside cottage (fictional demo prize), with £300 spending money. Dates by arrangement within 12 months.',
  prizeValuePence: 200_000,
  images: [{ url: '/images/demo-lakes.svg', alt: 'A lake surrounded by hills (demo image)' }],
  ticketPricePence: 100,
  maxTickets: 3000,
  perPersonCap: 100,
  winnerCount: 1,
  opensAt: new Date(now - 2 * D),
  closesAt: new Date(now + 5 * D),
  drawAt: new Date(now + 5 * D),
  skillQuestion: null,
});
await publishCompetition(db, actor, lakes.id);
for (const p of players.slice(0, 15)) await buy(lakes.id, p.id, 1 + Math.floor(Math.random() * 20));
await recordPostalEntry(db, actor, { competitionId: lakes.id, fullName: 'Pola Postal', email: 'postal@example.test', postalAddress: '1 Example Street, Exampletown, EX1 1EX', answerIndex: null, receivedAt: new Date(now - H) });

// 2. A live competition with a question.
const bike = await createCompetition(db, actor, {
  slug: 'electric-bike',
  title: 'Electric bike',
  summary: 'A commuter e-bike with a 60 mile range.',
  prizeDescription: 'A commuter electric bike (fictional demo prize). Cash alternative £1,400.',
  prizeValuePence: 140_000,
  images: [{ url: '/images/demo-bike.svg', alt: 'An electric bike (demo image)' }],
  ticketPricePence: 150,
  maxTickets: 1500,
  perPersonCap: 150,
  winnerCount: 1,
  opensAt: new Date(now - D),
  closesAt: new Date(now + 3 * D),
  drawAt: new Date(now + 3 * D + H),
  skillQuestion: { question: 'Which of these is the capital of Scotland?', options: ['Glasgow', 'Edinburgh', 'Aberdeen'], correctIndex: 1 },
});
await publishCompetition(db, actor, bike.id);

// 3. A finished competition, drawn with a real, already published drand round.
const closesAt = new Date(now - 2 * D);
const [drill] = await db
  .insert(competitions)
  .values({
    slug: 'cordless-drill-set',
    title: 'Cordless drill set',
    summary: 'An 18V drill driver with two batteries.',
    prizeDescription: 'An 18V cordless drill driver set with two batteries and a case (fictional demo prize). Cash alternative £180.',
    prizeValuePence: 18_000,
    images: [{ url: '/images/demo-drill.svg', alt: 'A cordless drill (demo image)' }],
    ticketPricePence: 100,
    maxTickets: 250,
    perPersonCap: 25,
    winnerCount: 1,
    opensAt: new Date(now - 9 * D),
    closesAt,
    drawAt: closesAt,
    status: 'live',
  })
  .returning();
const sold: number[] = [];
for (const p of players) {
  const k = 1 + Math.floor(Math.random() * 8);
  await buy(drill!.id, p.id, k, new Date(closesAt.getTime() - 3 * D));
  sold.push(k);
}
await closeCompetition(db, drill!.id, new Date(closesAt.getTime() + 1000));
try {
  const out = await runDraw(db, drill!.id);
  console.info(`demo draw made with real drand randomness: winning ticket ${out.record.winning_tickets.join(', ')}`);
} catch (e) {
  console.warn(`could not reach drand (${(e as Error).message}); the worker will make the demo draw when it can`);
}

// 4. A draft.
await createCompetition(db, actor, {
  slug: 'smart-watch',
  title: 'Smart watch (draft)',
  summary: 'Not published yet.',
  prizeDescription: 'A smart watch (fictional demo prize). This draft shows the publishing workflow.',
  prizeValuePence: 30_000,
  images: [{ url: '/images/demo-watch.svg', alt: 'A smart watch (demo image)' }],
  ticketPricePence: 50,
  maxTickets: 800,
  perPersonCap: 200,
  winnerCount: 1,
  opensAt: new Date(now + D),
  closesAt: new Date(now + 8 * D),
  drawAt: new Date(now + 8 * D),
  skillQuestion: null,
});

await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, owner.id));
console.info(`
Demo data ready (all fictional):
  owner@example.test / demo-owner-password   (set up two-factor authentication at first admin login)
  player@example.test / demo-player-password
`);
await getPool().end();
