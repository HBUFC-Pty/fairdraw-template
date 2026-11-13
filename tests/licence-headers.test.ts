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
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const MARKER = 'Common Public Attribution License Version 1.0';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const isSource = (f: string) => /\.(ts|tsx|mjs|js|css|sh|php)$/.test(f);
const fairdrawDir = path.join(root, 'src', 'lib', 'fairdraw') + path.sep;
const head = (f: string) => fs.readFileSync(f, 'utf8').split('\n').slice(0, 30).join('\n');

describe('licence notices', () => {
  it('every template source file in src/ and scripts/ starts with the CPAL Exhibit A notice', () => {
    const files = ['src', 'scripts'].flatMap((d) => walk(path.join(root, d))).filter(isSource).filter((f) => !f.startsWith(fairdrawDir));
    expect(files.length).toBeGreaterThan(50);
    const missing = files.filter((f) => !head(f).includes(MARKER) || !head(f).includes('The Original Code is FairDraw operator template.')).map((f) => path.relative(root, f));
    expect(missing, 'run: node scripts/licence-headers.mjs').toEqual([]);
  });

  it('the FairDraw draw code stays under MIT with its credit, not the CPAL', () => {
    const files = walk(fairdrawDir).filter(isSource);
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) {
      expect(head(f), f).toContain('Licence: MIT, copyright (c) 2026 Harrison Jones (FairDraw)');
      expect(head(f), f).not.toContain(MARKER);
    }
    expect(fs.readFileSync(path.join(root, 'NOTICE'), 'utf8')).toContain('Permission is hereby granted, free of charge');
  });

  it('LICENSE is the CPAL with Exhibits A and B filled in, and package.json says so', () => {
    const lic = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
    expect(lic.startsWith('Common Public Attribution License Version 1.0 (CPAL)')).toBe(true);
    expect(lic).toContain('Attribution Phrase (not exceeding 10 words): Draw checks by FairDraw');
    expect(lic).toContain('Attribution URL: https://fairdraw.partyofone.quest');
    expect(lic).toContain('Display of Attribution Information is required in Larger Works');
    expect(lic).not.toMatch(/_{5,}\.\s*All Rights|\[required\/not required\]|Alternatively, the contents/);
    expect(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).license).toBe('CPAL-1.0');
  });
});
