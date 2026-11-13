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
// Bundles the worker and the command-line scripts into dist/*.mjs for the production image, so they run with plain
// `node` and need nothing from node_modules except the native argon2 binding (which the worker does not load).
import { build } from 'esbuild';

await build({
  entryPoints: { worker: 'scripts/worker.ts', migrate: 'scripts/migrate.ts', 'create-owner': 'scripts/create-owner.ts' },
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: true,
  external: ['@node-rs/argon2', 'pg-native'],
  alias: { 'server-only': './tests/helpers/server-only-stub.ts' },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'warning',
});
console.log('built dist/worker.mjs, dist/migrate.mjs, dist/create-owner.mjs');
