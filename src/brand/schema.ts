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
/** The brand file (config/brand.json) schema. Every visual choice on the site comes from here. */
import { z } from 'zod';
import { FONT_PAIRINGS } from './fonts';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'use a 6-digit hex colour such as #1d4ed8');

export const paletteSchema = z.object({
  bg: hex, // page background
  surface: hex, // cards, header, footer
  text: hex,
  muted: hex, // secondary text
  border: hex, // decorative lines
  inputBorder: hex, // form field outlines (must reach 3:1)
  primary: hex, // buttons and links
  onPrimary: hex, // text on primary buttons
  accent: hex, // focus rings, progress bars, highlights
  onAccent: hex,
  success: hex,
  successBg: hex,
  warning: hex,
  warningBg: hex,
  error: hex,
  errorBg: hex,
});

export type Palette = z.infer<typeof paletteSchema>;

export const brandSchema = z.object({
  direction: z.string().min(1).max(60),
  tone: z.object({
    summary: z.string().min(1).max(200),
    words: z.array(z.string().min(1).max(30)).min(1).max(6),
    do: z.array(z.string().max(160)).max(8),
    avoid: z.array(z.string().max(160)).max(8),
  }),
  colours: z.object({ light: paletteSchema, dark: paletteSchema }),
  fonts: z.enum(Object.keys(FONT_PAIRINGS) as [keyof typeof FONT_PAIRINGS, ...(keyof typeof FONT_PAIRINGS)[]]),
  radius: z.enum(['none', 'small', 'medium', 'large']),
  density: z.enum(['compact', 'comfortable', 'spacious']),
  shadow: z.enum(['none', 'soft', 'crisp', 'glow']),
  buttons: z.enum(['solid', 'outline', 'pill', 'square']),
  cards: z.enum(['bordered', 'elevated', 'flat']),
  layout: z.object({
    home: z.enum(['hero', 'grid', 'featured', 'showcase']),
    card: z.enum(['classic', 'compact', 'poster', 'tile']),
    header: z.enum(['simple', 'centred', 'bar']),
    footer: z.enum(['columns', 'minimal']),
  }),
  // "display" switches on the condensed uppercase type scale (src/app/styles/stage.css). Off unless a brand asks.
  typeScale: z.enum(['standard', 'display']).default('standard'),
  // Optional genre extras, all factual: a live countdown to the close, "ending soon" and "almost sold out" badges,
  // a glow on competition cards, motion (hero autoplay, sheen, pulses, reveals; always off for reduced motion) and a
  // winners strip built from real results. Off unless a brand turns them on.
  extras: z
    .object({
      countdown: z.boolean().default(false),
      badges: z.boolean().default(false),
      glow: z.boolean().default(false),
      motion: z.boolean().default(false),
      ticker: z.boolean().default(false),
    })
    .default({ countdown: false, badges: false, glow: false, motion: false, ticker: false }),
  logo: z
    .object({
      src: z.string().regex(/^\/brand\/[a-z0-9._-]+\.(svg|png|webp)$/, 'put the logo in public/brand/ and give its path, for example /brand/logo.svg'),
      alt: z.string().min(1).max(100),
      showName: z.boolean().default(true),
    })
    .nullable(),
  favicon: z.string().regex(/^\/brand\/[a-z0-9._-]+\.(svg|png|ico)$/).nullable(),
});

export type Brand = z.infer<typeof brandSchema>;
