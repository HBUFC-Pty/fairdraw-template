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

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from '../icons';
import { prefersReducedMotion, reducedOnServer, subscribeReducedMotion } from './motion';

const INTERVAL = 6000;
const SWIPE = 40;

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
const pageVisible = () => document.visibilityState === 'visible';
const hiddenOnServer = () => false;

export type HeroSlide = { key: string; node: React.ReactNode };

/**
 * The home page hero: a carousel of prize slides (WCAG 2.2.2 compliant).
 *
 * - Autoplay (every 6 seconds) only when the brand has extras.motion, never with reduced motion. It holds while the
 *   pointer is over the carousel, while focus is inside it and while the tab is hidden, and stops for good after any
 *   use of a control. The pause button shows whenever autoplay is possible.
 * - Arrow buttons, dots, swipes (40px) and the left and right arrow keys (while focus is on the controls) move it.
 * - Inactive slides are hidden (visibility and inert), so they are out of the tab order and the accessibility tree.
 */
export function HeroCarousel({ slides, autoplay, label }: { slides: HeroSlide[]; autoplay: boolean; label: string }) {
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [hover, setHover] = useState(false);
  const [focusIn, setFocusIn] = useState(false);
  const reduce = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, reducedOnServer);
  const visible = useSyncExternalStore(subscribeVisibility, pageVisible, hiddenOnServer);
  const startX = useRef<number | null>(null);

  const canPlay = autoplay && n > 1 && !reduce;
  const running = canPlay && !stopped && !hover && !focusIn && visible;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % n), INTERVAL);
    return () => clearTimeout(t);
  }, [running, index, n]);

  const go = (i: number) => {
    setIndex(((i % n) + n) % n);
    setStopped(true);
  };

  return (
    <section
      className="hero-carousel"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
      onFocus={() => setFocusIn(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false);
      }}
    >
      <div
        className="hero-track"
        aria-live={running ? 'off' : 'polite'}
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null || n < 2) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) >= SWIPE) go(index + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
        {slides.map((s, i) => (
          <div
            key={s.key}
            className={`hero-slide${i === index ? ' is-active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${n}`}
            aria-hidden={i === index ? undefined : true}
            inert={i !== index}
          >
            {s.node}
          </div>
        ))}
      </div>
      {n > 1 ? (
        // Arrow keys only act while focus is on the controls: handled from a link inside the slide, the slide would
        // turn inert under the focused link and focus would drop to the page (WCAG 2.4.3).
        <div
          className="hero-controls"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') go(index - 1);
            else if (e.key === 'ArrowRight') go(index + 1);
          }}
        >
          <button type="button" className="icon-btn hero-arrow is-prev" onClick={() => go(index - 1)} aria-label="Previous slide"><ArrowLeft /></button>
          <div className="hero-dots" role="group" aria-label="Choose a slide">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className="bare hero-dot"
                aria-label={`Slide ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
          {canPlay ? (
            <button
              type="button"
              className="icon-btn hero-play"
              onClick={() => setStopped((v) => !v)}
              aria-label={stopped ? 'Play slides' : 'Pause slides'}
            >
              {stopped ? <Play /> : <Pause />}
            </button>
          ) : null}
          <button type="button" className="icon-btn hero-arrow is-next" onClick={() => go(index + 1)} aria-label="Next slide"><ArrowRight /></button>
        </div>
      ) : null}
    </section>
  );
}
