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
 * Validate a brand file and check every text and background pair for WCAG 2.2 AA contrast.
 *   pnpm brand:check                      (config/brand.json)
 *   pnpm brand:check config/brand-presets/meadow.json
 * Exits non-zero and suggests the nearest passing colour for anything that fails.
 */
import fs from 'node:fs';
import { brandSchema } from '../src/brand/schema';
import { checkBrandContrast, describeProblems } from '../src/brand/check';

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['config/brand.json'];
let failed = false;
for (const file of files) {
  const parsed = brandSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!parsed.success) {
    failed = true;
    console.error(`${file}: invalid\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
    continue;
  }
  const problems = checkBrandContrast(parsed.data);
  if (problems.length) {
    failed = true;
    console.error(`${file}: ${problems.length} contrast problem(s)\n${describeProblems(problems).replace(/^/gm, '  ')}`);
  } else console.log(`${file}: valid, every colour pair meets WCAG 2.2 AA`);
}
process.exit(failed ? 1 : 0);
