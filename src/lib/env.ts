/**
 * Configuration, read from environment variables and validated with Zod. Every variable is documented in
 * .env.example. Read lazily so that `next build` works without a full production environment.
 */
import { z } from 'zod';

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
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  // Treat empty values (KEY= in .env) as unset, so defaults apply.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
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
