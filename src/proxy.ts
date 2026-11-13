/**
 * Runs before every page request. Sets a strict Content-Security-Policy with a fresh nonce per request, so only
 * scripts and styles Next.js renders with that nonce can run. Do not add 'unsafe-inline' or wildcard sources, and
 * do not remove this file: see AGENTS.md. Adding third-party analytics or embeds needs a CSP change and, for anything
 * that sets cookies or reads device storage, prior consent under PECR (docs/gdpr/cookie-statement.md).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { configuredRelays } from '@/lib/fairdraw/beacon';

function drandOrigins(): string {
  return configuredRelays().map((r) => new URL(r).origin).join(' ');
}

function imageHosts(): string {
  return (process.env.IMAGE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter((h) => /^https:\/\/[a-z0-9.-]+$/i.test(h))
    .join(' ');
}

export function buildCsp(nonce: string, dev: boolean): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: blob: ${imageHosts()}`.trim(),
    `font-src 'self'`,
    // The "verify this draw" page fetches the beacon straight from drand, so players do not have to trust this site.
    `connect-src 'self' ${drandOrigins()}${dev ? ' ws:' : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://checkout.stripe.com`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `manifest-src 'self'`,
    `worker-src 'self'`,
    ...(dev || !(process.env.APP_URL ?? '').startsWith('https://') ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api/|_next/static|_next/image|favicon.ico|draws/[^/]+/(?:record|commitment)\\.json|draws/[^/]+/tickets\\.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
