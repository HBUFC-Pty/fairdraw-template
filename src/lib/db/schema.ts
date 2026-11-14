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
 * Database schema (Drizzle ORM, PostgreSQL 16). Migrations live in /drizzle and are generated with `pnpm db:generate`.
 *
 * Fairness rules are also enforced inside the database by triggers (drizzle/0001_fairness_guards.sql), so a bug or a
 * hasty change in application code cannot alter a committed ticket list, redo a draw or rewrite the audit log.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const ROLES = ['player', 'support', 'admin', 'owner'] as const;
export type Role = (typeof ROLES)[number];

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    dateOfBirth: date('date_of_birth', { mode: 'string' }),
    ageCheckMethod: text('age_check_method').notNull().default('self_declared'),
    ageCheckedAt: ts('age_checked_at'),
    emailVerifiedAt: ts('email_verified_at'),
    role: text('role', { enum: ROLES }).notNull().default('player'),
    totpSecretEnc: text('totp_secret_enc'),
    totpEnabledAt: ts('totp_enabled_at'),
    totpLastStep: bigint('totp_last_step', { mode: 'number' }),
    breakUntil: ts('break_until'),
    selfExcludedUntil: ts('self_excluded_until'),
    createdAt: ts('created_at').notNull().defaultNow(),
    lastLoginAt: ts('last_login_at'),
    deletedAt: ts('deleted_at'),
  },
  (t) => [uniqueIndex('users_email_key').on(t.email)],
);

