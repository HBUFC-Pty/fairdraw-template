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
 * Accessibility guardrail: every text and background pair in both palettes must meet WCAG 2.2 AA. Normal text needs
 * 4.5:1; form field outlines and focus indicators need 3:1 (WCAG 1.4.11). A brand that fails is refused.
 */
import type { Brand, Palette } from './schema';
import { contrastRatio, mixHex, nearestPassing } from './contrast';

type Key = keyof Palette;
export const CONTRAST_PAIRS: { fg: Key; bg: Key; min: number; what: string }[] = [
  { fg: 'text', bg: 'bg', min: 4.5, what: 'body text on the page' },
  { fg: 'text', bg: 'surface', min: 4.5, what: 'text on cards' },
  { fg: 'muted', bg: 'bg', min: 4.5, what: 'secondary text on the page' },
  { fg: 'muted', bg: 'surface', min: 4.5, what: 'secondary text on cards' },
  { fg: 'primary', bg: 'bg', min: 4.5, what: 'links on the page' },
  { fg: 'primary', bg: 'surface', min: 4.5, what: 'links on cards' },
  { fg: 'onPrimary', bg: 'primary', min: 4.5, what: 'button text' },
  { fg: 'onAccent', bg: 'accent', min: 4.5, what: 'text on accent' },
  { fg: 'accent', bg: 'bg', min: 3, what: 'focus ring and progress bar' },
  { fg: 'inputBorder', bg: 'surface', min: 3, what: 'form field outlines' },
  { fg: 'text', bg: 'successBg', min: 4.5, what: 'success messages' },
  { fg: 'text', bg: 'warningBg', min: 4.5, what: 'warnings' },
  { fg: 'text', bg: 'errorBg', min: 4.5, what: 'error messages' },
  { fg: 'error', bg: 'bg', min: 4.5, what: 'error text and danger buttons' },
  { fg: 'success', bg: 'bg', min: 4.5, what: 'success text' },
  { fg: 'warning', bg: 'bg', min: 4.5, what: 'warning text' },
];

/**
 * Extra pairs for brands with typeScale "display", whose look builds colours with color-mix(in srgb, ...) (stage.css,
 * home.css): the background is `bg` mixed with `mixWith` at `weight`% of `bg` (no mixWith: `bg` as it is).
 */
export const DISPLAY_CONTRAST_PAIRS: { fg: Key; bg: Key; mixWith?: Key; weight?: number; min: number; what: string }[] = [
  { fg: 'onPrimary', bg: 'primary', mixWith: 'text', weight: 85, min: 4.5, what: 'button text on the top of the button gradient' },
  { fg: 'onPrimary', bg: 'primary', mixWith: 'accent', weight: 85, min: 4.5, what: 'button text on the foot of the button gradient' },
  { fg: 'accent', bg: 'surface', min: 4.5, what: 'accent labels on cards (next draw, under an hour)' },
  { fg: 'accent', bg: 'bg', min: 4.5, what: 'accent labels on the page (step numbers)' },
  { fg: 'accent', bg: 'primary', mixWith: 'surface', weight: 16, min: 4.5, what: 'accent text on the tinted instant prize tiles' },
];

export interface ContrastProblem {
  mode: 'light' | 'dark';
  fg: Key;
  bg: Key;
  /** Set when the background is bg mixed with another token (display brands). */
  mix?: { with: Key; weight: number };
  ratio: number;
  min: number;
  what: string;
  suggestion: string | null;
}

export function checkBrandContrast(brand: Brand): ContrastProblem[] {
  const problems: ContrastProblem[] = [];
  for (const mode of ['light', 'dark'] as const) {
    const p = brand.colours[mode];
    for (const pair of CONTRAST_PAIRS) {
      const ratio = contrastRatio(p[pair.fg], p[pair.bg]);
      if (ratio < pair.min) {
        problems.push({ mode, ...pair, ratio: Math.round(ratio * 100) / 100, suggestion: nearestPassing(p[pair.fg], p[pair.bg], pair.min) });
      }
    }
    if (brand.typeScale !== 'display') continue;
    for (const { mixWith, weight = 100, ...pair } of DISPLAY_CONTRAST_PAIRS) {
      const back = mixWith ? mixHex(p[pair.bg], p[mixWith], weight) : p[pair.bg];
      const ratio = contrastRatio(p[pair.fg], back);
      if (ratio < pair.min) {
        problems.push({
          mode,
          ...pair,
          ...(mixWith ? { mix: { with: mixWith, weight } } : {}),
          ratio: Math.round(ratio * 100) / 100,
          suggestion: nearestPassing(p[pair.fg], back, pair.min),
        });
      }
    }
  }
  return problems;
}

export function describeProblems(problems: ContrastProblem[]): string {
  return problems
    .map((p) => `${p.mode} ${p.fg} on ${p.mix ? `${p.bg} mixed ${p.mix.weight}% with ${p.mix.with}` : p.bg} (${p.what}): ${p.ratio}:1, needs ${p.min}:1.${p.suggestion ? ` Nearest passing ${p.fg}: ${p.suggestion}` : ''}`)
    .join('\n');
}
