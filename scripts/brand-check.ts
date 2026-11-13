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
