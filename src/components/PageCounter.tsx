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
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

let referrerSent = false;

function report(pathname: string) {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl === true || nav.doNotTrack === '1') return;
  const r = referrerSent ? undefined : document.referrer || undefined;
  referrerSent = true;
  fetch('/api/stats/view', {
    method: 'POST',
    body: JSON.stringify({ p: pathname, r }),
    headers: { 'Content-Type': 'text/plain' },
    credentials: 'omit',
    keepalive: true,
    cache: 'no-store',
  }).catch(() => undefined);
}

/**
 * The optional visit counter (src/lib/stats.ts). Rendered by the root layout only when the operator sets STATS_TOKEN.
 * Reports each page shown (the first load and every move within the site) to this site's own /api/stats/view: the
 * path, and on the first page only the address of the site the visitor came from. No cookies are sent or set, nothing
 * is stored in the browser, and nothing is sent when the browser asks not to be tracked.
 *
 * A page the browser prerenders (from the address bar or speculation rules) reports only once the visitor actually
 * opens it, and a page brought back by the back and forward buttons from the browser's cache is counted again.
 */
export function PageCounter() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    const d = document as Document & { prerendering?: boolean };
    // A prerendered page's request carries Sec-Purpose: prefetch and is not counted, so wait until it is shown.
    if (d.prerendering) document.addEventListener('prerenderingchange', () => report(pathname), { once: true });
    else report(pathname);
  }, [pathname]);
  useEffect(() => {
    const restored = (e: PageTransitionEvent) => {
      if (e.persisted && last.current) report(last.current);
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);
  return null;
}
