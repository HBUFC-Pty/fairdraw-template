import { Secret, TOTP } from 'otpauth';

const PERIOD = 30;

export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

function totp(secretBase32: string, label: string, issuer: string) {
  return new TOTP({ issuer, label, algorithm: 'SHA1', digits: 6, period: PERIOD, secret: Secret.fromBase32(secretBase32) });
}

export function totpUri(secretBase32: string, label: string, issuer: string): string {
  return totp(secretBase32, label, issuer).toString();
}

export function totpCode(secretBase32: string, now: Date): string {
  return totp(secretBase32, 'x', 'x').generate({ timestamp: now.getTime() });
}

/**
 * Check a 6-digit code, allowing one step of clock drift either way. Returns the time step that matched so the caller
 * can refuse a replay of the same (or an earlier) code; null when the code is wrong.
 */
export function checkTotp(secretBase32: string, code: string, now: Date, lastUsedStep: number | null): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const delta = totp(secretBase32, 'x', 'x').validate({ token: code, timestamp: now.getTime(), window: 1 });
  if (delta === null) return null;
  const step = Math.floor(now.getTime() / 1000 / PERIOD) + delta;
  if (lastUsedStep !== null && step <= lastUsedStep) return null;
  return step;
}
