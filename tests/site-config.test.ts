import { describe, expect, it } from 'vitest';
import { siteConfig, siteConfigAsEnv, siteConfigSchema } from '../src/lib/site-config';

describe('site config', () => {
  it('the shipped config is valid and maps to env defaults', () => {
    expect(siteConfigAsEnv().SITE_NAME).toBe(siteConfig.siteName);
    expect(siteConfigAsEnv().PAYMENT_PROCESSOR_NAME).toBe(siteConfig.payments.processorName);
  });
  it('refuses a default per-person cap above 10%', () => {
    expect(siteConfigSchema.safeParse({ ...siteConfig, defaults: { ...siteConfig.defaults, perPersonCapPercent: 25 } }).success).toBe(false);
  });
  it('holds no secrets', () => {
    expect(JSON.stringify(siteConfig)).not.toMatch(/sk_(live|test)_|whsec_|BEGIN [A-Z ]*PRIVATE KEY|password/i);
  });
});
