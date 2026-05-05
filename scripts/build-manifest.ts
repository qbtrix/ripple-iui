// ripple/scripts/build-manifest.ts
// Run after `svelte-package` to emit dist/manifest.json alongside the library.
// Invoked from the `build` npm script.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from '../src/lib/manifest/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../dist/manifest.json');

mkdirSync(dirname(outPath), { recursive: true });
const manifest = buildManifest();
writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf-8');

console.log(`✓ wrote ${outPath} (${manifest.widgets.length} widgets, v${manifest.version})`);
