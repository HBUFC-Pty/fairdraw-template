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

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from '../icons';

/**
 * A horizontal row that snaps to each item, scrolled by touch, trackpad, keyboard or (on wide screens) the arrow
 * buttons. Smooth scrolling is off for people who ask for reduced motion (stage.css).
 */
export function SnapRow({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  // The arrows only show when the row is wider than the screen.
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = track.current;
    if (!el || !('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(() => setOverflows(el.scrollWidth > el.clientWidth + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8 });
  };
  return (
    <div className={['snap', className].filter(Boolean).join(' ')}>
      {overflows ? (
        <div className="snap-arrows">
          <button type="button" className="icon-btn" onClick={() => move(-1)} aria-label={`Scroll ${label} back`}><ArrowLeft /></button>
          <button type="button" className="icon-btn" onClick={() => move(1)} aria-label={`Scroll ${label} on`}><ArrowRight /></button>
        </div>
      ) : null}
      <div className="snap-track" ref={track} tabIndex={0} role="region" aria-label={`${label}, scroll sideways`}>
        {children}
      </div>
    </div>
  );
}
