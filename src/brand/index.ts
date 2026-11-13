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
 * The active brand: config/brand.json, validated and contrast-checked. A brand that fails WCAG 2.2 AA is refused
 * (the site will not start), with the nearest passing colours suggested. Run `pnpm brand:check` to see why.
 */
import raw from '../../config/brand.json';
import { brandSchema, type Brand } from './schema';
import { checkBrandContrast, describeProblems } from './check';

export function parseBrand(input: unknown, source = 'brand'): Brand {
  const b = brandSchema.parse(input);
  const problems = checkBrandContrast(b);
  if (problems.length) throw new Error(`${source} fails WCAG 2.2 AA contrast:\n${describeProblems(problems)}`);
  return b;
}

export const brand: Brand = parseBrand(raw, 'config/brand.json');
export { brandCss, brandAttributes } from './css';
export type { Brand } from './schema';
