---
{
  "title": "Switch Index — Public API Entry Point",
  "summary": "The switch index module re-exports the Switch component under both its canonical `Root` name and its human-readable `Switch` alias, following ripple's standard barrel file pattern for all UI widget modules.",
  "concepts": [
    "barrel file",
    "index module",
    "re-export",
    "Root alias",
    "Switch",
    "namespace import",
    "named import",
    "public API",
    "module organization",
    "bits-ui convention"
  ],
  "categories": [
    "ui",
    "switch",
    "module-organization"
  ],
  "source_docs": [
    "29fe3052a55b69e3"
  ],
  "backlinks": null,
  "word_count": 314,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

Like every other widget in the ripple component library, the Switch widget has a barrel index file that defines its public import surface. This one-file contract hides internal implementation details and supports both namespace-style and named-import consumption patterns.

```typescript
import Root from "./switch.svelte";

export {
  Root,
  //
  Root as Switch,
};
```

## The Dual-Export Pattern

Exporting the same component under two names serves different usage styles without any runtime cost (it's a pure compile-time alias):

**Namespace consumption** — used when multiple components from the same module are composed together, or when the file imports several widgets:

```typescript
import * as Switch from "$lib/components/ui/switch";
// Usage: <Switch.Root checked={...} />
```

**Direct named import** — used for standalone usage where the component name reads more naturally in the JSX:

```typescript
import { Switch } from "$lib/components/ui/switch";
// Usage: <Switch checked={...} />
```

Both export the same Svelte component instance — there is no difference in behavior or bundle size.

## Why `Root` as the Primary Name?

The `Root` name follows the bits-ui convention, where every compound component's primary element is called `Root`. This makes it immediately obvious which export is the entry point of a potentially multi-component widget (contrast with Table, which exports Root, Body, Cell, Footer, Head, Header, Row — each named clearly).

For Switch specifically, the component is a single-root widget (no sub-parts exported separately), so the index is intentionally minimal. If a `SwitchLabel` or `SwitchGroup` sub-component is added in the future, it would appear here as an additional export.

## Stability Guarantee

Because consumers import from `$lib/components/ui/switch` (the directory), the underlying file `switch.svelte` can be renamed, split, or restructured without breaking any import. Only this index file needs to be updated. This is the primary value of the barrel pattern in a monorepo component library.

## Known Gaps

None. The file is intentionally minimal and complete for a single-component widget.