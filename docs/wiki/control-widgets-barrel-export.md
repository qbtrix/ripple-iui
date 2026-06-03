---
{
  "title": "Control Widgets Barrel Export",
  "summary": "Barrel file that aggregates Ripple's structural control-flow widgets — `If` and `Each` — under a single import path. These two widgets form the core of Ripple's declarative conditionals and list rendering in schema-driven UIs.",
  "concepts": [
    "barrel export",
    "control flow",
    "If widget",
    "Each widget",
    "schema primitives",
    "declarative rendering",
    "module organization"
  ],
  "categories": [
    "module",
    "control",
    "barrel"
  ],
  "source_docs": [
    "ca2a53d7f7ec52d1"
  ],
  "backlinks": null,
  "word_count": 306,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

The `control/` directory houses widgets that represent programming constructs rather than visual elements. Unlike display or data widgets that render content, control widgets shape the structure of what gets rendered — gating content behind conditions (`If`) or repeating it over collections (`Each`).

The barrel consolidates these under one import:

```typescript
export { default as If } from './If.svelte';
export { default as Each } from './Each.svelte';
```

## What Gets Exported

### `If`
Maps to a conditional branch in the spec tree. The schema engine evaluates the `condition` expression and renders children only when it is truthy.

### `Each`
Maps to a list iteration in the spec tree. The schema engine expands the `items` array into repeated child renders. The component itself is a passthrough — iteration happens in the engine before the component is invoked.

## Why a Dedicated `control/` Category?

Separating control-flow widgets from display and data widgets signals their distinct role to contributors. A developer looking to add a new layout widget should go to `display/`; a developer adding a new loop primitive should go to `control/`. The separation also makes it easy to audit the full set of control constructs available in Ripple specs without scanning unrelated files.

## Extension Points

Future control primitives that would naturally live here:
- `Switch` / `Match` — multi-branch conditional
- `While` or `Repeat` — bounded repetition
- `Await` — conditional rendering based on promise state
- `ErrorBoundary` — catch and display render errors

All would follow the same pattern: thin Svelte wrappers that name a schema-level construct while delegating the actual logic to the schema engine or Svelte's own primitives.

## Known Gaps

No current gaps in the barrel itself, but the control vocabulary is minimal. Only two constructs are available. Any spec requiring multi-branch conditionals must simulate them with multiple `If` nodes.