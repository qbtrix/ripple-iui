---
{
  "title": "Display Widget Barrel Export",
  "summary": "The barrel export file for Ripple's display widget category, re-exporting all eleven display primitives through a single import path. This indirection layer lets consumers and the widget registry import from `./display/index.js` without tracking individual component file paths.",
  "concepts": [
    "barrel export",
    "module boundary",
    "widget registry",
    "display widgets",
    "import organization",
    "Svelte components",
    "TypeScript exports",
    "widget taxonomy",
    "code organization"
  ],
  "categories": [
    "architecture",
    "display",
    "module-organization"
  ],
  "source_docs": [
    "46aa2e0de97f4e3b"
  ],
  "backlinks": null,
  "word_count": 420,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/widgets/display/index.ts` is the entry point for Ripple's display widget category. It collects all display-oriented widgets under one module boundary, enabling clean single-line imports throughout the codebase.

## Exported Components

```typescript
export { default as Text } from './Text.svelte';
export { default as Heading } from './Heading.svelte';
export { default as Image } from './Image.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Progress } from './Progress.svelte';
export { default as Avatar } from './Avatar.svelte';
export { default as Metric } from './Metric.svelte';
export { default as Feed } from './Feed.svelte';
export { default as SoulStatus } from './SoulStatus.svelte';
export { default as Stat } from './Stat.svelte';
export { default as Skeleton } from './Skeleton.svelte';
```

Eleven components are exported, covering the full range of read-only display primitives Ripple supports.

## Why a Barrel File?

Without this file, the widget registry (`lib/widgets/index.ts`) would need to import each component with a direct path:

```typescript
import Text from './display/Text.svelte';
import Heading from './display/Heading.svelte';
// ... 9 more lines
```

The barrel collapses this to:

```typescript
import { Text, Heading, Image, ... } from './display/index.js';
```

More importantly, it establishes a stable module boundary. If a component is refactored into a subfolder or renamed internally, only this file needs updating — all consumers continue to import from `./display/index.js` without change.

## Display Category Definition

The components grouped here share a common trait: they are read-only display primitives. They render data but do not emit user input events (unlike widgets in `./input/`). The grouping reflects the Ripple widget taxonomy:

- **Text, Heading** — Typography primitives
- **Image, Avatar** — Media display
- **Badge, Progress** — Status and completion indicators
- **Metric, Stat** — Numeric KPI display
- **Feed** — List/stream display
- **SoulStatus** — Agent soul state display
- **Skeleton** — Loading placeholder

## Evolution Tracking

The presence of `SoulStatus` and `Skeleton` alongside older components like `Text` and `Image` shows that this barrel is a living list — new display primitives are added here as Ripple's widget set grows. Developers adding a new display widget must remember to register it both here and in `lib/widgets/index.ts` for it to be available to the spec parser.

## Known Gaps

- No explicit re-export of TypeScript types from display components (props interfaces). Consumers who need the prop types for type-safe wrapper components must import directly from the `.svelte` file.
- No version or changelog comment tracking which components were added when, making it harder to audit the history of the display category.