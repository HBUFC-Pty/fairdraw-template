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
 * Runs before every page request. Sets a strict Content-Security-Policy with a fresh nonce per request, so only
 * scripts and styles Next.js renders with that nonce can run. Do not add 'unsafe-inline' or wildcard sources, and
 * do not remove this file: see AGENTS.md. Adding third-party analytics or embeds needs a CSP change and, for anything
 * that sets cookies or reads device storage, prior consent under PECR (docs/gdpr/cookie-statement.md).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_DRAND_RELAYS } from '@/lib/fairdraw/beacon';

function drandOrigins(): string {
  // The browser verifier only ever asks the public relays, whatever DRAND_RELAYS says (src/app/draws/[slug]).
  return DEFAULT_DRAND_RELAYS.map((r) => new URL(r).origin).join(' ');
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
