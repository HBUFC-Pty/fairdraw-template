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
/** Showtime v2 stage 4: the prize images, the illustrations and the confetti on an instant win reveal. */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Confetti } from '../src/components/Confetti';
import { RevealGame } from '../src/components/RevealGame';
import {
  HeroRings,
  InstantPrizeArt,
  PostalEntryArt,
  PrizePlaceholder,
  ProofArt,
  StepCheck,
  StepEnter,
  StepPick,
} from '../src/components/illustrations';
import { DEMO_LONG_PRIZES, DEMO_QUICK_PRIZES } from '../src/lib/demo';

const IMAGES = join(__dirname, '..', 'public', 'images');
const svgs = readdirSync(IMAGES).filter((f) => f.endsWith('.svg'));
const motionCss = readFileSync(join(__dirname, '..', 'src', 'app', 'styles', 'motion.css'), 'utf8');

describe('prize images', () => {
  it('are SVGs with no text in them (the alt text and the page say what they are)', () => {
    expect(svgs.length).toBeGreaterThanOrEqual(15);
    for (const f of svgs) {
      const svg = readFileSync(join(IMAGES, f), 'utf8');
      expect(svg.trimStart().startsWith('<svg'), f).toBe(true);
      expect(svg, f).not.toMatch(/<text\b/);
      expect(svg, f).not.toMatch(/<(script|foreignObject|image)\b/);
      expect(svg, f).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
      expect(svg, f).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('demo prize images are square, so cards crop nothing important', () => {
    for (const f of svgs.filter((n) => n.startsWith('demo-'))) {
      const svg = readFileSync(join(IMAGES, f), 'utf8');
      expect(svg, f).toMatch(/viewBox="0 0 600 600"/);
    }
  });

  it('every demo prize points at an image that exists and says it is a demo image', () => {
    for (const p of [...DEMO_QUICK_PRIZES, ...DEMO_LONG_PRIZES]) {
      expect(existsSync(join(IMAGES, p.image.url.replace('/images/', ''))), p.image.url).toBe(true);
      expect(p.image.alt).toMatch(/\(demo image\)$/);
    }
  });
});

describe('illustrations', () => {
  const parts = [
    createElement(StepPick, { id: 's1' }),
    createElement(StepEnter, { id: 's2' }),
    createElement(StepCheck, { id: 's3' }),
    createElement(ProofArt, { id: 'p' }),
    createElement(PostalEntryArt, { id: 'post' }),
    createElement(PrizePlaceholder),
    createElement(InstantPrizeArt, { rank: 0, id: 'a' }),
    createElement(InstantPrizeArt, { rank: 1, id: 'b' }),
    createElement(InstantPrizeArt, { rank: 2, id: 'c' }),
    createElement(HeroRings),
  ];

  it('are decorative, take colours from tokens only and carry no inline styles', () => {
    for (const el of parts) {
      const html = renderToStaticMarkup(el);
      expect(html).toMatch(/aria-hidden="true"/);
      expect(html).not.toMatch(/#[0-9a-f]{3,8}\b(?!-)/i);
      expect(html).not.toMatch(/\b(rgb|hsl)a?\(/i);
      expect(html).not.toMatch(/style=/);
      expect(html).not.toMatch(/<text\b/);
    }
  });

  it('keep gradient ids unique when several are on one page', () => {
    const html = parts.map((el) => renderToStaticMarkup(el)).join('');
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of html.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref[1]);
  });
});

describe('confetti on an instant win', () => {
  it('is 28 decorative pieces', () => {
    const html = renderToStaticMarkup(createElement(Confetti));
    expect(html.match(/class="confetti-piece"/g)).toHaveLength(28);
    expect(html).toMatch(/^<span class="confetti" aria-hidden="true">/);
  });

  it('is not there before the reveal, for a win or a loss', () => {
    for (const prize of ['50 demo points', null]) {
      const html = renderToStaticMarkup(createElement(RevealGame, { style: 'scratch', ticket: 7, competition: 'Test', prize }));
      expect(html).not.toMatch(/confetti/);
    }
  });

  it('only shows on a finished win, with motion on and reduced motion not asked for', () => {
    expect(motionCss).toMatch(/\.confetti \{ display: none;/);
    const shows = [...motionCss.matchAll(/^(.*)\.confetti \{ display: block; \}/gm)].map((m) => m[1]);
    expect(shows).toEqual(["  [data-motion] .reveal.done.is-win "]);
    const block = motionCss.slice(0, motionCss.indexOf('.reveal.done.is-win .confetti { display: block; }'));
    const opened = block.lastIndexOf('@media (prefers-reduced-motion: no-preference) {');
    expect(opened).toBeGreaterThan(-1);
    expect(block.slice(opened)).not.toMatch(/^\}/m);
  });

  it('pieces rest invisible, so turning animation off can never leave them on screen', () => {
    expect(motionCss).toMatch(/\.confetti-piece \{[^}]*opacity: 0;/);
  });
});
