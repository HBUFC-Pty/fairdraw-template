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
import { motionAllowed } from './motion';

const DURATION = 1200;

/**
 * A real number that counts up from 0 the first time it scrolls into view (brands with extras.motion only). The real
 * value is in the server HTML twice: once for screen readers (sr-only) and once on screen, so without JavaScript, or
 * with reduced motion, the final number simply shows. Only the text of the hidden-from-assistive-technology copy moves.
 */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const text = value.toLocaleString('en-GB');
  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0 || !motionAllowed() || !('IntersectionObserver' in window)) return;
    let raf = 0;
    el.textContent = '0';
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / DURATION);
          const eased = 1 - (1 - p) ** 3;
          el.textContent = Math.round(value * eased).toLocaleString('en-GB');
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [value, text]);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={ref} className="num" aria-hidden="true">{text}</span>
    </>
  );
}
