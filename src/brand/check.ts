/**
 * Accessibility guardrail: every text and background pair in both palettes must meet WCAG 2.2 AA. Normal text needs
 * 4.5:1; form field outlines and focus indicators need 3:1 (WCAG 1.4.11). A brand that fails is refused.
 */
import type { Brand, Palette } from './schema';
import { contrastRatio, nearestPassing } from './contrast';

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

export interface ContrastProblem {
  mode: 'light' | 'dark';
  fg: Key;
  bg: Key;
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
  }
  return problems;
}

export function describeProblems(problems: ContrastProblem[]): string {
  return problems
    .map((p) => `${p.mode} ${p.fg} on ${p.bg} (${p.what}): ${p.ratio}:1, needs ${p.min}:1.${p.suggestion ? ` Nearest passing ${p.fg}: ${p.suggestion}` : ''}`)
    .join('\n');
}
