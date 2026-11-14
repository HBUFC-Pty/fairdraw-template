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
 * Configuration, read from environment variables and validated with Zod. Every variable is documented in
 * .env.example. Non-secret site details default to config/site.json; an environment variable overrides them. Read lazily so that `next build` works without a full production environment.
 */
import { z } from 'zod';
import { siteConfigAsEnv } from './site-config';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1).optional(),
  APP_SECRET: z.string().min(32, 'APP_SECRET must be at least 32 characters'),
  ENTRY_CODE_SECRET: z.string().min(32, 'ENTRY_CODE_SECRET must be at least 32 characters'),
  COOKIE_SECURE: bool.default(true),

  SITE_NAME: z.string().min(1).default('Example Competitions'),
  OPERATOR_LEGAL_NAME: z.string().min(1).default('[Operator Ltd]'),
  OPERATOR_COMPANY_NUMBER: z.string().default('[company number]'),
  OPERATOR_REGISTERED_ADDRESS: z.string().default('[registered office address]'),
  OPERATOR_ICO_NUMBER: z.string().default('[ICO registration number]'),
  CONTACT_EMAIL: z.email().default('hello@example.com'),
  PRIVACY_EMAIL: z.email().default('privacy@example.com'),
  POSTAL_ENTRY_ADDRESS: z.string().default('[postal entry address]'),
  PAYMENT_PROCESSOR_NAME: z.string().default('[payment processor]'),
  VOLUNTARY_CODE_SIGNATORY: bool.default(false),

  PAYMENT_PROVIDER: z.enum(['test', 'stripe']).default('test'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  TEST_PAYMENTS_ALLOWED_IN_PRODUCTION: bool.default(false),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: bool.default(false),
  SMTP_REQUIRE_TLS: bool.optional(),
  MAIL_FROM: z.string().default('Example Competitions <no-reply@example.com>'),

  DRAND_RELAYS: z.string().optional(),
  RESERVATION_MINUTES: z.coerce.number().int().min(30).max(120).default(30),
  IMAGE_HOSTS: z.string().default(''),
  TRUST_PROXY_HEADERS: bool.default(true),
  // Serverless hosts only (Vercel): the bearer secret for POST /api/cron/tick. Unset, the endpoint does not exist.
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters').optional(),
  // Public demo sites only (src/lib/demo.ts): a demo banner and hero, sign-up with made-up details and no email,
  // visitors deleted after 24 hours, and fresh demo competitions. Needs PAYMENT_PROVIDER=test. Never on a real site.
  DEMO_MODE: bool.default(false),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  // Treat empty values (KEY= in .env) as unset, so defaults apply.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''));
  const parsed = schema.safeParse({ ...siteConfigAsEnv(), ...raw });
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  if (parsed.data.DEMO_MODE && parsed.data.PAYMENT_PROVIDER !== 'test') throw new Error('DEMO_MODE needs PAYMENT_PROVIDER=test');
  if (parsed.data.NODE_ENV === 'production') {
    const local = ['localhost', '127.0.0.1'].includes(new URL(parsed.data.APP_URL).hostname);
    if (!parsed.data.APP_URL.startsWith('https://') && !local) throw new Error('APP_URL must use https in production');
    if (parsed.data.PAYMENT_PROVIDER === 'test' && !parsed.data.TEST_PAYMENTS_ALLOWED_IN_PRODUCTION) {
      throw new Error('PAYMENT_PROVIDER=test is refused in production');
    }
  }
  cached = parsed.data;
  return cached;
}

/** For tests only. */
export function resetEnvCache() {
  cached = undefined;
}
