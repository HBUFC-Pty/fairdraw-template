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
 * Demo mode (DEMO_MODE=true) turns the template into a public showcase that looks after itself:
 *
 * - a banner on every page saying it is a demo in test mode, with the shared login;
 * - no sign-ups, password resets or email (a demo has no mail server, and strangers' addresses should not be kept);
 * - the shared player account (player@example.test, created by scripts/seed.ts) cannot be changed, so one visitor
 *   cannot lock the others out with a spend limit, a break, self-exclusion, 2FA or deletion;
 * - the scheduled work keeps two competitions open, each with entries from fictional players, so there is always
 *   something to enter and the results page keeps gaining real, checkable draws;
 * - it sets itself up: the first scheduled run creates the shared account and the fictional players (who cannot log
 *   in), so a demo database needs migrations only, never scripts/seed.ts and its public passwords.
 *
 * Never set DEMO_MODE on a real site: env() refuses it unless PAYMENT_PROVIDER=test.
 */
import { and, count, eq, gt, like, ne } from 'drizzle-orm';
import type { Db } from './db';
import { competitions, users } from './db/schema';
import { env } from './env';
import { createCompetition, publishCompetition } from './competitions/service';
import { hashPassword } from './auth/password';
import { addToBasket, placeOrder, processPaymentEvent } from './checkout/service';
import { TestProvider } from './payments/test-provider';
import type { AuditActor } from './audit';

/** Where the template lives, linked from the demo banner. */
export const TEMPLATE_REPO_URL = 'https://github.com/HBUFC-Pty/fairdraw-template';
export const DEMO_PLAYER_EMAIL = 'player@example.test';
/** Public on purpose: it is in scripts/seed.ts and shown in the demo banner. */
export const DEMO_PLAYER_PASSWORD = 'demo-player-password';
export const DEMO_ACCOUNT_LOCKED = 'This is the shared demo account, so this setting cannot be changed here. On a real site it works for every player.';
export const DEMO_NO_EMAIL = `This demo does not send email, so it cannot open new accounts or reset passwords. Log in as ${DEMO_PLAYER_EMAIL} with the password ${DEMO_PLAYER_PASSWORD}.`;

/** How many competitions the demo keeps open (closing more than 12 hours from now). */
export const DEMO_OPEN_TARGET = 2;

const H = 3600_000;
const D = 24 * H;
/** A demo competition gets a successor once it is this close to closing. */
export const DEMO_TOP_UP_LEAD_MS = 12 * H;
const DEMO_ACTOR: AuditActor = { id: null, role: 'system' };

export function demoMode(): boolean {
  return env().DEMO_MODE;
}

/** True for the shared demo login while demo mode is on. */
export function isSharedDemoAccount(email: string): boolean {
  return demoMode() && email.trim().toLowerCase() === DEMO_PLAYER_EMAIL;
}

interface DemoPrize {
  key: string;
  title: string;
  summary: string;
  prizeDescription: string;
  prizeValuePence: number;
  image: { url: string; alt: string };
  ticketPricePence: number;
  maxTickets: number;
  perPersonCap: number;
  skillQuestion: { question: string; options: string[]; correctIndex: number } | null;
}

/** Fictional prizes, used in turn. Every per-person cap is 10% of the maximum or less. */
export const DEMO_PRIZES: DemoPrize[] = [
  {
    key: 'lakes-weekend',
    title: 'A weekend in the Lake District',
    summary: 'Two nights for two in a lakeside cottage, plus £300 spending money.',
    prizeDescription: 'Two nights for two people in a lakeside cottage (fictional demo prize), with £300 spending money. Cash alternative £1,500.',
    prizeValuePence: 150_000,
    image: { url: '/images/demo-lakes.svg', alt: 'A lake surrounded by hills (demo image)' },
    ticketPricePence: 100,
    maxTickets: 2000,
    perPersonCap: 100,
    skillQuestion: null,
  },
  {
    key: 'electric-bike',
    title: 'Electric bike',
    summary: 'A commuter e-bike with a 60 mile range.',
    prizeDescription: 'A commuter electric bike (fictional demo prize). Cash alternative £1,400.',
    prizeValuePence: 140_000,
    image: { url: '/images/demo-bike.svg', alt: 'An electric bike (demo image)' },
    ticketPricePence: 150,
    maxTickets: 1500,
    perPersonCap: 150,
    skillQuestion: { question: 'Which of these is the capital of Scotland?', options: ['Glasgow', 'Edinburgh', 'Aberdeen'], correctIndex: 1 },
  },
  {
    key: 'drill-set',
    title: 'Cordless drill set',
    summary: 'An 18V drill driver with two batteries.',
    prizeDescription: 'An 18V cordless drill driver set with two batteries and a case (fictional demo prize). Cash alternative £180.',
    prizeValuePence: 18_000,
    image: { url: '/images/demo-drill.svg', alt: 'A cordless drill (demo image)' },
    ticketPricePence: 50,
    maxTickets: 400,
    perPersonCap: 40,
    skillQuestion: null,
  },
  {
    key: 'smart-watch',
    title: 'Smart watch',
    summary: 'A fitness smart watch with GPS.',
    prizeDescription: 'A fitness smart watch with GPS (fictional demo prize). Cash alternative £250.',
    prizeValuePence: 25_000,
    image: { url: '/images/demo-watch.svg', alt: 'A smart watch (demo image)' },
    ticketPricePence: 50,
    maxTickets: 600,
    perPersonCap: 60,
    skillQuestion: null,
  },
];

const FIRST = ['Alex', 'Sam', 'Jordan', 'Robin', 'Casey', 'Morgan', 'Riley', 'Jamie', 'Charlie', 'Frankie', 'Kit', 'Ash'];
const LAST = ['Example', 'Sample', 'Testwell', 'Placeholder', 'Demo', 'Fictional'];
export const DEMO_FICTIONAL_PLAYERS = 24;

/**
 * Create the shared demo account and the fictional players if they are missing. The fictional players have no
 * password, so nobody can log in as them. Returns the fictional players' ids.
 */
export async function ensureDemoPlayers(db: Db): Promise<string[]> {
  const [shared] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_PLAYER_EMAIL));
  if (!shared) {
    await db
      .insert(users)
      .values({ email: DEMO_PLAYER_EMAIL, passwordHash: await hashPassword(DEMO_PLAYER_PASSWORD), firstName: 'Pat', lastName: 'Player', dateOfBirth: '1990-01-01', emailVerifiedAt: new Date() })
      .onConflictDoNothing();
  }
  const fictional = () => db.select({ id: users.id }).from(users).where(and(like(users.email, 'player%@example.test'), ne(users.email, DEMO_PLAYER_EMAIL), eq(users.role, 'player')));
  const have = await fictional();
  if (have.length > 0) return have.map((u) => u.id);
  await db
    .insert(users)
    .values(
      Array.from({ length: DEMO_FICTIONAL_PLAYERS }, (_, i) => ({
        email: `player${i + 1}@example.test`,
        passwordHash: null,
        firstName: FIRST[i % FIRST.length]!,
        lastName: LAST[i % LAST.length]!,
        dateOfBirth: '1990-01-01',
        emailVerifiedAt: new Date(),
      })),
    )
    .onConflictDoNothing();
  return (await fictional()).map((u) => u.id);
}

