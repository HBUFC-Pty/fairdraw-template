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
 * One-off messages after a form is submitted ("Saved", "That password is wrong"), carried in a signed query
 * parameter. Signing stops anyone crafting a link that shows a misleading message on this site.
 */
import { hmacHex, safeEqual } from '../crypto';
import { env } from '../env';

export interface Flash {
  error?: string;
  notice?: string;
}

export function flashUrl(path: string, flash: Flash): string {
  const payload = Buffer.from(JSON.stringify(flash)).toString('base64url');
  const sig = hmacHex(env().APP_SECRET, `flash:${payload}`).slice(0, 32);
  return `${path}${path.includes('?') ? '&' : '?'}m=${payload}.${sig}`;
}

export function readFlash(searchParams: Record<string, string | string[] | undefined>): Flash {
  const m = searchParams.m;
  if (typeof m !== 'string' || m.length > 2000) return {};
  const [payload, sig] = m.split('.');
  if (!payload || !sig || !safeEqual(sig, hmacHex(env().APP_SECRET, `flash:${payload}`).slice(0, 32))) return {};
  try {
    const f = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Flash;
    return { error: typeof f.error === 'string' ? f.error : undefined, notice: typeof f.notice === 'string' ? f.notice : undefined };
  } catch {
    return {};
  }
}
