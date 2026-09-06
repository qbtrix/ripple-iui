// scripts/gen-widget-registry.ts
// @file scripts/gen-widget-registry.ts
// @description Generator for src/lib/widgets/index.ts. Reads the declarative
//   source of truth (src/lib/widgets/registry.data.ts) and emits the import
//   wall, the type-string -> component map (canonical types + aliases), the
//   registry accessors, and the public re-export block. Replaces a 460-line
//   hand-maintained file that every new widget had to edit in three places.
//   Run as `bun run gen:widgets`; `bun run lint:widgets` re-runs it in memory
//   and fails if the committed file has drifted (also asserted by
//   gen-widget-registry.test.ts, so CI's vitest run is the real gate).
// @created 2026-08-24 — widget-manifest codegen.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WIDGET_REGISTRY, type WidgetRegistryEntry } from '../src/lib/widgets/registry.data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Path of the generated file, absolute. */
export const OUTPUT_PATH = resolve(__dirname, '../src/lib/widgets/index.ts');

const HEADER = `// @file src/lib/widgets/index.ts
// @description GENERATED FILE — DO NOT EDIT BY HAND.
//   Produced by \`bun run gen:widgets\` from src/lib/widgets/registry.data.ts,
//   which is the source of truth for every widget type string and alias.
//   To add, rename, or alias a widget: edit registry.data.ts and regenerate.
//   \`bun run lint:widgets\` (and the vitest gate) fail if this file drifts.`;

const TAIL = `
let registry: WidgetMap = { ...defaultRegistry };

export function getWidget(type: string): Component<any> | undefined {
  return registry[type];
}

export function registerWidget(type: string, component: Component<any>): void {
  registry[type] = component;
}

export function unregisterWidget(type: string): void {
  delete registry[type];
}

export function hasWidget(type: string): boolean {
  return type in registry;
}

export function getWidgetTypes(): string[] {
  return Object.keys(registry);
}

export function resetRegistry(): void {
  registry = { ...defaultRegistry };
}
`;

/** A bare identifier can be an object key unquoted; anything else needs quotes. */
function keyLiteral(type: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(type) ? type : `'${type.replace(/'/g, "\\'")}'`;
}

/** Wrap a comma-separated name list at ~110 columns, indented two spaces. */
function wrapNames(names: string[], indent = '  '): string[] {
  const out: string[] = [];
  let line = '';
  for (const name of names) {
    const piece = line ? `${line} ${name},` : `${indent}${name},`;
    if (piece.length > 110) {
      out.push(line);
      line = `${indent}${name},`;
    } else {
      line = piece;
    }
  }
  if (line) out.push(line);
  return out;
}

function importBlock(entries: readonly WidgetRegistryEntry[]): string[] {
  // Group by module, modules in first-appearance order.
  const modules: string[] = [];
  const specifiers = new Map<string, string[]>();
  const defaults: Array<[string, string]> = [];
  for (const e of entries) {
    if (e.default) {
      defaults.push([e.component, e.from]);
      continue;
    }
    if (!specifiers.has(e.from)) {
      specifiers.set(e.from, []);
      modules.push(e.from);
    }
    const imported = e.imported ?? e.component;
    specifiers.get(e.from)!.push(imported === e.component ? e.component : `${imported} as ${e.component}`);
  }

  const lines: string[] = [];
  for (const [name, from] of defaults) lines.push(`import ${name} from '${from}';`);
  for (const mod of modules) {
    const names = specifiers.get(mod)!;
    const single = `import { ${names.join(', ')} } from '${mod}';`;
    if (single.length <= 110) {
      lines.push(single);
    } else {
      lines.push('import {');
      lines.push(...wrapNames(names));
      lines.push(`} from '${mod}';`);
    }
  }
  return lines;
}

