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
  shadow: z.enum(['none', 'soft', 'crisp']),
  buttons: z.enum(['solid', 'outline', 'pill', 'square']),
  cards: z.enum(['bordered', 'elevated', 'flat']),
  layout: z.object({
    home: z.enum(['hero', 'grid', 'featured']),
    card: z.enum(['classic', 'compact', 'poster']),
    header: z.enum(['simple', 'centred']),
    footer: z.enum(['columns', 'minimal']),
  }),
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
