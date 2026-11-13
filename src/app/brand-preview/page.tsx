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
import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brand as active, brandCss, parseBrand, type Brand } from '@/brand';
import { checkBrandContrast, describeProblems } from '@/brand/check';
import { brandSchema } from '@/brand/schema';
import { FONT_PAIRINGS } from '@/brand/fonts';
import { cspNonce } from '@/lib/web/request';
import { CompetitionCard } from '@/components/CompetitionCard';
import { FairDrawLink } from '@/components/SiteFooter';
import type { Competition } from '@/lib/public/queries';

export const metadata = { title: 'Brand preview', robots: { index: false } };

const PRESET_DIR = path.join(process.cwd(), 'config', 'brand-presets');

function presets(): string[] {
  try {
    return fs.readdirSync(PRESET_DIR).filter((f) => /^[a-z0-9-]+\.json$/.test(f)).map((f) => f.replace(/\.json$/, '')).sort();
  } catch {
    return [];
  }
}

const sample = (style: string): Competition => ({
  id: `sample-${style}`,
  slug: 'sample',
  title: 'Sample prize: weekend away',
  summary: 'Two nights for two, plus spending money.',
  prizeDescription: 'A sample prize used to preview the brand.',
  prizeValuePence: 150_000,
  images: [{ url: '/images/demo-lakes.svg', alt: 'Sample image' }],
  ticketPricePence: 150,
  maxTickets: 2000,
  perPersonCap: 100,
  winnerCount: 1,
  opensAt: new Date(Date.now() - 86400_000),
  closesAt: new Date(Date.now() + 5 * 86400_000),
  drawAt: new Date(Date.now() + 5 * 86400_000),
  skillQuestion: null,
  status: 'live',
  closedAt: null,
  drawnAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function Components({ b }: { b: Brand }) {
  const keys = Object.keys(b.colours.light) as (keyof Brand['colours']['light'])[];
  const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return (
    <>
      <h2>Headings in {FONT_PAIRINGS[b.fonts].label}</h2>
      <p>Body text. <a href="#top">A link</a>. <span className="muted">Secondary text.</span> <code>e3b0c442</code></p>
      <p><button type="button">Primary button</button> <button type="button" className="secondary">Secondary</button> <button type="button" className="danger">Danger</button></p>
      <div className="flash ok">A success message.</div>
      <div className="notice warn">A warning.</div>
      <div className="flash err">An error message.</div>
      <form className="stack"><label>A form field<span className="hint">With a hint.</span><input defaultValue="Sample" /></label></form>
      <div className="progress" aria-hidden="true"><span className="p60" /></div>
      <h3>Card styles</h3>
      <div className="grid">
        {(['classic', 'compact', 'poster'] as const).map((s) => (
          <div key={s}><p className="muted">{s}{s === b.layout.card ? ' (selected)' : ''}</p><CompetitionCard c={sample(s)} sold={1200} style={s} now={new Date()} /></div>
        ))}
      </div>
      <h3>Colours</h3>
      <div className="swatches">
        {keys.map((k) => <div className="swatch" key={k}><div className={`chip sw-${kebab(k)}`} />{k}</div>)}
      </div>
      <p><FairDrawLink /> (identical under every brand)</p>
    </>
  );
}

/** Development only: every component in a brand, light and dark. Add ?preset=meadow to preview config/brand-presets/meadow.json. */
export default async function BrandPreview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === 'production' && process.env.BRAND_PREVIEW !== 'true') notFound();
  const nonce = await cspNonce();
  const sp = await searchParams;
  const name = typeof sp.preset === 'string' && presets().includes(sp.preset) ? sp.preset : null;
  let b: Brand = active;
  let error: string | null = null;
  if (name) {
    const parsed = brandSchema.safeParse(JSON.parse(fs.readFileSync(path.join(PRESET_DIR, `${name}.json`), 'utf8')));
    if (!parsed.success) error = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    else {
      b = parsed.data;
      const problems = checkBrandContrast(b);
      if (problems.length) error = describeProblems(problems);
      else b = parseBrand(parsed.data);
    }
  }
  return (
    <>
      <style nonce={nonce}>{brandCss(b, '.preview-pane')}</style>
      <h1 id="top">Brand preview: {name ?? 'current brand (config/brand.json)'}</h1>
      <p>
        Presets: <Link href="/brand-preview">current</Link>
        {presets().map((p) => <span key={p}> · <Link href={`/brand-preview?preset=${p}`}>{p}</Link></span>)}
      </p>
      {error ? <pre className="notice err">{error}</pre> : null}
      <p><strong>{b.direction}</strong>. Tone: {b.tone.summary}</p>
      <p className="muted">
        Layout: home {b.layout.home}, cards {b.layout.card}, header {b.layout.header}, footer {b.layout.footer}. Buttons {b.buttons}, card style {b.cards},
        radius {b.radius}, density {b.density}, shadow {b.shadow}. Home layout, header and footer show on the real pages once this brand is in config/brand.json.
      </p>
      {(['light', 'dark'] as const).map((mode) => (
        <section key={mode} className={`preview-pane theme-${mode}`} data-buttons={b.buttons} data-cards={b.cards} aria-label={`${mode} mode`}>
          <p className="muted">{mode} mode</p>
          <Components b={b} />
        </section>
      ))}
    </>
  );
}
