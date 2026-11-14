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
 * Demo mode (DEMO_MODE=true) turns the template into a public showcase for operators who want to try the player
 * experience before building their own site. It looks after itself:
 *
 * - a banner on every page and a hero on the home page say it is a demo and nothing is real;
 * - anyone can sign up with made-up details (the form suggests some). The real sign-up runs, age check included, but
 *   the email step is skipped because a demo sends no email. Visitors' accounts are deleted after 24 hours;
 * - the scheduled work keeps a short competition that draws within a few hours, plus two longer ones, each with
 *   entries from fictional players who cannot log in. Every draw is a real draw, so finished ones can be checked.
 *
 * Never set DEMO_MODE on a real site: env() refuses it unless PAYMENT_PROVIDER=test.
 */
import { randomInt } from 'node:crypto';
import { and, count, eq, gt, isNotNull, isNull, like, lt, min } from 'drizzle-orm';
import type { Db } from './db';
import { competitions, users } from './db/schema';
import { env } from './env';
import { createCompetition, publishCompetition } from './competitions/service';
import { addToBasket, placeOrder, processPaymentEvent } from './checkout/service';
import { deleteAccount } from './account/service';
import { TestProvider } from './payments/test-provider';
import type { AuditActor } from './audit';

/** Where the template lives, linked from the demo banner and hero. */
export const TEMPLATE_REPO_URL = 'https://github.com/HBUFC-Pty/fairdraw-template';
export const DEMO_NO_EMAIL = 'This demo does not send email, so password resets are off. Sign up again with new made-up details: it only takes a moment.';
export const DEMO_WELCOME = 'You are in. Enter any competition and pay with the test card: nothing is charged. This account is deleted after 24 hours.';
export const DEMO_SIGNUP_NOTE = 'This is a demo, so please do not use your real details. We have made some up for you: keep them or change them, and choose any password. Nothing is emailed, and the account is deleted after 24 hours.';

const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;
/** Visitors' accounts are deleted this long after sign-up. */
export const DEMO_VISITOR_MS = 24 * H;
/** There is always a competition that closes within this. */
export const DEMO_QUICK_WINDOW_MS = 6 * H;
/** Longer competitions kept open, counting only those closing more than DEMO_LONG_LEAD_MS from now. */
export const DEMO_LONG_TARGET = 2;
export const DEMO_LONG_LEAD_MS = 12 * H;
export const DEMO_FICTIONAL_PLAYERS = 24;
const DEMO_ACTOR: AuditActor = { id: null, role: 'system' };

export function demoMode(): boolean {
  return env().DEMO_MODE;
}

const FIRST = ['Alex', 'Sam', 'Jordan', 'Robin', 'Casey', 'Morgan', 'Riley', 'Jamie', 'Charlie', 'Frankie', 'Kit', 'Ash'];
const LAST = ['Example', 'Sample', 'Testwell', 'Placeholder', 'Demo', 'Fictional'];

