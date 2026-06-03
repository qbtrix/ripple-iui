---
{
  "title": "Sheet Component Index — Barrel Export for Slide-Out Panel System",
  "summary": "The barrel export for Ripple's Sheet (slide-out panel) component family. It exports all ten sub-components under both short primitive names and longer semantic `Sheet*` names, giving consumers the flexibility to import either style while maintaining a single source of truth.",
  "concepts": [
    "sheet",
    "slide-out panel",
    "drawer",
    "barrel export",
    "namespace import",
    "dual export pattern",
    "Dialog primitive",
    "compositional component",
    "ARIA modal",
    "bits-ui"
  ],
  "categories": [
    "widget",
    "overlay",
    "layout",
    "component-system"
  ],
  "source_docs": [
    "14661116f3618dee"
  ],
  "backlinks": null,
  "word_count": 597,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Sheet component is a slide-out panel (also called a drawer or side sheet) that animates in from any edge of the viewport. It is composed from ten distinct sub-components, each responsible for a specific structural layer or semantic region. This `index.ts` file is the single import entry point that exposes all ten parts under both short and long names.

## Sub-Components

| Component | Role |
|---|---|
| `Root` / `Sheet` | State container; owns `open` state |
| `Portal` / `SheetPortal` | Teleports content to `<body>` |
| `Trigger` / `SheetTrigger` | Button that opens the sheet |
| `Close` / `SheetClose` | Button that closes the sheet |
| `Overlay` / `SheetOverlay` | Backdrop scrim behind the sheet |
| `Content` / `SheetContent` | The panel itself; animated |
| `Header` / `SheetHeader` | Top region for title and description |
| `Footer` / `SheetFooter` | Bottom region for action buttons |
| `Title` / `SheetTitle` | Accessible panel heading |
| `Description` / `SheetDescription` | Accessible descriptive text |

## Dual Export Pattern

```typescript
export {
  Root,
  Close,
  Trigger,
  Portal,
  Overlay,
  Content,
  Header,
  Footer,
  Title,
  Description,
  //
  Root as Sheet,
  Close as SheetClose,
  Trigger as SheetTrigger,
  Portal as SheetPortal,
  Overlay as SheetOverlay,
  Content as SheetContent,
  Header as SheetHeader,
  Footer as SheetFooter,
  Title as SheetTitle,
  Description as SheetDescription,
};
```

The `//` comment separates the primitive short names (above) from the semantic long names (below). This is a Ripple-wide convention in all component index files.

### Short Names — Namespace Import

```typescript
import * as Sheet from "$lib/components/ui/sheet/index.js";

// Usage:
<Sheet.Root>
  <Sheet.Trigger />
  <Sheet.Content>
    <Sheet.Header>
      <Sheet.Title>Settings</Sheet.Title>
    </Sheet.Header>
    <Sheet.Footer>
      <Sheet.Close>Cancel</Sheet.Close>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
```

This is the recommended style for complex compositions. The `Sheet.` prefix makes it immediately obvious which component family each element belongs to, which is valuable when multiple component families (Dialog, Sheet, Drawer) might be present in the same file.

### Long Names — Destructured Import

```typescript
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "$lib/components/ui/sheet/index.js";
```

Useful for simpler sheets or in files where the component usage is isolated. The `Sheet` prefix in each name prevents naming collisions with non-sheet components.

## Why Ten Sub-Components

The Sheet is compositional rather than monolithic to support four key use cases:

1. **Custom trigger placement** — The trigger can live anywhere in the component tree; it doesn't need to be adjacent to the content.
2. **Headless composition** — Teams can use `Content` without `Header`/`Footer`, or swap in their own structural regions.
3. **ARIA correctness** — `Title` and `Description` are separate so bits-ui can wire `aria-labelledby` and `aria-describedby` on the content panel correctly.
4. **Overlay control** — `Overlay` is extracted so it can be conditionally omitted (e.g., a sheet that opens without a backdrop for sidebar navigation).

## Relationship to Dialog Primitive

The Sheet is implemented using bits-ui's `Dialog` primitive — not a Sheet-specific primitive. This is because a slide-out panel and a dialog share the same accessibility model: a modal region with a title, description, open/close state, focus trapping, and overlay. Sheet adds visual animations and edge positioning on top of Dialog's accessibility infrastructure.

## Known Gaps

- No TypeScript prop types are re-exported. Consumers needing prop types for individual sub-components must import from the specific `.svelte` file or from `bits-ui` directly.
- No default export is provided. Callers must use named imports.

## Summary

The Sheet index file provides a clean dual-export API for a ten-part compositional component. The namespace import pattern (`Sheet.*`) is preferred for readability; the long-name destructured pattern (`SheetContent`, etc.) provides compatibility with codebases that avoid namespace imports.