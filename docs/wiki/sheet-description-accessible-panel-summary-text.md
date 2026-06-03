---
{
  "title": "Sheet Description — Accessible Panel Summary Text",
  "summary": "Renders the descriptive subtitle text inside a sheet panel with muted styling. It maps to bits-ui's `Dialog.Description`, which wires `aria-describedby` between this element and the sheet content so screen readers can announce the panel's purpose.",
  "concepts": [
    "sheet description",
    "aria-describedby",
    "Dialog.Description",
    "text-muted-foreground",
    "screen reader",
    "typographic hierarchy",
    "ARIA dialog pattern",
    "bits-ui",
    "data-slot",
    "accessibility"
  ],
  "categories": [
    "widget",
    "accessibility",
    "sheet",
    "typography"
  ],
  "source_docs": [
    "b82729533e821875"
  ],
  "backlinks": null,
  "word_count": 514,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Sheet Description component renders a short explanatory text block beneath the sheet title. Its primary purpose is accessibility: bits-ui's `Dialog.Description` primitive automatically wires the `aria-describedby` attribute on the sheet panel to point to this element's ID. This means screen readers announce the description text when a user first focuses into the sheet, giving context about the panel's purpose before they interact with its controls.

## Implementation

```svelte
<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SheetPrimitive.DescriptionProps = $props();
</script>

<SheetPrimitive.Description
  bind:ref
  data-slot="sheet-description"
  class={cn("text-muted-foreground text-sm", className)}
  {...restProps}
/>
```

## Why `aria-describedby` Matters

Without a description, a screen reader user opening a sheet hears only the title (from `SheetTitle`) and then encounters the interactive controls. The description provides the "why are you here" context — for example, "Update your account settings. Changes take effect immediately." This reduces cognitive load and helps users confirm they opened the correct panel before acting.

bits-ui handles the ID generation and `aria-describedby` wiring automatically. The developer only needs to include `<SheetDescription>` inside `<SheetContent>` — no manual `id` or `aria-describedby` attributes required.

## Visual Styling

- **`text-muted-foreground`** — Renders the description in a visually subdued color (typically gray) to create a typographic hierarchy: the `SheetTitle` reads as the primary heading, the description as secondary supporting text.
- **`text-sm`** — Small text further de-emphasizes the description, reserving visual prominence for the title and the sheet's primary controls.

Together these classes follow a standard modal/dialog text hierarchy: large heading → small muted description → interactive content.

## `DescriptionProps` Type

`SheetPrimitive.DescriptionProps` (which is `Dialog.DescriptionProps` from bits-ui) includes:

- All standard `HTMLParagraphElement` attributes
- `ref` for DOM access
- `asChild` — renders the description semantic into a custom element if needed

Props are forwarded via `restProps`, so callers can add `id`, `lang`, `aria-*`, or other attributes without modifying the component.

## Relationship to SheetTitle

`SheetTitle` and `SheetDescription` are a complementary pair that map to the ARIA dialog pattern:

```
SheetContent → aria-labelledby → SheetTitle
SheetContent → aria-describedby → SheetDescription
```

Both are optional from a technical standpoint — bits-ui does not throw if they are absent. But omitting `SheetTitle` produces an ARIA warning (unlabeled dialog) and omitting `SheetDescription` leaves screen reader users without contextual orientation.

## Usage Pattern

Typical placement inside `SheetHeader`:

```svelte
<SheetHeader>
  <SheetTitle>Account Settings</SheetTitle>
  <SheetDescription>
    Manage your profile, preferences, and security settings.
  </SheetDescription>
</SheetHeader>
```

The description should be kept short (1-2 sentences). Longer explanations belong in the sheet body, not the description.

## Known Gaps

- No truncation is applied. A very long description would expand the `SheetHeader` height without any visual cap. Application code should keep descriptions brief.
- The `text-sm` size is not configurable via a size prop. If the design system requires a larger description text in certain sheet contexts, callers must override via `className`.

## Summary

`SheetDescription` is a small component with an outsized accessibility impact. Its `text-muted-foreground text-sm` styling establishes visual hierarchy, while the bits-ui `Dialog.Description` primitive ensures that screen readers receive panel context automatically via `aria-describedby`.