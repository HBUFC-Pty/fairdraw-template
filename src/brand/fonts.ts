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
 * Self-hosted font pairings (all under the SIL Open Font License, served from this site by the @fontsource packages:
 * no request to Google or any other third party). The CSS for every pairing is imported in src/app/fonts.css; a
 * browser only downloads the files for the fonts the brand actually uses.
 */
export const FONT_PAIRINGS = {
  modern: { label: 'Modern: Inter', heading: "'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  editorial: { label: 'Editorial: Playfair Display and Source Sans 3', heading: "'Playfair Display', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif" },
  friendly: { label: 'Friendly: Nunito', heading: "'Nunito', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif" },
  bold: { label: 'Bold: Montserrat and Open Sans', heading: "'Montserrat', system-ui, sans-serif", body: "'Open Sans', system-ui, sans-serif" },
  classic: { label: 'Classic: Merriweather and Lato', heading: "'Merriweather', Georgia, serif", body: "'Lato', system-ui, sans-serif" },
  outdoors: { label: 'Outdoors: Bitter and Source Sans 3', heading: "'Bitter', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif" },
  geometric: { label: 'Geometric: Poppins and Inter', heading: "'Poppins', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  premium: { label: 'Premium: Cormorant Garamond and Work Sans', heading: "'Cormorant Garamond', Georgia, serif", body: "'Work Sans', system-ui, sans-serif" },
  playful: { label: 'Playful: Fredoka and Nunito', heading: "'Fredoka', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif" },
  accessible: { label: 'Highly legible: Atkinson Hyperlegible', heading: "'Atkinson Hyperlegible', system-ui, sans-serif", body: "'Atkinson Hyperlegible', system-ui, sans-serif" },
  system: { label: 'System fonts (nothing to download)', heading: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
} as const;

export type FontPairing = keyof typeof FONT_PAIRINGS;
export const MONO_STACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
