import 'server-only';
import { headers } from 'next/headers';
import { env } from '../env';

export class OriginError extends Error {}

/**
 * Server Actions and state-changing routes must come from this site. Next.js already compares Origin with Host for
 * Server Actions; this adds a check against the configured APP_URL so a misconfigured proxy cannot widen it.
 */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get('origin');
  const expected = new URL(env().APP_URL).origin;
  if (!origin || origin !== expected) throw new OriginError('Request did not come from this site.');
}

/** The client IP for rate limiting. Caddy sets X-Forwarded-For; the last entry is the address Caddy saw. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  if (env().TRUST_PROXY_HEADERS) {
    const xff = h.get('x-forwarded-for');
    if (xff) return xff.split(',').pop()!.trim().slice(0, 64);
  }
  return h.get('x-real-ip')?.slice(0, 64) ?? 'unknown';
}

export async function cspNonce(): Promise<string | undefined> {
  return (await headers()).get('x-nonce') ?? undefined;
}

/** Read a form field as a trimmed string ('' when missing). */
export function field(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === 'string' ? v.trim() : '';
}
