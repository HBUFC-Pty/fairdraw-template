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
 * - every amount shows as points (src/lib/money.ts) and every prize is demo points with no value, so nothing looks
 *   like real money or a prize anyone could claim;
 * - the scheduled work keeps a short competition that draws within a few hours, plus three longer ones, each with
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
export const DEMO_WELCOME = 'You are in. Enter any competition and pay with the test card: nothing is charged, and prices and prizes are points with no value. This account is deleted after 24 hours.';
export const DEMO_SIGNUP_NOTE = 'This is a demo, so please do not use your real details. We have made some up for you: keep them or change them, and choose any password. Nothing is emailed, and the account is deleted after 24 hours.';

const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;
/** Visitors' accounts are deleted this long after sign-up. */
export const DEMO_VISITOR_MS = 24 * H;
/** There is always a competition that closes within this. */
export const DEMO_QUICK_WINDOW_MS = 6 * H;
/** Longer competitions kept open, counting only those closing more than DEMO_LONG_LEAD_MS from now. */
export const DEMO_LONG_TARGET = 3;
export const DEMO_LONG_LEAD_MS = 12 * H;
export const DEMO_FICTIONAL_PLAYERS = 24;
/** At most this many demo competitions open in any 24 hours, however often visitors sell them out. */
export const DEMO_MAX_OPENED_PER_DAY = 16;
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
  instantPrizes: { title: string; valuePence: number; count: number }[];
  instantReveal: 'scratch' | 'spin' | 'coin';
}

/**
 * A prize of demo points. On a demo site every amount shows as points, one per penny (src/lib/money.ts), so a value
 * of 1000 shows as "1,000 points". Points have no value, so there is never anything for a winner to claim.
 */
function pointsPrize(
  points: number,
  image: string,
  alt: string,
  price: number,
  maxTickets: number,
  question: DemoPrize['skillQuestion'] = null,
  instant: { reveal: DemoPrize['instantReveal']; prizes: DemoPrize['instantPrizes'] } = { reveal: 'scratch', prizes: [] },
): DemoPrize {
  const shown = new Intl.NumberFormat('en-GB').format(points);
  return {
    key: `points-${points}`,
    title: `${shown} demo points`,
    summary: 'Demo points with no value.',
    prizeDescription: `${shown} demo points. The points are made up for this demo: they have no value and cannot be claimed, exchanged or withdrawn. Everything else runs exactly as it would on a real site: the close, the commitment, the draw and the record anyone can check.`,
    prizeValuePence: points,
    image: { url: image, alt },
    ticketPricePence: price,
    maxTickets,
    perPersonCap: Math.floor(maxTickets / 10),
    skillQuestion: question,
    instantPrizes: instant.prizes,
    instantReveal: instant.reveal,
  };
}

const instantPoints = (big: number, bigCount: number, small: number, smallCount: number) => [
  { title: `${big} demo points`, valuePence: big, count: bigCount },
  { title: `${small} demo points`, valuePence: small, count: smallCount },
];

/** Short competitions (a few hours). Every per-person cap is 10% of the maximum. */
export const DEMO_QUICK_PRIZES: DemoPrize[] = [
  pointsPrize(500, '/images/demo-points-star.svg', 'A star: 500 demo points (demo image)', 5, 200, null, { reveal: 'scratch', prizes: instantPoints(50, 3, 10, 10) }),
  pointsPrize(1000, '/images/demo-points-medal.svg', 'A medal: 1,000 demo points (demo image)', 10, 200, null, { reveal: 'spin', prizes: instantPoints(100, 3, 20, 10) }),
  pointsPrize(2500, '/images/demo-points-gem.svg', 'A gem: 2,500 demo points (demo image)', 25, 200, null, { reveal: 'coin', prizes: instantPoints(250, 3, 50, 10) }),
];

/** Longer competitions (two to six days), one with a question to show how that works. */
export const DEMO_LONG_PRIZES: DemoPrize[] = [
  pointsPrize(10000, '/images/demo-points-trophy.svg', 'A trophy: 10,000 demo points (demo image)', 50, 400, {
    question: 'Which of these is the capital of Scotland?',
    options: ['Glasgow', 'Edinburgh', 'Aberdeen'],
    correctIndex: 1,
  }),
  pointsPrize(25000, '/images/demo-points-crown.svg', 'A crown: 25,000 demo points (demo image)', 100, 500, null, { reveal: 'spin', prizes: instantPoints(1000, 5, 200, 20) }),
  pointsPrize(5000, '/images/demo-points-gem.svg', 'A gem: 5,000 demo points (demo image)', 25, 300, null, { reveal: 'coin', prizes: instantPoints(500, 3, 100, 12) }),
];

/** The fictional demo players (no password, so nobody can log in as them). Also used by the visit counter. */
export const fictionalWhere = and(like(users.email, 'player%@example.test'), isNull(users.passwordHash), isNull(users.deletedAt), eq(users.role, 'player'));
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
      instantPrizes: prize.instantPrizes,
      instantReveal: prize.instantReveal,
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
  const [recent] = await db.select({ n: count() }).from(competitions).where(gt(competitions.createdAt, new Date(t - D)));
  if ((recent?.n ?? 0) >= DEMO_MAX_OPENED_PER_DAY) return 0;
  let made = 0;

  const [soon] = await db.select({ n: count() }).from(competitions).where(and(eq(competitions.status, 'live'), gt(competitions.closesAt, now), lt(competitions.closesAt, new Date(t + DEMO_QUICK_WINDOW_MS + 1))));
  if ((soon?.n ?? 0) === 0) {
    const closes = total === 0 ? ceilTo(t + 30 * MIN, 15 * MIN) : ceilTo(t + 3 * H, H);
    await openDemoCompetition(db, DEMO_QUICK_PRIZES[total % DEMO_QUICK_PRIZES.length]!, closes, now, players, random);
    made++;
  }

  const [later] = await db.select({ n: count() }).from(competitions).where(and(eq(competitions.status, 'live'), gt(competitions.closesAt, new Date(t + DEMO_LONG_LEAD_MS))));
  // Prefer a prize that is not already live, so the home page never shows the same prize twice.
  const liveTitles = new Set((await db.select({ title: competitions.title }).from(competitions).where(eq(competitions.status, 'live'))).map((r) => r.title));
  for (let i = later?.n ?? 0; i < DEMO_LONG_TARGET; i++) {
    const closes = ceilTo(t + (2 + 2 * (i - (later?.n ?? 0))) * D, H);
    const start = (total + made) % DEMO_LONG_PRIZES.length;
    const order = DEMO_LONG_PRIZES.map((_, k) => DEMO_LONG_PRIZES[(start + k) % DEMO_LONG_PRIZES.length]!);
    const prize = order.find((p) => !liveTitles.has(p.title)) ?? order[0]!;
    liveTitles.add(prize.title);
    await openDemoCompetition(db, prize, closes, now, players, random);
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
