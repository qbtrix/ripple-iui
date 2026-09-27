// ripple/scripts/build-manifest.ts
// Run after `svelte-package` to emit dist/manifest.json alongside the library.
// Invoked from the `build` npm script.
// 2026-09-27: also emits dist/manifest.slim.json, the slim manifest for
// @ripple-ui/core/headless/slim: the spec envelope, the grammar for exactly the
// actions that runtime runs (BASE_ACTIONS), and the standard slim atoms
// (SLIM_WIDGETS). The release attaches it, so an agent can always fetch the
// newest one from
//   https://github.com/qbtrix/ripple-iui/releases/latest/download/manifest.slim.json
// A host with extra widgets builds its own with buildSlimManifest({ widgets }).

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from '../src/lib/manifest/index.js';
import { buildSlimManifest, SLIM_WIDGETS } from '@ripple-ui/core/manifest';

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

// The slim manifest: dist/ only (it is a release asset, not a dev-server page).
const slim = buildSlimManifest({ widgets: SLIM_WIDGETS });
const slimPath = resolve(__dirname, '../dist/manifest.slim.json');
writeFileSync(slimPath, JSON.stringify(slim, null, 2), 'utf-8');
console.log(`✓ wrote ${slimPath} (${slim.widgets.length} widgets, ${Object.keys(slim.actions).length} actions)`);