/** Made-up details to suggest on the demo sign-up form. */
export function demoSignUpDefaults(pick: (n: number) => number = (n) => randomInt(n)) {
  const first = FIRST[pick(FIRST.length)]!;
  const last = LAST[pick(LAST.length)]!;
  const tag = String(pick(1_000_000)).padStart(6, '0');
  return { firstName: first, lastName: last, email: `${first.toLowerCase()}.${tag}@example.test`, dateOfBirth: '1990-01-01' };
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

/** Short competitions (a few hours). Fictional prizes; every per-person cap is 10% of the maximum or less. */
export const DEMO_QUICK_PRIZES: DemoPrize[] = [
  {
    key: 'drill-set',
    title: 'Cordless drill set',
    summary: 'An 18V drill driver with two batteries.',
    prizeDescription: 'An 18V cordless drill driver set with two batteries and a case (fictional demo prize). Cash alternative £180.',
    prizeValuePence: 18_000,
    image: { url: '/images/demo-drill.svg', alt: 'A cordless drill (demo image)' },
    ticketPricePence: 50,
    maxTickets: 300,
    perPersonCap: 30,
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
    maxTickets: 400,
    perPersonCap: 40,
    skillQuestion: null,
  },
  {
    key: 'games-console',
    title: 'Games console bundle',
    summary: 'A games console with a second controller.',
    prizeDescription: 'A games console with a second controller and two games (fictional demo prize). Cash alternative £400.',
    prizeValuePence: 40_000,
    image: { url: '/images/demo-console.svg', alt: 'A games console and controller (demo image)' },
    ticketPricePence: 75,
    maxTickets: 500,
    perPersonCap: 50,
    skillQuestion: null,
  },
  {
    key: 'picnic-hamper',
    title: 'Picnic hamper',
    summary: 'A wicker hamper packed for four.',
    prizeDescription: 'A wicker picnic hamper with plates, glasses and a blanket for four (fictional demo prize). Cash alternative £120.',
    prizeValuePence: 12_000,
    image: { url: '/images/demo-hamper.svg', alt: 'A picnic hamper (demo image)' },
    ticketPricePence: 25,
    maxTickets: 400,
    perPersonCap: 40,
    skillQuestion: null,
  },
  {
    key: 'cash-250',
    title: '£250 cash',
    summary: '£250, paid by bank transfer.',
    prizeDescription: '£250 paid by bank transfer to the winner (fictional demo prize: nothing is paid in this demo).',
    prizeValuePence: 25_000,
    image: { url: '/images/demo-cash.svg', alt: 'A stack of banknotes (demo image)' },
    ticketPricePence: 50,
    maxTickets: 600,
    perPersonCap: 60,
    skillQuestion: null,
  },
];

/** Longer competitions (two to four days). */
export const DEMO_LONG_PRIZES: DemoPrize[] = [
  {
    key: 'lakes-weekend',
    title: 'A weekend in the Lake District',
    summary: 'Two nights for two in a lakeside cottage, plus £300 spending money.',
    prizeDescription: 'Two nights for two people in a lakeside cottage (fictional demo prize), with £300 spending money. Cash alternative £1,500.',
    prizeValuePence: 150_000,
    image: { url: '/images/demo-lakes.svg', alt: 'A lake below hills with a small cottage (demo image)' },
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
    key: 'camera-kit',
    title: 'Mirrorless camera kit',
    summary: 'A mirrorless camera with two lenses.',
    prizeDescription: 'A mirrorless camera with a standard zoom and a portrait lens (fictional demo prize). Cash alternative £900.',
    prizeValuePence: 90_000,
    image: { url: '/images/demo-camera.svg', alt: 'A camera (demo image)' },
    ticketPricePence: 100,
    maxTickets: 1200,
    perPersonCap: 120,
    skillQuestion: null,
  },
];

const fictionalWhere = and(like(users.email, 'player%@example.test'), isNull(users.passwordHash), isNull(users.deletedAt), eq(users.role, 'player'));
const visitorWhere = and(eq(users.role, 'player'), isNotNull(users.passwordHash), isNull(users.deletedAt));

/** Create the fictional players if they are missing. They have no password, so nobody can log in as them. */
export async function ensureFictionalPlayers(db: Db): Promise<string[]> {
  const have = await db.select({ id: users.id }).from(users).where(fictionalWhere);
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
  return (await db.select({ id: users.id }).from(users).where(fictionalWhere)).map((u) => u.id);
}

/** Delete visitors' accounts 24 hours after sign-up, through the normal account deletion. Returns how many. */
export async function removeOldVisitors(db: Db, now = new Date()): Promise<number> {
  const old = await db.select({ id: users.id }).from(users).where(and(visitorWhere, lt(users.createdAt, new Date(now.getTime() - DEMO_VISITOR_MS)))).limit(50);
  for (const u of old) await deleteAccount(db, u.id, now);
  return old.length;
}

function slugDate(d: Date) {
  return d.toISOString().slice(0, 16).replace(/[-T:]/g, '');
}

function ceilTo(t: number, step: number) {
  return new Date(Math.ceil(t / step) * step);
}

/** Buy tickets as a player would (basket, order, signed test payment). */
async function buy(db: Db, provider: TestProvider, competitionId: string, userId: string, quantity: number, answerIndex: number | null, at: Date) {
  await addToBasket(db, userId, { competitionId, quantity, chosenNumbers: null, answerIndex }, at);
  const o = await placeOrder(db, userId, { provider: 'test', reservationMinutes: 30, now: at });
  await processPaymentEvent(db, provider, { kind: 'payment_authorised', eventId: `demo_${o.orderId}`, orderId: o.orderId, providerRef: `demo_${o.orderId}`, paymentRef: `demo_pay_${o.orderId}`, amountPence: o.totalPence, funding: 'debit', brand: 'testcard' }, at);
}

async function openDemoCompetition(db: Db, prize: DemoPrize, closes: Date, now: Date, players: string[], random: () => number) {
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
  const provider = new TestProvider(env().APP_SECRET, env().APP_URL);
  const entrants = [...players].sort(() => random() - 0.5).slice(0, 6 + Math.floor(random() * 5));
  for (const id of entrants) {
    const qty = 1 + Math.floor(random() * Math.min(10, prize.perPersonCap));
    await buy(db, provider, c.id, id, qty, prize.skillQuestion ? prize.skillQuestion.correctIndex : null, now);
  }
}

/**
 * Keep the demo stocked: a competition closing within DEMO_QUICK_WINDOW_MS (a new one closes about three hours out,
 * the very first about half an hour out so a new demo soon has a draw to check), and DEMO_LONG_TARGET longer ones.
 * Returns how many competitions were opened. Does nothing unless demo mode is on. `random` is for tests.
 */
export async function topUpDemoCompetitions(db: Db, now = new Date(), random: () => number = Math.random): Promise<number> {
  if (!demoMode()) return 0;
  const players = await ensureFictionalPlayers(db);
  const t = now.getTime();
  const [all] = await db.select({ n: count() }).from(competitions);
  const total = all?.n ?? 0;
  let made = 0;

  const [soon] = await db.select({ n: count() }).from(competitions).where(and(eq(competitions.status, 'live'), gt(competitions.closesAt, now), lt(competitions.closesAt, new Date(t + DEMO_QUICK_WINDOW_MS + 1))));
  if ((soon?.n ?? 0) === 0) {
    const closes = total === 0 ? ceilTo(t + 30 * MIN, 15 * MIN) : ceilTo(t + 3 * H, H);
    await openDemoCompetition(db, DEMO_QUICK_PRIZES[total % DEMO_QUICK_PRIZES.length]!, closes, now, players, random);
    made++;
  }

  const [later] = await db.select({ n: count() }).from(competitions).where(and(eq(competitions.status, 'live'), gt(competitions.closesAt, new Date(t + DEMO_LONG_LEAD_MS))));
  for (let i = later?.n ?? 0; i < DEMO_LONG_TARGET; i++) {
    const closes = ceilTo(t + (2 + 2 * (i - (later?.n ?? 0))) * D, H);
    await openDemoCompetition(db, DEMO_LONG_PRIZES[(total + made) % DEMO_LONG_PRIZES.length]!, closes, now, players, random);
    made++;
  }
  return made;
}

/** Everything the scheduled work does for a demo. A no-op unless demo mode is on. */
export async function demoUpkeep(db: Db, now = new Date()) {
  if (!demoMode()) return { opened: 0, removed: 0 };
  const removed = await removeOldVisitors(db, now);
  const opened = await topUpDemoCompetitions(db, now);
  return { opened, removed };
}

/** When demoUpkeep next has something to do (for nextDueAt in src/lib/worker.ts). Null unless demo mode is on. */
export async function demoNextDueAt(db: Db, now = new Date()): Promise<Date | null> {
  if (!demoMode()) return null;
  const t = now.getTime();
  const live = await db.select({ t: competitions.closesAt }).from(competitions).where(and(eq(competitions.status, 'live'), gt(competitions.closesAt, now)));
  const closes = live.map((r) => r.t.getTime());
  if (!closes.some((c) => c <= t + DEMO_QUICK_WINDOW_MS)) return now;
  const later = closes.filter((c) => c > t + DEMO_LONG_LEAD_MS);
  if (later.length < DEMO_LONG_TARGET) return now;
  const times = [Math.min(...later) - DEMO_LONG_LEAD_MS];
  const [oldest] = await db.select({ t: min(users.createdAt) }).from(users).where(visitorWhere);
  if (oldest?.t instanceof Date) times.push(oldest.t.getTime() + DEMO_VISITOR_MS);
  return new Date(Math.min(...times));
}