export const sessions = pgTable(
  'sessions',
  {
    idHash: text('id_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: ts('created_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
    lastSeenAt: ts('last_seen_at').notNull().defaultNow(),
    mfaVerifiedAt: ts('mfa_verified_at'),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const authTokens = pgTable('auth_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose', { enum: ['verify_email', 'reset_password'] }).notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
});

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: ts('window_start').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export const SPEND_PERIODS = ['day', 'week', 'month'] as const;
export type SpendPeriod = (typeof SPEND_PERIODS)[number];

export const spendLimits = pgTable(
  'spend_limits',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    period: text('period', { enum: SPEND_PERIODS }).notNull(),
    limitPence: integer('limit_pence'),
    pendingLimitPence: integer('pending_limit_pence'),
    pendingRemoval: boolean('pending_removal').notNull().default(false),
    pendingEffectiveAt: ts('pending_effective_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.period] }),
    check('spend_limit_non_negative', sql`${t.limitPence} IS NULL OR ${t.limitPence} >= 0`),
  ],
);

/** Kept after account deletion so a self-exclusion still applies if the person signs up again. Holds no email. */
export const exclusions = pgTable('exclusions', {
  emailHash: text('email_hash').primaryKey(),
  until: ts('until').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const COMPETITION_STATUSES = ['draft', 'live', 'closed', 'drawn', 'cancelled'] as const;
export type CompetitionStatus = (typeof COMPETITION_STATUSES)[number];

export interface CompetitionImage {
  url: string;
  alt: string;
}
export interface SkillQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}
/** One tier of instant prizes: `count` prizes of this title and value, each fixed to a ticket number at publishing. */
export interface InstantPrizeTier {
  title: string;
  valuePence: number;
  count: number;
}
export const INSTANT_REVEALS = ['scratch', 'spin', 'coin'] as const;
export type InstantReveal = (typeof INSTANT_REVEALS)[number];

export const competitions = pgTable(
  'competitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    prizeDescription: text('prize_description').notNull(),
    prizeValuePence: integer('prize_value_pence').notNull(),
    images: jsonb('images').$type<CompetitionImage[]>().notNull().default([]),
    ticketPricePence: integer('ticket_price_pence').notNull(),
    maxTickets: integer('max_tickets').notNull(),
    perPersonCap: integer('per_person_cap').notNull(),
    winnerCount: integer('winner_count').notNull().default(1),
    opensAt: ts('opens_at').notNull(),
    closesAt: ts('closes_at').notNull(),
    drawAt: ts('draw_at').notNull(),
    skillQuestion: jsonb('skill_question').$type<SkillQuestion | null>(),
    // An instant win prize draw. DCMS code clause 1.3: no credit card payments at all for these. Fixed once live.
    isInstantWin: boolean('is_instant_win').notNull().default(false),
    // Instant prizes (src/lib/competitions/instant.ts). The winning numbers are chosen and committed (a SHA-256 of the
    // salted list) when the competition is published, and the salt and list are published at the close. Fixed once live.
    instantPrizes: jsonb('instant_prizes').$type<InstantPrizeTier[]>().notNull().default([]),
    instantReveal: text('instant_reveal', { enum: INSTANT_REVEALS }).notNull().default('scratch'),
    instantCommit: text('instant_commit'),
    instantSalt: text('instant_salt'),
    instantCommittedAt: ts('instant_committed_at'),
    status: text('status', { enum: COMPETITION_STATUSES }).notNull().default('draft'),
    closedAt: ts('closed_at'),
    drawnAt: ts('drawn_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('competitions_slug_key').on(t.slug),
    check('competition_price_positive', sql`${t.ticketPricePence} > 0`),
    check('competition_max_positive', sql`${t.maxTickets} > 0 AND ${t.maxTickets} <= 10000000`),
    check('competition_cap_range', sql`${t.perPersonCap} >= 1 AND ${t.perPersonCap} <= ${t.maxTickets}`),
    check('competition_winners_range', sql`${t.winnerCount} >= 1 AND ${t.winnerCount} <= ${t.maxTickets}`),
    check('competition_times_order', sql`${t.opensAt} < ${t.closesAt} AND ${t.closesAt} <= ${t.drawAt}`),
  ],
);

// pending: waiting for the player to pay. capturing: authorised, decided to capture, capture call in progress.
// cancelling: authorised but declined (for example the credit card rule), release in progress. declined: released.
export const ORDER_STATUSES = ['pending', 'capturing', 'cancelling', 'declined', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded'] as const;
export const FUNDING_TYPES = ['credit', 'debit', 'prepaid', 'unknown'] as const;
export type FundingType = (typeof FUNDING_TYPES)[number];
export const ORDER_DECISIONS = ['capture', 'decline_credit_cap', 'decline_instant_win_credit', 'decline_unavailable', 'decline_amount', 'decline_play_blocked', 'decline_spend_limit'] as const;
export type OrderDecision = (typeof ORDER_DECISIONS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    status: text('status', { enum: ORDER_STATUSES }).notNull().default('pending'),
    totalPence: integer('total_pence').notNull(),
    provider: text('provider').notNull(),
    providerRef: text('provider_ref'),
    paymentRef: text('payment_ref'),
    createdAt: ts('created_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
    paidAt: ts('paid_at'),
    // What the provider reported when the payment was authorised. Funding type and brand only: never card numbers.
    paymentFunding: text('payment_funding', { enum: FUNDING_TYPES }),
    paymentBrand: text('payment_brand'),
    authorisedPence: integer('authorised_pence'),
    capturePence: integer('capture_pence'),
    decision: text('decision', { enum: ORDER_DECISIONS }),
    decidedAt: ts('decided_at'),
    settledAt: ts('settled_at'),
    settleAttempts: integer('settle_attempts').notNull().default(0),
    settleError: text('settle_error'),
  },
  (t) => [index('orders_user_idx').on(t.userId, t.createdAt), index('orders_credit_idx').on(t.userId, t.paymentFunding, t.decidedAt), check('order_total_non_negative', sql`${t.totalPence} >= 0`)],
);

export const basketItems = pgTable(
  'basket_items',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    competitionId: uuid('competition_id')
      .notNull()
      .references(() => competitions.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    chosenNumbers: integer('chosen_numbers').array(),
    answerIndex: integer('answer_index'),
    addedAt: ts('added_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.competitionId] }), check('basket_quantity_positive', sql`${t.quantity} > 0`)],
);

export const postalEntries = pgTable(
  'postal_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    competitionId: uuid('competition_id')
      .notNull()
      .references(() => competitions.id),
    fullName: text('full_name'),
    email: text('email'),
    postalAddress: text('postal_address'),
    answerIndex: integer('answer_index'),
    receivedAt: ts('received_at').notNull(),
    status: text('status', { enum: ['accepted', 'rejected'] }).notNull(),
    rejectionReason: text('rejection_reason'),
    recordedBy: uuid('recorded_by').references(() => users.id),
    createdAt: ts('created_at').notNull().defaultNow(),
    anonymisedAt: ts('anonymised_at'),
  },
  (t) => [index('postal_competition_idx').on(t.competitionId)],
);

export const TICKET_STATUSES = ['reserved', 'active', 'expired', 'refunded', 'ineligible'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const tickets = pgTable(
  'tickets',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    competitionId: uuid('competition_id')
      .notNull()
      .references(() => competitions.id),
    number: integer('number').notNull(),
    userId: uuid('user_id').references(() => users.id),
    orderId: uuid('order_id').references(() => orders.id),
    postalEntryId: uuid('postal_entry_id').references(() => postalEntries.id),
    source: text('source', { enum: ['paid', 'postal'] }).notNull(),
    allocation: text('allocation', { enum: ['random', 'chosen'] }).notNull(),
    status: text('status', { enum: TICKET_STATUSES }).notNull(),
    answerCorrect: boolean('answer_correct'),
    reservedUntil: ts('reserved_until'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('tickets_live_number_key')
      .on(t.competitionId, t.number)
      .where(sql`${t.status} IN ('reserved', 'active')`),
    index('tickets_user_idx').on(t.userId, t.competitionId),
    index('tickets_order_idx').on(t.orderId),
    check('ticket_number_positive', sql`${t.number} >= 1`),
    check('ticket_owner', sql`(${t.source} = 'paid' AND ${t.orderId} IS NOT NULL) OR (${t.source} = 'postal' AND ${t.postalEntryId} IS NOT NULL)`),
  ],
);

/**
 * Instant-win ticket numbers, chosen at random when the competition is published and committed by its instant_commit
 * hash. The database awards a prize the moment a ticket with that number becomes active with a correct answer
 * (drizzle/0005), records which ticket won it, and never lets a number, tier or winner change.
 */
export const instantWins = pgTable(
  'instant_wins',
  {
    competitionId: uuid('competition_id')
      .notNull()
      .references(() => competitions.id),
    ticketNumber: integer('ticket_number').notNull(),
    tier: integer('tier').notNull(),
    title: text('title').notNull(),
    valuePence: integer('value_pence').notNull(),
    wonTicketId: bigint('won_ticket_id', { mode: 'number' }).references(() => tickets.id),
    wonAt: ts('won_at'),
  },
  (t) => [primaryKey({ columns: [t.competitionId, t.ticketNumber] }), index('instant_wins_ticket_idx').on(t.wonTicketId)],
);

/**
 * One row per competition. The commitment columns are written once at the close; the result columns are written once
 * when the committed drand round exists. Triggers refuse any other change and any delete.
 */
export const draws = pgTable('draws', {
  competitionId: uuid('competition_id')
    .primaryKey()
    .references(() => competitions.id),
  closedAtText: text('closed_at_text').notNull(),
  closeUnix: bigint('close_unix', { mode: 'number' }).notNull(),
  ticketsSold: integer('tickets_sold').notNull(),
  maxTickets: integer('max_tickets').notNull(),
  entriesHash: text('entries_hash').notNull(),
  drandChain: text('drand_chain').notNull(),
  drandRound: bigint('drand_round', { mode: 'number' }).notNull(),
  ticketList: integer('ticket_list').array().notNull(),
  committedAt: ts('committed_at').notNull().defaultNow(),
  scheduledDrawAt: ts('scheduled_draw_at').notNull(),
  randomness: text('randomness'),
  signature: text('signature'),
  winningTickets: integer('winning_tickets').array(),
  relays: text('relays').array(),
  drawnAt: ts('drawn_at'),
});

export const winners = pgTable(
  'winners',
  {
    competitionId: uuid('competition_id')
      .notNull()
      .references(() => competitions.id),
    position: integer('position').notNull(),
    ticketNumber: integer('ticket_number').notNull(),
    userId: uuid('user_id').references(() => users.id),
    postalEntryId: uuid('postal_entry_id').references(() => postalEntries.id),
    publicConsent: boolean('public_consent').notNull().default(false),
    displayName: text('display_name'),
    consentAt: ts('consent_at'),
  },
  (t) => [primaryKey({ columns: [t.competitionId, t.position] })],
);

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  amountPence: integer('amount_pence').notNull(),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['pending', 'succeeded', 'failed'] }).notNull().default('pending'),
  providerRef: text('provider_ref'),
  requestedBy: uuid('requested_by').references(() => users.id),
  error: text('error'),
  createdAt: ts('created_at').notNull().defaultNow(),
  processedAt: ts('processed_at'),
});

export const webhookEvents = pgTable(
  'webhook_events',
  {
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    receivedAt: ts('received_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.eventId] })],
);

/** Append-only, hash-chained. Triggers refuse UPDATE, DELETE and TRUNCATE. Holds user ids, never names. */
export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: text('at').notNull(),
  actorId: uuid('actor_id'),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  prevHash: text('prev_hash').notNull(),
  hash: text('hash').notNull(),
});

/** When each scheduled job last ran, so the health check can say whether the worker is alive. */
export const jobRuns = pgTable('job_runs', {
  job: text('job').primaryKey(),
  lastRunAt: ts('last_run_at').notNull(),
  lastOk: boolean('last_ok').notNull(),
  lastError: text('last_error'),
});
