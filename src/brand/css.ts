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
/** Compiles the brand into CSS custom properties (design tokens). Components use only these variables. */
import type { Brand, Palette } from './schema';
import { FONT_PAIRINGS, MONO_STACK } from './fonts';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function paletteVars(p: Palette): string {
  return Object.entries(p)
    .map(([k, v]) => `--c-${kebab(k)}: ${v};`)
    .join(' ');
}

const RADIUS = { none: ['0', '0'], small: ['4px', '6px'], medium: ['8px', '12px'], large: ['14px', '22px'] } as const;
const DENSITY = { compact: '0.85', comfortable: '1', spacious: '1.25' } as const;
const SHADOW = {
  none: ['none', 'none'],
  soft: ['0 1px 3px rgb(0 0 0 / 0.08), 0 4px 12px rgb(0 0 0 / 0.06)', '0 8px 24px rgb(0 0 0 / 0.12)'],
  crisp: ['2px 2px 0 rgb(0 0 0 / 0.85)', '4px 4px 0 rgb(0 0 0 / 0.85)'],
} as const;

export function brandCss(b: Brand, scope = ':root'): string {
  const f = FONT_PAIRINGS[b.fonts];
  const [r1, r2] = RADIUS[b.radius];
  const [s1, s2] = SHADOW[b.shadow];
  const shared = `--font-heading: ${f.heading}; --font-body: ${f.body}; --font-mono: ${MONO_STACK}; --radius-sm: ${r1}; --radius: ${r2}; --space: calc(1rem * ${DENSITY[b.density]}); --shadow: ${s1}; --shadow-raised: ${s2};`;
  const light = paletteVars(b.colours.light);
  const dark = paletteVars(b.colours.dark);
  if (scope !== ':root') {
    // Preview scopes: force one mode inside a container.
    return `${scope}.theme-light { ${shared} ${light} color-scheme: light; } ${scope}.theme-dark { ${shared} ${dark} color-scheme: dark; }`;
  }
  return `:root { ${shared} ${light} color-scheme: light dark; } @media (prefers-color-scheme: dark) { :root { ${dark} } }`;
}

/** Data attributes on <body> that select structural styles in globals.css. */
export function brandAttributes(b: Brand) {
  return { 'data-buttons': b.buttons, 'data-cards': b.cards, 'data-header': b.layout.header, 'data-card-style': b.layout.card } as const;
}
