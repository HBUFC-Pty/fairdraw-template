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
