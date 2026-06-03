---
{
  "title": "Sheet Footer — Action Button Region at Panel Bottom",
  "summary": "A plain div-based layout region that anchors to the bottom of the sheet panel with `mt-auto`, providing a consistent placement for action buttons like Submit, Cancel, or Save. It is a pure layout primitive with no bits-ui dependency.",
  "concepts": [
    "sheet footer",
    "mt-auto",
    "flex-col layout",
    "bottom anchoring",
    "action buttons",
    "WithElementRef",
    "HTMLAttributes",
    "data-slot",
    "gap-2 spacing",
    "layout primitive"
  ],
  "categories": [
    "widget",
    "layout",
    "sheet"
  ],
  "source_docs": [
    "e9d622d076c8c2c8"
  ],
  "backlinks": null,
  "word_count": 591,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Sheet Footer is the structural container for action controls at the bottom of a sheet panel. Unlike the header, title, and description which connect to bits-ui's accessibility wiring, the footer is entirely layout-focused: it is a `<div>` with specific flex and spacing classes that ensure buttons always sit at the panel's bottom edge regardless of content height.

## Implementation

```svelte
<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="sheet-footer"
  class={cn("gap-2 p-4 mt-auto flex flex-col", className)}
  {...restProps}
>
  {@render children?.()}
</div>
```

## The `mt-auto` Pattern for Bottom Anchoring

`mt-auto` is the key layout rule. It works in combination with the `flex flex-col` layout on `SheetContent`:

```
SheetContent (flex flex-col)
  ├── children (fills available space, flex-grow)
  └── SheetFooter (mt-auto → pushed to bottom)
```

In a `flex-col` container, `mt-auto` consumes all remaining vertical space above the footer, effectively pinning it to the bottom of the panel. This means the footer always sits at the bottom edge regardless of whether the content area is small (a short confirmation sheet) or tall (a settings form).

Without `mt-auto`, the footer would appear immediately below the last content element — mid-panel for short content — which looks visually broken for action-button regions.

## No bits-ui Dependency

The footer does not wrap any primitive from bits-ui. There is no accessibility wiring needed for a layout container. Using `HTMLAttributes<HTMLDivElement>` directly gives callers the full set of standard `<div>` attributes (including ARIA attributes, event handlers, and data attributes) without any library abstraction overhead.

## `WithElementRef`

`WithElementRef<HTMLAttributes<HTMLDivElement>>` extends the props type to include `ref` — a typed bindable reference to the `HTMLDivElement` DOM node. This enables:

- Measuring the footer height for scroll calculations
- Programmatic scroll-into-view when the sheet opens
- Integration with form libraries that need direct DOM access

## Layout Classes

- **`flex flex-col`** — Stacks footer children vertically. This matches the common pattern of a sheet footer containing multiple buttons stacked in a column on mobile.
- **`gap-2`** — 8px between stacked children (buttons). Consistent with Ripple's button spacing conventions.
- **`p-4`** — 16px padding on all sides, matching `SheetHeader`'s padding for visual alignment.
- **`mt-auto`** — Pushes the footer to the panel bottom.

## `@render children?.()`

The optional chaining on `children?.()` means the footer renders an empty `<div>` gracefully if no children are provided. This prevents errors when the footer is included in a sheet composition but populated conditionally.

## Typical Usage

```svelte
<SheetContent>
  <SheetHeader>...</SheetHeader>
  <!-- main content area -->
  <SheetFooter>
    <SheetClose asChild>
      <Button variant="outline">Cancel</Button>
    </SheetClose>
    <Button type="submit">Save Changes</Button>
  </SheetFooter>
</SheetContent>
```

The footer is the canonical location for confirmation/cancellation buttons in a sheet. Placing buttons here (rather than inline in the content area) ensures they are always discoverable at the bottom of the panel.

## Known Gaps

- The `flex-col` direction means buttons are stacked vertically by default. On desktop, a row layout (`flex-row justify-end`) is often more appropriate. Callers must override via `className` to achieve horizontal button rows.
- No sticky/fixed behavior: if the sheet content overflows vertically, the footer scrolls with the content. A `sticky bottom-0` variant would be useful for sheets with long scrollable body content.

## Summary

`SheetFooter` is a focused layout component whose most important feature is `mt-auto`: the single class that ensures action buttons always appear at the panel bottom. Its lack of library dependencies and full `HTMLDivElement` prop support make it the most flexible component in the Sheet family.