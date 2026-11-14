import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { brandSchema, type Brand } from '../src/brand/schema';
import { checkBrandContrast } from '../src/brand/check';
import { contrastRatio, nearestPassing } from '../src/brand/contrast';
import { brandCss } from '../src/brand/css';
import { activeBrand, brand, parseBrand } from '../src/brand';
import { cardBadges } from '../src/components/CompetitionCard';
import { SiteFooter } from '../src/components/SiteFooter';

const root = path.resolve(import.meta.dirname, '..');
const presetFiles = fs.readdirSync(path.join(root, 'config/brand-presets')).map((f) => path.join(root, 'config/brand-presets', f));

describe('brand files', () => {
  it('config/brand.json and every preset are valid and meet WCAG 2.2 AA in light and dark', () => {
    for (const f of [path.join(root, 'config/brand.json'), ...presetFiles]) {
      const b = brandSchema.parse(JSON.parse(fs.readFileSync(f, 'utf8')));
      expect(checkBrandContrast(b), f).toEqual([]);
    }
    expect(presetFiles.length).toBeGreaterThanOrEqual(3);
  });

  it('presets differ structurally, not just in colour', () => {
    const layouts = new Set(presetFiles.map((f) => JSON.stringify(JSON.parse(fs.readFileSync(f, 'utf8')).layout)));
    expect(layouts.size).toBe(presetFiles.length);
  });

  it('refuses a brand that fails contrast, and suggests a passing colour', () => {
    const bad: Brand = structuredClone(brand);
    bad.colours.light.muted = '#bbbbbb';
    bad.colours.dark.primary = '#1e3a8a';
    const problems = checkBrandContrast(bad);
    expect(problems.some((p) => p.mode === 'light' && p.fg === 'muted')).toBe(true);
    expect(problems.some((p) => p.mode === 'dark' && p.fg === 'primary')).toBe(true);
    for (const p of problems) {
      expect(p.suggestion).not.toBeNull();
      expect(contrastRatio(p.suggestion!, bad.colours[p.mode][p.bg])).toBeGreaterThanOrEqual(p.min);
    }
    expect(() => parseBrand(bad)).toThrow('WCAG');
  });

  it('contrast maths matches known values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(nearestPassing('#777777', '#ffffff', 4.5)).not.toBe('#777777');
  });

  it('compiles every token for both modes', () => {
    const css = brandCss(brand);
    for (const k of Object.keys(brand.colours.light)) expect(css).toContain(`--c-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:`);
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('--font-heading');
    expect(brandCss(brand, '.preview-pane')).toContain('.preview-pane.theme-dark');
  });
});

describe('no hard-coded colours or fonts outside the brand', () => {
  function files(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  }
  const candidates = files(path.join(root, 'src')).filter((f) => /\.(ts|tsx|css)$/.test(f) && !f.includes(`${path.sep}brand${path.sep}`) && !f.endsWith('fonts.css'));

  it('has no hex colours in components, pages or CSS', () => {
    const hits = candidates.flatMap((f) =>
      fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b(?![-\w])/.test(line) && !/href="#|href={`#/.test(line) ? [`${path.relative(root, f)}:${i + 1}: ${line.trim()}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it('sets font-family only through tokens', () => {
    const hits = candidates.flatMap((f) =>
      fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (/font-family\s*:(?!\s*var\()/i.test(line) || /fontFamily\s*:/.test(line) ? [`${path.relative(root, f)}:${i + 1}`] : [])),
    );
    expect(hits).toEqual([]);
  });
});

describe('the FairDraw link survives every footer style', () => {
  it('renders in both footers', () => {
    for (const style of ['columns', 'minimal'] as const) {
      const html = renderToStaticMarkup(createElement(SiteFooter, { style }));
      expect(html).toContain('href="https://fairdraw.partyofone.quest"');
      expect(html).toContain('Draw checks by FairDraw');
    }
  });

  it('BRAND_PRESET picks a preset at run time, and refuses one that does not exist', () => {
    expect(activeBrand('showtime').direction).toMatch(/^Showtime/);
    expect(activeBrand('showtime').extras).toEqual({ countdown: true, badges: true, glow: true });
    expect(activeBrand('').direction).toBe(activeBrand(undefined).direction);
    expect(activeBrand(undefined).extras).toEqual({ countdown: false, badges: false, glow: false });
    expect(() => activeBrand('neon-nights')).toThrow(/not one of/);
  });

  it('only shows badges that follow from the competition itself', () => {
    const now = new Date('2026-11-14T12:00:00Z');
    const H = 3600_000;
    const c = (opens: number, closes: number) => ({ opensAt: new Date(now.getTime() + opens * H), closesAt: new Date(now.getTime() + closes * H), maxTickets: 100 });
    expect(cardBadges(c(-48, 72), 10, now)).toEqual([]);
    expect(cardBadges(c(-48, 72), 80, now)).toEqual(['Almost sold out']);
    expect(cardBadges(c(-48, 72), 100, now)).toEqual(['Sold out']);
    expect(cardBadges(c(-48, 5), 10, now)).toEqual(['Ending soon']);
    expect(cardBadges(c(-2, 72), 0, now)).toEqual(['New']);
    expect(cardBadges(c(3, 72), 0, now)).toEqual(['Coming soon']);
  });
});