function registryBlock(entries: readonly WidgetRegistryEntry[]): string[] {
  const lines: string[] = ['const defaultRegistry: WidgetMap = {'];
  for (const e of entries) {
    if (e.note) for (const n of e.note) lines.push(`  // ${n}`);
    for (const type of e.types) lines.push(`  ${keyLiteral(type)}: ${e.component},`);
  }
  lines.push('};');
  return lines;
}

function exportBlock(entries: readonly WidgetRegistryEntry[]): string[] {
  const names = entries.filter((e) => e.exported !== false).map((e) => e.component);
  return ['export {', ...wrapNames(names), '};'];
}

/** Render the full contents of src/lib/widgets/index.ts. */
export function generate(entries: readonly WidgetRegistryEntry[] = WIDGET_REGISTRY): string {
  assertConsistent(entries);
  return [
    HEADER,
    '',
    "import type { Component } from 'svelte';",
    '',
    ...importBlock(entries),
    '',
    '/** Map of widget type name → Svelte component. Internal registry format. */',
    'export type WidgetMap = Record<string, Component<any>>;',
    '',
    ...registryBlock(entries),
    TAIL,
    ...exportBlock(entries),
    '',
  ].join('\n');
}

/** Structural checks the manifest must satisfy before anything is emitted. */
export function assertConsistent(entries: readonly WidgetRegistryEntry[] = WIDGET_REGISTRY): void {
  const seenType = new Map<string, string>();
  const seenComponent = new Set<string>();
  for (const e of entries) {
    if (seenComponent.has(e.component)) {
      throw new Error(`duplicate component entry: ${e.component} (merge its types into one entry)`);
    }
    seenComponent.add(e.component);
    if (e.types.length === 0) throw new Error(`${e.component} declares no type strings`);
    for (const t of e.types) {
      const owner = seenType.get(t);
      if (owner) throw new Error(`type string '${t}' claimed by both ${owner} and ${e.component}`);
      seenType.set(t, e.component);
    }
  }
}

/**
 * Parse a rendered widgets/index.ts back into the facts that matter:
 * the type -> component-name map and the public export list. Used by the
 * equivalence test to compare the generated file against a snapshot taken
 * from the pre-codegen file on origin/main.
 */
export function parseRegistrySource(source: string): { map: Record<string, string>; exports: string[] } {
  const body = source.split('const defaultRegistry: WidgetMap = {')[1]?.split('\n};')[0];
  if (body === undefined) throw new Error('could not locate defaultRegistry literal');
  const map: Record<string, string> = {};
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    const m = line.match(/^\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))\s*:\s*([A-Za-z_$][\w$]*)\s*,/);
    if (!m) throw new Error(`unparsed registry line: ${JSON.stringify(line)}`);
    map[m[1] ?? m[2]] = m[3];
  }
  const exportBody = source.split('\nexport {')[1]?.split('};')[0];
  if (exportBody === undefined) throw new Error('could not locate export block');
  const exports = exportBody
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return { map, exports };
}

/** True when the committed file already matches what the generator produces. */
export function isFresh(): boolean {
  return readFileSync(OUTPUT_PATH, 'utf-8') === generate();
}

if (import.meta.main) {
  const check = process.argv.includes('--check');
  const rendered = generate();
  if (check) {
    if (readFileSync(OUTPUT_PATH, 'utf-8') !== rendered) {
      console.error(
        '✗ src/lib/widgets/index.ts is stale.\n' +
          '  It is generated from src/lib/widgets/registry.data.ts.\n' +
          '  Run `bun run gen:widgets` and commit the result.'
      );
      process.exit(1);
    }
    console.log(`✓ widgets/index.ts is up to date (${WIDGET_REGISTRY.length} widgets)`);
  } else {
    writeFileSync(OUTPUT_PATH, rendered, 'utf-8');
    const types = WIDGET_REGISTRY.reduce((n, e) => n + e.types.length, 0);
    console.log(`✓ wrote ${OUTPUT_PATH} (${WIDGET_REGISTRY.length} widgets, ${types} type strings)`);
  }
}
