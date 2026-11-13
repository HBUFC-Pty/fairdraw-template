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
