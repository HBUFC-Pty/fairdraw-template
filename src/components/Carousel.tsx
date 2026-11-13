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
