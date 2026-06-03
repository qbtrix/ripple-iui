---
{
  "title": "Test Suite for C4 ELK Layout Utilities",
  "summary": "Vitest unit tests for `elk-layout.ts`, covering the `getNodeType`, `isGroupNode`, and `computeElkLayout` functions. Tests verify correct C4 element classification and that ELK produces valid node positions for realistic diagram fixtures.",
  "concepts": [
    "vitest",
    "getNodeType",
    "isGroupNode",
    "computeElkLayout",
    "C4Diagram",
    "ELK layout",
    "unit tests",
    "test fixtures",
    "C4Person",
    "C4System",
    "C4Container",
    "group node",
    "layout position"
  ],
  "categories": [
    "test",
    "layout",
    "diagram"
  ],
  "source_docs": [
    "41e55445b4648a74"
  ],
  "backlinks": null,
  "word_count": 443,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

This test suite validates the logic that converts a `C4Diagram` data structure into SvelteFlow-compatible nodes with ELK-computed positions. It was created alongside the 2026-04-07 SvelteFlow + ELK rewrite to ensure the classification and layout functions behave correctly across all C4 element types.

## Test Fixtures

The file defines a representative set of C4 elements used across multiple test cases:

```typescript
const person: C4Person = { id: 'user', name: 'End User', external: true };
const system: C4System = {
  id: 'my-system', name: 'My System',
  containers: [{ id: 'api', ... }, { id: 'db', type: 'database', ... }]
};
const externalSystem: C4System = { id: 'ext-api', external: true };
const queue: C4Container = { id: 'mq', type: 'queue' };
const component: C4Component = { id: 'auth', type: 'service', kb_article: 'auth-module' };
```

## `getNodeType` Tests

These tests verify the classification logic that maps C4 element shapes to SvelteFlow node type strings:

| Input | Expected output | Why |
|-------|-----------------|-----|
| `C4Person` | `"person"` | No `technology`/`type`/`containers` fields |
| System with containers | `"group"` | Has child containers → renders as a group box |
| System without containers | `"system"` | Flat system → simple node |
| Container `type: 'database'` | `"database"` | Needs cylinder shape |
| Container `type: 'queue'` | `"queue"` | Needs parallelogram shape |
| Plain component | `"system"` | Falls through to default system style |

The last case is intentional — components without sub-elements render as system-style boxes, keeping the visual vocabulary simple.

## `isGroupNode` Tests

These verify the boolean helper that determines whether an element should become a SvelteFlow parent node (one that can contain children):

- Systems with `containers` → `true`
- Systems without containers → `false`
- Persons, containers, components → `false`

This matters for ELK layout: group nodes get larger default dimensions and ELK places their children as nested children in the ELK graph spec.

## `computeElkLayout` Tests

These are async tests using `vitest`'s `it` + `await` pattern. They construct a minimal `C4Diagram` and assert:

- All element IDs appear as keys in the returned `Map<string, LayoutPosition>`
- Each position has numeric `x`, `y`, `width`, `height` values
- Group nodes receive positions that accommodate their children
- External systems and persons are positioned without throwing

## Known Gaps

- Tests do not cover the ELK cancellation/race condition path introduced on 2026-04-10 — that logic lives in the `$effect` of `C4Diagram.svelte` and would require a component-level test with async timing.
- No snapshot tests for specific pixel positions; tests only verify structural correctness (all IDs present, values are numbers). This is appropriate given ELK's position output may shift with version changes.