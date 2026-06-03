---
{
  "title": "Spec Normalizer — UniversalSpec Input Coercion",
  "summary": "The normalizer transforms any raw spec input into a valid `UniversalSpec` object before rendering. It handles three input shapes: fully-formed `UniversalSpec` (pass-through), legacy `UISpec` format (has `ui` but no `intent`), and completely invalid input (returns a safe empty-container fallback).",
  "concepts": [
    "normalizeSpec",
    "UniversalSpec",
    "UISpec",
    "legacy migration",
    "spec validation",
    "intent",
    "lifecycle",
    "ephemeral",
    "input coercion",
    "renderer entry point"
  ],
  "categories": [
    "core",
    "schema",
    "normalization"
  ],
  "source_docs": [
    "7e0bf037805f59fe"
  ],
  "backlinks": null,
  "word_count": 514,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`normalizeSpec` is a lightweight input guard that runs before any spec reaches the rendering pipeline. It exists because Ripple accepts specs from multiple sources — AI-generated JSON, user-provided objects, deserialized storage — and each source may use different schema versions. Without normalization, the renderer would need to handle multiple shapes internally, scattering defensive checks throughout the codebase.

## Why Not Use Zod Here?

The file comment is explicit about this trade-off:

```typescript
/**
 * Lightweight — no Zod validation (that's expensive for reactive rendering).
 * Use parseUniversalSpec() separately if you need strict validation.
 */
```

Zod schema parsing is thorough but not free. For a reactive renderer that may re-evaluate specs on every state change, running full validation on each render cycle would be a performance problem. `normalizeSpec` performs only the minimum structural checks needed to produce a renderable output — Zod is reserved for explicit validation at the application boundary (e.g., when loading from storage or an API response).

## Three Input Shapes

### 1. Already a UniversalSpec (has `intent`)

```typescript
if (input.intent) {
  return input as UniversalSpec;
}
```

The simplest case: if the input already has an `intent` field, it is assumed to be a valid `UniversalSpec` and returned directly. No deep cloning or transformation occurs — this is a zero-cost pass-through for well-formed specs.

### 2. Legacy UISpec (has `ui`, no `intent`)

```typescript
if (input.ui) {
  return {
    version: '2.0',
    intent: 'custom',
    lifecycle: input.lifecycle ?? { type: 'ephemeral' },
    ui: input.ui,
    data: input.data,
    state: input.state,
    theme: input.theme,
    selection: 'none'
  } as UniversalSpec;
}
```

The legacy `UISpec` format had a `ui` node tree but no `intent`. The normalizer wraps it in a `UniversalSpec` shell with `intent: 'custom'`, preserving `lifecycle`, `data`, `state`, and `theme` if present. The `selection: 'none'` default prevents selection behavior from being accidentally activated on migrated specs.

### 3. Invalid Input (null, non-object, or unrecognized shape)

```typescript
return {
  version: '2.0',
  intent: 'custom',
  lifecycle: { type: 'ephemeral' },
  ui: { type: 'container', children: [] },
  selection: 'none'
} as UniversalSpec;
```

Any input that is null, not an object, or has neither `intent` nor `ui` returns a minimal valid `UniversalSpec` with an empty container UI. This prevents a renderer crash from a bad spec — the widget area will simply be blank rather than throwing an exception.

## Data Flow

```
Raw input (any)
  ↓
normalizeSpec()
  ↓
UniversalSpec (one of three cases above)
  ↓
Renderer / DashboardRenderer / IntentRenderer
```

`normalizeSpec` is typically called at the entry point of each renderer component, before any reactive derivation or widget tree traversal begins.

## Known Gaps

- The `'has intent'` check uses duck typing (`input.intent` truthy) rather than validating that the value is one of the known `IntentType` values. A spec with `intent: 'garbage_value'` would pass through unchanged.
- `selection` is hardcoded to `'none'` for both legacy and fallback cases. If a legacy spec relied on implicit selection behavior, this migration would silently change it.
- Deep structures in `input.data`, `input.state`, and `input.theme` are not cloned — mutations to the returned spec could affect the original input object.
