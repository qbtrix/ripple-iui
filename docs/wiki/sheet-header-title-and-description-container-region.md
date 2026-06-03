---
{
  "title": "Sheet Header — Title and Description Container Region",
  "summary": "A simple `\u003cdiv\u003e` layout region that groups the sheet's title and description into a consistently padded top section. Like `SheetFooter`, it is a pure layout primitive with no bits-ui dependency, relying on semantic composition rather than ARIA wiring.",
  "concepts": [
    "sheet header",
    "flex-col layout",
    "gap-0.5 spacing",
    "p-4 padding",
    "WithElementRef",
    "HTMLAttributes",
    "data-slot",
    "layout primitive",
    "title description grouping",
    "ARIA dialog"
  ],
  "categories": [
    "widget",
    "layout",
    "sheet"
  ],
  "source_docs": [
    "8b642ee861581390"
  ],
  "backlinks": null,
  "word_count": 618,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`SheetHeader` is the structural container for the top section of a sheet panel. It provides consistent padding and flex column layout so that `SheetTitle` and `SheetDescription` stack with proper vertical rhythm. The component has no accessibility wiring of its own — the ARIA relationships (`aria-labelledby`, `aria-describedby`) are established by the `SheetTitle` and `SheetDescription` components within it.

## Implementation

```svelte
<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="sheet-header"
  class={cn("gap-0.5 p-4 flex flex-col", className)}
  {...restProps}
>
  {@render children?.()}
</div>
```

## Structural Role in the Sheet

The sheet panel's vertical layout follows this structure:

```
SheetContent (flex flex-col, gap-4)
  ├── SheetHeader     (top section, defined height)
  │    ├── SheetTitle
  │    └── SheetDescription
  ├── [body content]  (fills remaining space)
  └── SheetFooter     (mt-auto, anchored to bottom)
```

`SheetHeader` occupies a fixed vertical region at the top. The `p-4` padding creates a clear visual separation between the panel's edge and the title text.

## Layout Classes

- **`flex flex-col`** — Stacks title and description vertically.
- **`gap-0.5`** — 2px gap between `SheetTitle` and `SheetDescription`. This is deliberately tight: the title and description are semantically related and should read as a single unit, not as two separate items. A larger gap would visually divorce them.
- **`p-4`** — 16px padding on all sides, matching `SheetFooter`'s `p-4`. Consistent padding creates a visual frame inside the panel.

## Comparison with SheetFooter

The two layout primitives are structural twins:

| Property | SheetHeader | SheetFooter |
|---|---|---|
| Layout | `flex flex-col` | `flex flex-col` |
| Padding | `p-4` | `p-4` |
| Gap | `gap-0.5` | `gap-2` |
| Anchoring | none (natural flow) | `mt-auto` |
| ARIA role | none | none |

The gap difference (`gap-0.5` vs `gap-2`) reflects their content: headers contain tightly related title+description text; footers contain distinct action buttons that benefit from more separation.

## No bits-ui Dependency

Like `SheetFooter`, the header is a raw `HTMLDivElement` wrapper. This is correct: the header is purely a layout grouping, not a semantically distinct ARIA region. Adding an `aria-role` or landmark to the header would be incorrect — a sheet panel should have one dialog landmark, not nested landmarks inside it.

## `WithElementRef` Pattern

The `ref = $bindable(null)` prop exposes the `HTMLDivElement` to parents. Typical use cases:

- Measuring header height to calculate available body scroll area
- Programmatically scrolling the header into view after dynamic content updates
- Integration testing assertions on header content

## `@render children?.()` — Optional Children

The optional render call means `SheetHeader` renders an empty padded `<div>` gracefully if children are omitted. This is defensive: in AI-generated sheet compositions, the header might be included in a template before its content is populated.

## `data-slot` Convention

`data-slot="sheet-header"` allows CSS rules to target the header without class-name coupling. For example:

```css
[data-slot='sheet-header'] {
  border-bottom: 1px solid var(--color-border);
}
```

This is how `SheetContent`'s internal styles could add a bottom border to the header region across all sheet usages without modifying the component.

## Known Gaps

- No `border-bottom` divider between the header and body is applied by default. Adding visual separation between the header and content requires `className` override or a global `data-slot` CSS rule.
- No `sticky` positioning: in sheets with very long body content, the header scrolls out of view. A sticky header variant would improve usability for long settings sheets.

## Summary

`SheetHeader` is a minimal layout container that establishes the visual top region of a sheet panel. Its `gap-0.5` tight spacing and `p-4` padding create the correct typographic and spatial relationship between the panel edge, title, and description.