#!/usr/bin/env node
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
// Adds the CPAL Exhibit A notice to the top of every source file the template authors wrote (src/ and scripts/),
// as CPAL section 3.5 asks. Safe to run again: files that already carry the notice are left alone.
// src/lib/fairdraw/ is excluded: it is FairDraw's MIT-licensed code and keeps its own MIT credit (see NOTICE).
//   node scripts/licence-headers.mjs          add missing notices
//   node scripts/licence-headers.mjs --check  list files without one and exit 1 (tests/licence-headers.test.ts does this too)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const MARKER = 'Common Public Attribution License Version 1.0';

export const NOTICE_LINES = [
  'The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may',
  'not use this file except in compliance with the License. You may obtain a copy of the License at',
  'https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections',
  '14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for',
  'the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.',
  'Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either',
  'express or implied. See the License for the specific language governing rights and limitations under the License.',
  'The Original Code is FairDraw operator template.',
  'The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are',
  'Copyright (c) 2026 Harrison Jones. All Rights Reserved.',
];

const ROOTS = ['src', 'scripts'];
const EXTENSIONS = /\.(ts|tsx|mjs|js|css|sh|php)$/;
const EXCLUDED = [`src${path.sep}lib${path.sep}fairdraw${path.sep}`];

export function sourceFiles(root = process.cwd()) {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : [p];
    });
  return ROOTS.flatMap((r) => walk(path.join(root, r)))
    .filter((f) => EXTENSIONS.test(f))
    .filter((f) => !EXCLUDED.some((x) => path.relative(root, f).startsWith(x)));
}

function block(file) {
  if (/\.sh$/.test(file)) return NOTICE_LINES.map((l) => `# ${l}`).join('\n') + '\n';
  return ['/*', ...NOTICE_LINES.map((l) => ` * ${l}`), ' */'].join('\n') + '\n';
}

export function withNotice(file, text) {
  if (text.includes(MARKER)) return text;
  // Keep a shebang or an opening <?php tag first.
  const first = text.match(/^(#![^\n]*\n|<\?php\n)/);
  const lead = first ? first[0] : '';
  return lead + block(file) + text.slice(lead.length);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const missing = [];
  for (const f of sourceFiles()) {
    const text = readFileSync(f, 'utf8');
    if (text.includes(MARKER)) continue;
    if (check) missing.push(path.relative(process.cwd(), f));
    else writeFileSync(f, withNotice(f, text));
  }
  if (check && missing.length) {
    console.error(`Missing the CPAL notice:\n  ${missing.join('\n  ')}\nRun: node scripts/licence-headers.mjs`);
    process.exit(1);
  }
  console.log(check ? 'Every source file carries the CPAL notice.' : 'CPAL notices added where missing.');
}
