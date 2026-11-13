/**
 * Non-secret site settings from config/site.json (filled in during the setup interview in AGENTS.md).
 * Environment variables override them (src/lib/env.ts). Secrets never belong here.
 */
import { z } from 'zod';
import raw from '../../config/site.json';

export const siteConfigSchema = z.object({
  siteName: z.string().min(1),
  domain: z.string(),
  operator: z.object({ legalName: z.string(), companyNumber: z.string(), registeredAddress: z.string(), icoNumber: z.string() }),
  contact: z.object({ supportEmail: z.email(), privacyEmail: z.email(), postalEntryAddress: z.string() }),
  payments: z.object({ provider: z.enum(['test', 'stripe', 'cashflows', 'dna-payments', 'acquired', 'trust-payments']), mode: z.enum(['test', 'live']), processorName: z.string() }),
  email: z.object({ provider: z.string(), from: z.string() }),
  hosting: z.object({ host: z.string(), region: z.string(), serverIp: z.string(), sshHostAlias: z.string() }),
  defaults: z.object({
    // FairDraw gives full marks for caps of 10% of the maximum or less; this template never suggests more.
    perPersonCapPercent: z.number().min(1).max(10),
    suggestedMonthlyLimitPounds: z.number().min(0).nullable(),
  }),
  voluntaryCodeSignatory: z.boolean(),
  legalReviewed: z.record(z.string(), z.boolean()),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;

export const siteConfig: SiteConfig = siteConfigSchema.parse(raw);

/** The settings expressed as environment variable defaults. */
export function siteConfigAsEnv(c: SiteConfig = siteConfig): Record<string, string> {
  return {
    SITE_NAME: c.siteName,
    OPERATOR_LEGAL_NAME: c.operator.legalName,
    OPERATOR_COMPANY_NUMBER: c.operator.companyNumber,
    OPERATOR_REGISTERED_ADDRESS: c.operator.registeredAddress,
    OPERATOR_ICO_NUMBER: c.operator.icoNumber,
    CONTACT_EMAIL: c.contact.supportEmail,
    PRIVACY_EMAIL: c.contact.privacyEmail,
    POSTAL_ENTRY_ADDRESS: c.contact.postalEntryAddress,
    PAYMENT_PROCESSOR_NAME: c.payments.processorName,
    MAIL_FROM: c.email.from,
    VOLUNTARY_CODE_SIGNATORY: String(c.voluntaryCodeSignatory),
  };
}
