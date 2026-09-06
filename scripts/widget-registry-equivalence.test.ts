// @file scripts/widget-registry-equivalence.test.ts
// @description Proves the GENERATED widget registry is behaviourally identical
//   to the hand-maintained import wall it replaced. The baseline lives in
//   __fixtures__/registry-snapshot.json, captured from the pre-codegen file on
//   git ref origin/main: 340 type strings -> 190 component names, plus the 187
//   publicly re-exported names. Two independent proofs run here:
//     1. STATIC — parse the committed index.ts and compare the type->component
//        name map and the export list against the snapshot, key by key.
//     2. RUNTIME — resolve every snapshot type through getWidget() and compare
//        the identity partition (which types share one component instance)
//        against the snapshot's partition by name. Compiled Svelte components
//        carry no reliable .name, so the static pass supplies the names and the
//        runtime pass supplies the identities; neither alone is sufficient.
//   Also guards the public export surface: a widget registered but deliberately
//   NOT exported (DesignSystemEditor, RippleFrame, ConfirmDialog) must stay
//   unexported, or the package silently widens its API.
//   Lives in scripts/ rather than src/ on purpose: it reads files off disk, and
//   anything under src/ that imports node:fs pulls the generator into
//   svelte-check's graph, which has no @types/node.
// @created 2026-08-24 — widget-manifest codegen.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseRegistrySource } from './gen-widget-registry.js';
import * as widgets from '../src/lib/widgets/index.js';
import snapshot from '../src/lib/widgets/__fixtures__/registry-snapshot.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const committed = readFileSync(resolve(__dirname, '../src/lib/widgets/index.ts'), 'utf-8');
const parsed = parseRegistrySource(committed);

/** Runtime API exported alongside the components; not part of the widget surface. */
const RUNTIME_API = [
  'getWidget',
  'registerWidget',
  'unregisterWidget',
  'hasWidget',
  'getWidgetTypes',
  'resetRegistry'
];

/** types grouped by the thing they resolve to, as a canonical comparable shape. */
function partition<T>(types: string[], resolve: (t: string) => T): string[][] {
  const groups = new Map<T, string[]>();
  for (const t of types) {
    const key = resolve(t);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  return [...groups.values()].map((g) => g.slice().sort()).sort((a, b) => a[0].localeCompare(b[0]));
}

describe('generated widget registry == hand-maintained wall (origin/main baseline)', () => {
  const snapshotTypes = Object.keys(snapshot.types).sort();

  it('the snapshot itself is the expected size (guards against a truncated fixture)', () => {
    expect(snapshotTypes.length).toBe(340);
    expect(new Set(Object.values(snapshot.types)).size).toBe(190);
    expect(snapshot.exports.length).toBe(187);
  });

  it('STATIC: every type string maps to the same component name, with no additions', () => {
    // Compared as whole objects so a failure prints the exact offending keys
    // rather than an aggregate count.
    const sortedGenerated = Object.fromEntries(
      Object.keys(parsed.map)
        .sort()
        .map((k) => [k, parsed.map[k]])
    );
    expect(sortedGenerated).toEqual(snapshot.types);
  });

  it('STATIC: the public export list is unchanged (no name added, none dropped)', () => {
    expect(parsed.exports.slice().sort()).toEqual(snapshot.exports);
  });

  it('RUNTIME: every snapshot type resolves to a component', () => {
    const unresolved = snapshotTypes.filter((t) => widgets.getWidget(t) === undefined);
    expect(unresolved, `types that no longer resolve: ${unresolved.join(', ')}`).toEqual([]);
  });

  it('RUNTIME: the live registry holds exactly the snapshot type strings', () => {
    expect(widgets.getWidgetTypes().slice().sort()).toEqual(snapshotTypes);
  });

  it('RUNTIME: aliases share a component exactly as they did before', () => {
    const expected = partition(snapshotTypes, (t) => snapshot.types[t as keyof typeof snapshot.types]);
    const actual = partition(snapshotTypes, (t) => widgets.getWidget(t)!);
    expect(actual).toEqual(expected);
  });

  it('RUNTIME: the module namespace exports exactly the snapshot component names', () => {
    const exported = Object.keys(widgets)
      .filter((k) => !RUNTIME_API.includes(k))
      .sort();
    expect(exported).toEqual(snapshot.exports);
  });

  it('RUNTIME: registered-but-unexported widgets stay off the public surface', () => {
    for (const name of ['DesignSystemEditor', 'RippleFrame', 'ConfirmDialog']) {
      expect(Object.keys(widgets)).not.toContain(name);
    }
    // ...while still being reachable through the registry.
    for (const type of ['design-system', 'ripple-frame', 'confirm-dialog']) {
      expect(widgets.getWidget(type)).toBeDefined();
    }
  });
});
