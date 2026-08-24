// @file scripts/gen-widget-registry.test.ts
// @description Freshness gate for the generated widget registry. CI runs
//   `bunx vitest run`, so this test IS the CI gate: it fails if the committed
//   src/lib/widgets/index.ts differs by even one byte from what the generator
//   produces out of registry.data.ts, which is what stops the generated file
//   from drifting away from its source of truth. Also unit-tests the manifest
//   consistency rules (no duplicate type string, no duplicate component entry,
//   no empty type list) and the emitter's handling of the awkward cases in the
//   real data: the `Map as MapWidget` rename, the `Workflow.svelte` default
//   import, the registered-but-unexported widgets, and the load-bearing
//   `richtext` contract note.
// @created 2026-08-24 — widget-manifest codegen.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  OUTPUT_PATH,
  assertConsistent,
  generate,
  parseRegistrySource
} from './gen-widget-registry.js';

describe('widget registry codegen', () => {
  it('the committed index.ts is exactly what the generator produces', () => {
    const committed = readFileSync(OUTPUT_PATH, 'utf-8');
    expect(
      committed === generate(),
      'src/lib/widgets/index.ts is stale — run `bun run gen:widgets` and commit the result'
    ).toBe(true);
  });

  it('the real manifest passes the consistency rules', () => {
    expect(() => assertConsistent()).not.toThrow();
  });

  it('rejects a type string claimed by two widgets', () => {
    expect(() =>
      assertConsistent([
        { component: 'A', from: './a.js', types: ['x'] },
        { component: 'B', from: './b.js', types: ['x'] }
      ])
    ).toThrow(/claimed by both A and B/);
  });

  it('rejects a component declared twice instead of merging its aliases', () => {
    expect(() =>
      assertConsistent([
        { component: 'A', from: './a.js', types: ['x'] },
        { component: 'A', from: './a.js', types: ['y'] }
      ])
    ).toThrow(/duplicate component entry/);
  });

  it('rejects a widget with no type string', () => {
    expect(() => assertConsistent([{ component: 'A', from: './a.js', types: [] }])).toThrow(
      /no type strings/
    );
  });

  it('emits a renamed import for a barrel export that collides (Map as MapWidget)', () => {
    expect(generate()).toContain('Map as MapWidget');
  });

  it('emits a default import for the one widget that has no barrel (Workflow)', () => {
    expect(generate()).toContain("import Workflow from './Workflow.svelte';");
  });

  it('keeps a registered-but-unexported widget out of the export block', () => {
    const { map, exports } = parseRegistrySource(generate());
    expect(map['design-system']).toBe('DesignSystemEditor');
    expect(exports).not.toContain('DesignSystemEditor');
  });

  it('preserves the load-bearing richtext contract note in the generated file', () => {
    expect(generate()).toContain('CONTRACT CHANGE (editor chrome, 2026-06-30)');
  });
});
