---
{
  "title": "Select Label — Standalone Descriptive Label for Select Content Panels",
  "summary": "A plain `div`-based label component for use within select content panels, rendering small muted text without any bits-ui backing. It differs from `SelectGroupHeading` in that it is not associated with a group via ARIA and serves as a freestanding visual annotation rather than a semantic section header.",
  "concepts": [
    "select label",
    "text-muted-foreground",
    "text-xs",
    "non-interactive label",
    "WithElementRef",
    "HTMLAttributes",
    "data-slot",
    "freestanding annotation",
    "TypeScript intersection type",
    "cn utility"
  ],
  "categories": [
    "widget",
    "form",
    "typography"
  ],
  "source_docs": [
    "43aceec4e5f7b42b"
  ],
  "backlinks": null,
  "word_count": 382,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`select-label.svelte` is a simple styled text element used inside `SelectContent` to annotate sections or provide contextual descriptions that are not group headings. Unlike `SelectGroupHeading`, it has no bits-ui primitive backing — it is a plain `div` rendered with Ripple's standard utility classes.

## Structural vs Semantic Labeling

The select content area supports two types of non-selectable text:

1. **`SelectGroupHeading`** — semantically tied to a `SelectGroup` via ARIA. Screen readers announce it as a group label.
2. **`SelectLabel`** — freestanding text. Has no ARIA group association. Used for top-level annotations, "Recently used" banners, or instructional text.

This component covers the second use case. Because it is a `div` with no ARIA role, screen readers will typically not announce it during keyboard navigation through the option list (the focus sequence skips non-interactive elements). This is appropriate for decorative or supplementary labels that do not need to be announced on every interaction.

## Component Structure

```svelte
<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {} = $props();
</script>

<div
  bind:this={ref}
  data-slot="select-label"
  class={cn("text-muted-foreground px-1.5 py-1 text-xs", className)}
  {...restProps}
>
  {@render children?.()}
</div>
```

## Visual Styling

- **`text-muted-foreground`** — reduced-contrast text that reads as secondary information
- **`text-xs`** — smaller than option text, reinforcing secondary hierarchy
- **`px-1.5 py-1`** — slightly tighter padding than `SelectGroupHeading`'s `px-2 py-1.5`

The subtle padding difference is intentional: `SelectLabel` is designed as an inline annotation that sits flush with the content flow, while `SelectGroupHeading` has more breathing room to signal group boundaries.

## The Empty Intersection Type

The props type `WithElementRef<HTMLAttributes<HTMLDivElement>> & {}` appears to intersect with an empty object type. This is a TypeScript pattern to force excess property checking at the call site — without it, TypeScript may be more lenient about accepting props that don't match the type. The `& {}` tightens the type constraint without adding new properties.

## Usage Example

```svelte
<SelectContent>
  <SelectLabel>Recently used</SelectLabel>
  <SelectItem value="last-option">Last Option</SelectItem>
  <SelectSeparator />
  <SelectGroup>
    <SelectGroupHeading>All Options</SelectGroupHeading>
    <SelectItem value="a">Option A</SelectItem>
  </SelectGroup>
</SelectContent>
```

## Known Gaps

The component renders as a `div` with no ARIA role. Depending on the use case, consumers may want to add `aria-label` or `role="presentation"` to explicitly control how assistive technology handles this element.