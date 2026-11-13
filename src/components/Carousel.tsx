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

import { useRef } from 'react';

/**
 * A carousel the visitor moves with buttons, swipes or the keyboard. It never moves on its own (no autoplay), and
 * smooth scrolling is switched off for people who ask for reduced motion (globals.css).
 */
export function Carousel({ label, children }: { label: string; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8 });
  };
  return (
    <section className="carousel" aria-roledescription="carousel" aria-label={label}>
      <div className="carousel-controls">
        <button type="button" className="secondary" onClick={() => move(-1)} aria-label="Previous competitions">Previous</button>
        <button type="button" className="secondary" onClick={() => move(1)} aria-label="Next competitions">Next</button>
      </div>
      <div className="carousel-track" ref={track} tabIndex={0}>
        {children}
      </div>
    </section>
  );
}
