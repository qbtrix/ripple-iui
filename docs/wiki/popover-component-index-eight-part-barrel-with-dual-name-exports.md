---
{
  "title": "Popover Component Index — Eight-Part Barrel with Dual-Name Exports",
  "summary": "The public entry point for Ripple's popover system. Exports all eight sub-components under both short and prefixed naming conventions, mirroring the structure of the dialog index and enabling flexible, collision-free imports.",
  "concepts": [
    "barrel file",
    "dual export",
    "popover subsystem",
    "component registry",
    "non-modal",
    "bits-ui",
    "TypeScript index",
    "import ergonomics",
    "tree-shaking"
  ],
  "categories": [
    "popover",
    "module-system",
    "ui-component"
  ],
  "source_docs": [
    "8d70adde101a522c"
  ],
  "backlinks": null,
  "word_count": 284,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`popover/index.ts` is the barrel file that consolidates the popover component family into a single import point. It follows the identical dual-export convention used by the dialog index — short names for destructured usage, prefixed names to avoid collisions in multi-component files.

## Component Inventory

| Short Export | Prefixed Export | Role |
|-------------|-----------------|------|
| `Root` | `Popover` | Context root, owns open state |
| `Trigger` | `PopoverTrigger` | Element that opens the popover |
| `Portal` | `PopoverPortal` | Teleports content to body |
| `Content` | `PopoverContent` | Floating panel with animations |
| `Header` | `PopoverHeader` | Title/description container |
| `Title` | `PopoverTitle` | Heading text |
| `Description` | `PopoverDescription` | Supporting text |
| `Close` | `PopoverClose` | Dismiss button |

The popover has eight parts compared to the dialog's ten — it omits `Overlay` (no backdrop) and `Footer` (no action bar convention).

## Relationship to the Dialog System

Popover and Dialog share structural DNA: both wrap bits-ui primitives, both use the same portal/content/trigger/close pattern, and both use identical export conventions. The key behavioral difference is that popovers are non-modal (they do not trap focus or show a backdrop) while dialogs are modal.

Because the export conventions are identical, a developer who knows the dialog system can use the popover system immediately without consulting docs — the same `Root`, `Content`, `Trigger`, `Portal`, `Close` vocabulary applies.

## Import Patterns

```typescript
// Named imports with prefixed aliases (no collision risk)
import { PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";

// Short names when using only popover in the file
import { Root, Content, Trigger } from "$lib/components/ui/popover";
```

## Known Gaps

None. This is a standard Ripple barrel file.