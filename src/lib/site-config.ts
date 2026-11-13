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
