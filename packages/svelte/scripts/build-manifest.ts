// ripple/scripts/build-manifest.ts
// Run after `svelte-package` to emit dist/manifest.json alongside the library.
// Invoked from the `build` npm script.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from '../src/lib/manifest/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = resolve(__dirname, '../dist/manifest.json');
const staticPath = resolve(__dirname, '../static/manifest.json');

const manifest = buildManifest();
const json = JSON.stringify(manifest, null, 2);

// Ship to dist/ for the published package and to static/ so the dev server
// serves it at /manifest.json on whichever port Vite picked.
for (const out of [distPath, staticPath]) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, json, 'utf-8');
  console.log(`✓ wrote ${out} (${manifest.widgets.length} widgets, v${manifest.version})`);
}
