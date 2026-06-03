---
{
  "title": "UniversalSpec Schema — Gen 2 Intent-Based UI Specification",
  "summary": "UniversalSpec is Ripple's second-generation schema that replaces explicit component trees with high-level intent declarations. The layout engine and pattern detector consume a UniversalSpec to auto-select layouts and data renderers, while `normalizeSpec` provides a lossless migration path from Gen 1 UISpec documents.",
  "concepts": [
    "UniversalSpec",
    "IntentType",
    "LifecycleType",
    "LifecycleConfig",
    "normalizeSpec",
    "FieldMapping",
    "DisplayHints",
    "chain",
    "Gen 2 spec",
    "intent-based rendering",
    "backwards compatibility",
    "ephemeral",
    "persistent",
    "on_select",
    "on_complete"
  ],
  "categories": [
    "schema",
    "intent-engine",
    "state-management",
    "rendering"
  ],
  "source_docs": [
    "44a322a5c0c37c32"
  ],
  "backlinks": null,
  "word_count": 494,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/schema/universal-spec.ts` is the primary spec format for Ripple's AI-driven UI generation. Where `UISpec` (Gen 1) required authors to spell out the full component tree, `UniversalSpec` (Gen 2, version `'2.0'`) lets an AI declare intent (`'browse'`, `'form'`, `'detail'`, etc.) and supply data; the layout engine, pattern detector, and intent renderer handle the rest.

This decoupling is the core design bet of Gen 2: AI models are better at describing _what_ than _how_, and the rendering layer can make better layout decisions than an in-context AI prompt.

## Intent and Lifecycle

```typescript
export const IntentType = z.enum([
  'browse', 'select', 'detail', 'form', 'confirm',
  'info', 'search', 'action', 'custom', 'workspace', 'dashboard'
]);

export const LifecycleType = z.enum(['ephemeral', 'tool', 'persistent']);
```

`LifecycleType` controls how the rendered UI persists:

- `'ephemeral'` — inline, disappears after completion (default)
- `'tool'` — modal/panel, stays until dismissed
- `'persistent'` — pinned to sidebar or dashboard

`LifecycleConfig` extends this with optional `id`, `icon`, and `label` fields needed for the persistent/tool modes to track and display state.

## UniversalSpec Structure

```typescript
export const UniversalSpec = z.object({
  id: z.string().optional(),
  version: z.literal('2.0').default('2.0'),
  intent: IntentType,
  lifecycle: LifecycleConfig.optional().default({ type: 'ephemeral' }),
  title: z.string().optional(),
  description: z.string().optional(),
  theme: ThemeOverrides.optional(),
  data: z.union([z.record(z.string(), z.any()), DataFetcher]).optional(),
  fields: FieldMapping.optional(),
  display: DisplayHints.optional(),
  ui: UINode.optional(),
  selection: z.enum(['single', 'multiple', 'none']).default('none'),
  on_select: z.any().optional(),
  on_complete: z.any().optional(),
  chain: z.lazy(() => UniversalSpec).optional()
});
```

The `ui` field is optional (unlike in UISpec) — it is only needed for `intent: 'custom'` escape-hatch rendering. `chain` is a forward-declared next spec, enabling pre-loaded multi-step flows without round-trips.

`FieldMapping` tells the layout engine how to interpret data keys semantically: `{ title: 'name', image: 'thumbnail_url' }` maps generic field names to the actual keys in the data.

`DisplayHints` offers layout overrides (`auto`, `grid`, `list`, `masonry`, `carousel`, `hero`, `split`), column count, density, and an optional `item_template` UINode for fully custom item rendering within an auto-layout grid or list.

## normalizeSpec — Backwards Compatibility

```typescript
export function normalizeSpec(input: any): UniversalSpec
```

This is the migration bridge. It tries three paths in order:

1. **Valid UniversalSpec** — returns as-is.
2. **Legacy UISpec** — detected by having a `ui` field but no `intent`. Wraps it in `intent: 'custom'`, preserving `ui`, `data`, `theme`, and `state`.
3. **Unknown/invalid** — logs a warning and returns a minimal `custom` spec with an empty container node.

The third path exists to prevent a rendering crash from propagating to the user — an empty container is always safe to render, even if it looks blank.

## Circular Schema

The `chain` field creates a recursive `UniversalSpec → UniversalSpec` cycle, requiring a forward type declaration (`UniversalSpecType`) defined before the Zod schema to satisfy TypeScript's inference engine without circular type aliases.

## Known Gaps

- `on_select` and `on_complete` are typed as `z.any()` — their eventual schemas were deferred. The comment in source says "simplified action definition for now, can expand later."
- `normalizeSpec` preserves `state` from legacy specs but `UniversalSpec` has no `state` field — so the spread includes an unvalidated extra key that passes through without Zod enforcement.