function slugDate(d: Date) {
  return d.toISOString().slice(0, 13).replace(/[-T]/g, '');
}

/** Buy tickets as a player would (basket, order, signed test payment). */
async function buy(db: Db, provider: TestProvider, competitionId: string, userId: string, quantity: number, answerIndex: number | null, at: Date) {
  await addToBasket(db, userId, { competitionId, quantity, chosenNumbers: null, answerIndex }, at);
  const o = await placeOrder(db, userId, { provider: 'test', reservationMinutes: 30, now: at });
  await processPaymentEvent(db, provider, { kind: 'payment_authorised', eventId: `demo_${o.orderId}`, orderId: o.orderId, providerRef: `demo_${o.orderId}`, paymentRef: `demo_pay_${o.orderId}`, amountPence: o.totalPence, funding: 'debit', brand: 'testcard' }, at);
}

/**
 * Keep DEMO_OPEN_TARGET competitions open. Each new one opens now, closes and draws two to four days later (the very
 * first one in about an hour, so a new demo soon has a draw to check), and gets entries from up to twelve fictional
 * players. Returns how many were made. Does nothing unless demo mode is on. `random` is for tests.
 */
export async function topUpDemoCompetitions(db: Db, now = new Date(), random: () => number = Math.random): Promise<number> {
  if (!demoMode()) return 0;
  const players = (await ensureDemoPlayers(db)).map((id) => ({ id }));
  const [open] = await db.select({ n: count() }).from(competitions).where(and(eq(competitions.status, 'live'), gt(competitions.closesAt, new Date(now.getTime() + DEMO_TOP_UP_LEAD_MS))));
  const missing = DEMO_OPEN_TARGET - (open?.n ?? 0);
  if (missing <= 0) return 0;

  const [all] = await db.select({ n: count() }).from(competitions);
  const provider = new TestProvider(env().APP_SECRET, env().APP_URL);
  let made = 0;
  for (let i = 0; i < missing; i++) {
    const prize = DEMO_PRIZES[((all?.n ?? 0) + i) % DEMO_PRIZES.length]!;
    // Close on the hour, two to four days out, so the draw time reads cleanly. A brand new demo's first closes soon.
    const quick = (all?.n ?? 0) === 0 && i === 0;
    const closes = new Date(Math.ceil((now.getTime() + (quick ? H : (2 + i * 2) * D)) / H) * H);
    const c = await createCompetition(
      db,
      DEMO_ACTOR,
      {
        slug: `${prize.key}-${slugDate(closes)}`,
        title: prize.title,
        summary: prize.summary,
        prizeDescription: prize.prizeDescription,
        prizeValuePence: prize.prizeValuePence,
        images: [prize.image],
        ticketPricePence: prize.ticketPricePence,
        maxTickets: prize.maxTickets,
        perPersonCap: prize.perPersonCap,
        winnerCount: 1,
        opensAt: now,
        closesAt: closes,
        drawAt: closes,
        skillQuestion: prize.skillQuestion,
      },
      now,
    );
    await publishCompetition(db, DEMO_ACTOR, c.id, now);
    const shuffled = [...players].sort(() => random() - 0.5).slice(0, 12);
    for (const p of shuffled) {
      const qty = 1 + Math.floor(random() * Math.min(20, prize.perPersonCap));
      await buy(db, provider, c.id, p.id, qty, prize.skillQuestion ? prize.skillQuestion.correctIndex : null, now);
    }
    made++;
  }
  return made;
}
