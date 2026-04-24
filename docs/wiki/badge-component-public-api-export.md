---
{
  "title": "Badge Component Public API Export",
  "summary": "The badge index file is a minimal barrel that re-exports the Badge component and its variant utilities from the single implementation file. It provides the stable import path for the Badge family and makes the `badgeVariants` function and `BadgeVariant` type available for external use.",
  "concepts": [
    "barrel export",
    "badge component",
    "badgeVariants",
    "BadgeVariant",
    "default export",
    "named export",
    "tailwind-variants",
    "type re-export",
    "generative UI",
    "component API"
  ],
  "categories": [
    "widget",
    "label",
    "component-api"
  ],
  "source_docs": [
    "1dc9eba432869188"
  ],
  "backlinks": null,
  "word_count": 348,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/components/ui/badge/index.ts` is the simplest form of a barrel export in Ripple's UI component library. With only two lines of exports, it is far smaller than the avatar barrel — reflecting that the badge system is a single component rather than a family.

```typescript
export { default as Badge } from "./badge.svelte";
export { badgeVariants, type BadgeVariant } from "./badge.svelte";
```

## Why Two Separate Export Lines

The `default` export of `badge.svelte` (the Svelte component) and the named exports (`badgeVariants`, `BadgeVariant`) require separate export statements. The `export { default as Badge }` syntax is the standard way to re-export a Svelte component's default export with a meaningful name. Named module-level exports from the `<script lang="ts" module>` block are re-exported separately.

This separation also makes clear which exports are component instances vs. utilities. Someone who only needs to compute badge class strings programmatically (e.g., Ripple's generative UI layer building a widget descriptor) can import just `badgeVariants` without pulling in the component.

## Why Export `badgeVariants` at This Level

In Ripple's architecture, AI-generated widget descriptors often need to enumerate valid variants before any component is mounted. Exporting `badgeVariants` (the `tv()` instance) at the barrel level means the runtime's schema inspector can call `badgeVariants.variants` to enumerate all valid variant keys (`default`, `secondary`, `destructive`, `outline`, `ghost`, `link`) without rendering anything.

## Why Export `BadgeVariant` as a Type

TypeScript consumers who accept a badge variant as a parameter need the type:

```typescript
function renderBadge(variant: BadgeVariant) { ... }
```

Without this type re-export, they would need to import from `./badge.svelte` directly, exposing implementation details and coupling to internal paths.

## No Dual-Alias Pattern

Unlike the alert and avatar barrels, badge does not export both `Root` and `Badge` aliases. This is because the badge system has a single component (no sub-component family), so the primitive/alias split adds no value.

## Known Gaps

No TODOs or FIXMEs. The badge barrel does not export `Props` — a pattern present in the button barrel. Consumers who need the badge's prop type for wrapping components must import the component and use `ComponentProps<typeof Badge>` from Svelte's utility types.