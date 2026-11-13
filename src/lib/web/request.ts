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
