---
{
  "title": "Schema Package Barrel — Public Schema Exports",
  "summary": "The `lib/schema/index.ts` barrel re-exports every public type and validator from the four schema modules as a single import surface. Consumers import from `@ripple-ui/svelte/schema` (or equivalent) without needing to know which sub-file holds a given type.",
  "concepts": [
    "barrel export",
    "schema package",
    "UISpec",
    "UniversalSpec",
    "EventHandler",
    "WidgetType",
    "re-export",
    "module encapsulation",
    "import surface"
  ],
  "categories": [
    "schema",
    "module-organization"
  ],
  "source_docs": [
    "11249417875fc2f2"
  ],
  "backlinks": null,
  "word_count": 286,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/schema/index.ts` is a four-line barrel file:

```typescript
export * from './event-handler.js';
export * from './widget-types.js';
export * from './ui-spec.js';
export * from './universal-spec.js';
```

Its purpose is pure ergonomics and encapsulation. Without it, consumers would need four separate import paths to use types that logically belong together as "the Ripple schema". The barrel turns the schema layer into a single coherent module.

## Why Barrels Matter Here

The schema folder contains inter-dependent types that evolved over time — `UISpec` (Gen 1) and `UniversalSpec` (Gen 2) both need to be importable side-by-side for backwards compatibility, yet they reference shared sub-schemas like `UINode`, `ThemeOverrides`, `DataFetcher`, and `EventHandlerOrArray`. A barrel lets the internal dependency graph remain complex while presenting a flat surface.

Consumers of the streaming module, the intent engine, and widget components all import from the schema barrel rather than individual files. This means if a type moves between sub-files in a refactor, only the barrel (and possibly re-export order) needs updating — no consumer import paths break.

## Re-export Order

The order `event-handler` → `widget-types` → `ui-spec` → `universal-spec` follows the dependency graph bottom-up:

1. `event-handler` — no schema dependencies
2. `widget-types` — no schema dependencies
3. `ui-spec` — depends on `event-handler`
4. `universal-spec` — depends on `ui-spec`

This ordering avoids potential issues with circular re-exports if bundlers process exports in declaration order.

## What Is Exported

From `event-handler`: `EventAction`, `EventHandler`, `EventHandlerOrArray`, and all individual handler types.

From `widget-types`: `WidgetType` enum, `WIDGET_CATEGORIES` map.

From `ui-spec`: `UINode`, `UISpec`, `DataFetcher`, `ThemeOverrides`, `parseUISpec`, `safeParseUISpec`.

From `universal-spec`: `UniversalSpec`, `IntentType`, `LifecycleType`, `LifecycleConfig`, `parseUniversalSpec`, `safeParseUniversalSpec`, `normalizeSpec`.

## Known Gaps

No known gaps — this file is intentionally minimal. Its surface area is dictated entirely by the four source modules it aggregates.