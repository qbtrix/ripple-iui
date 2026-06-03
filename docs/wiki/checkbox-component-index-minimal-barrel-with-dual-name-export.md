---
{
  "title": "Checkbox Component Index — Minimal Barrel with Dual-Name Export",
  "summary": "The checkbox `index.ts` barrel re-exports the single `checkbox.svelte` component under both `Root` and `Checkbox` names. This follows the ripple dual-export convention, allowing both namespace-style and direct-import usage with minimal boilerplate.",
  "concepts": [
    "checkbox barrel",
    "dual-name export",
    "Root export",
    "namespace import",
    "SvelteKit $lib",
    "barrel file",
    "import ergonomics",
    "single-component barrel",
    "shadcn-style pattern",
    "future extensibility"
  ],
  "categories": [
    "widget",
    "form",
    "module-system"
  ],
  "source_docs": [
    "39b322ab4a26c63f"
  ],
  "backlinks": null,
  "word_count": 277,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

```typescript
import Root from "./checkbox.svelte";
export {
  Root,
  Root as Checkbox,
};
```

This is the smallest possible barrel file for a single-component module. The checkbox system has only one component (unlike the card system's seven), so the barrel's role is purely about import ergonomics rather than assembly.

## Why a Barrel for a Single Component

Even with one component, the barrel provides several benefits:

1. **Stable import path** — consumers import from `"$lib/components/ui/checkbox"` rather than `"$lib/components/ui/checkbox/checkbox.svelte"`. If the file is ever renamed or refactored internally, only the barrel changes.

2. **Namespace compatibility** — `import * as Checkbox from "$lib/components/ui/checkbox"` gives `Checkbox.Root` for usage like `<Checkbox.Root />`, matching the bits-ui and shadcn-style idiom where the root element of a component system is always accessed via `.Root`.

3. **Future extensibility** — if sub-components are added (e.g. `CheckboxGroup`, `CheckboxLabel`), they can be added to this barrel without breaking any existing import sites.

## Dual Export Rationale

`Root as Checkbox` allows destructured import:

```typescript
import { Checkbox } from "$lib/components/ui/checkbox";
// <Checkbox /> — familiar direct usage
```

And `Root` allows namespace import:

```typescript
import * as Checkbox from "$lib/components/ui/checkbox";
// <Checkbox.Root /> — explicit root semantics
```

Both resolve to the same component, so there's no behavioral difference — only stylistic preference.

## Conventions Alignment

This barrel follows the same pattern used by card, chart, dialog, and all other ripple UI components. Consistency across the component library means developers can predict the import path for any component without checking documentation: `"$lib/components/ui/<component-name>"` always works, and both `Root` and the PascalCase component name are always available.

## Known Gaps

None. The barrel is intentionally minimal for a single-component system.
