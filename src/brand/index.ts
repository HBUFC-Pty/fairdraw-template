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
 * The active brand: config/brand.json, or the preset named by BRAND_PRESET (config/brand-presets/<name>.json), validated
 * and contrast-checked. A brand that fails WCAG 2.2 AA is refused (the site will not start), with the nearest passing
 * colours suggested. Run `pnpm brand:check` to see why.
 */
import raw from '../../config/brand.json';
import carnival from '../../config/brand-presets/carnival.json';
import harbour from '../../config/brand-presets/harbour.json';
import meadow from '../../config/brand-presets/meadow.json';
import showtime from '../../config/brand-presets/showtime.json';
import velvet from '../../config/brand-presets/velvet.json';
import { brandSchema, type Brand } from './schema';
import { checkBrandContrast, describeProblems } from './check';

export function parseBrand(input: unknown, source = 'brand'): Brand {
  const b = brandSchema.parse(input);
  const problems = checkBrandContrast(b);
  if (problems.length) throw new Error(`${source} fails WCAG 2.2 AA contrast:\n${describeProblems(problems)}`);
  return b;
}

/** The presets BRAND_PRESET can choose (add a new preset file here as well). */
export const BRAND_PRESETS: Record<string, unknown> = { carnival, harbour, meadow, showtime, velvet };

/** config/brand.json, unless BRAND_PRESET names one of the presets (for trying a look, or a demo, without editing files). */
export function activeBrand(preset = process.env.BRAND_PRESET): Brand {
  const name = (preset ?? '').trim();
  if (!name) return parseBrand(raw, 'config/brand.json');
  if (!(name in BRAND_PRESETS)) throw new Error(`BRAND_PRESET "${name}" is not one of: ${Object.keys(BRAND_PRESETS).join(', ')}`);
  return parseBrand(BRAND_PRESETS[name], `config/brand-presets/${name}.json`);
}

export const brand: Brand = activeBrand();
export { brandCss, brandAttributes } from './css';
export type { Brand } from './schema';
