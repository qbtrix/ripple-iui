---
{
  "title": "Dialog Component Index — Dual-Name Export Surface",
  "summary": "The public barrel file for the Ripple dialog system. It exports all ten sub-components under two naming conventions — short names (`Root`, `Title`, etc.) for destructured imports and prefixed names (`Dialog`, `DialogTitle`, etc.) for namespace imports — giving consumers flexibility in how they reference components.",
  "concepts": [
    "barrel file",
    "dual export",
    "tree-shaking",
    "named exports",
    "import ergonomics",
    "dialog subsystem",
    "namespace collision",
    "TypeScript index",
    "component registry"
  ],
  "categories": [
    "dialog",
    "module-system",
    "ui-component"
  ],
  "source_docs": [
    "9f5e95e83b0752b0"
  ],
  "backlinks": null,
  "word_count": 310,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`index.ts` is the single import point for the entire dialog subsystem. Instead of importing `dialog-content.svelte` directly, consumers import from `$lib/components/ui/dialog`, which resolves to this file. This barrel pattern is standard across Ripple's UI components.

## Dual Export Strategy

Every component is exported twice:

```typescript
export {
  Root,
  // ... short names

  Root as Dialog,
  // ... prefixed names
};
```

This dual export solves a real ergonomic tension:

**Short names** work well when destructuring in a file that only uses dialog components:
```typescript
import { Root, Content, Title } from "$lib/components/ui/dialog";
```

**Prefixed names** prevent naming collisions in files that import multiple component families:
```typescript
import { DialogContent, PopoverContent } from "..."; // no collision
```

Without the prefixed aliases, a file importing both `Dialog.Content` and `Popover.Content` would require manual renaming on every import, which is noisy and inconsistent.

## Component Inventory

| Export | Alias | Role |
|--------|-------|------|
| `Root` | `Dialog` | Context root, owns open state |
| `Portal` | `DialogPortal` | Teleports content to body |
| `Overlay` | `DialogOverlay` | Backdrop scrim |
| `Content` | `DialogContent` | Panel shell with close button |
| `Header` | `DialogHeader` | Title/description container |
| `Title` | `DialogTitle` | Accessible heading |
| `Description` | `DialogDescription` | Supporting text |
| `Footer` | `DialogFooter` | Action button area |
| `Trigger` | `DialogTrigger` | Open button |
| `Close` | `DialogClose` | Close/dismiss button |

## Why Not a Namespace Export?

An alternative would be `export * as Dialog from ...`, which would require callers to use `Dialog.Root`, `Dialog.Content`, etc. The current approach is preferred because it enables tree-shaking at the individual component level — bundlers can eliminate unused components without having to parse the entire namespace.

## Known Gaps

None. This is a standard Ripple barrel file with no logic — purely re-exports.