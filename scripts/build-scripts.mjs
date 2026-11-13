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
