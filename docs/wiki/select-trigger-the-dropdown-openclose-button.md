---
{
  "title": "Select Trigger — The Dropdown Open/Close Button",
  "summary": "The visible button element users click to open or close a select dropdown. It combines value display, size variants, validation states, and a chevron icon into a single polished interactive control that integrates with bits-ui's accessibility layer.",
  "concepts": [
    "select trigger",
    "size variant",
    "aria-invalid",
    "focus-visible ring",
    "data-size attribute",
    "ChevronDownIcon",
    "line-clamp",
    "bits-ui TriggerProps",
    "disabled state",
    "select-none"
  ],
  "categories": [
    "widget",
    "select",
    "form",
    "accessibility"
  ],
  "source_docs": [
    "afce0d77a94b51f9"
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

The Select Trigger is the entry point to the entire select interaction. It is the only always-visible part of a select — the rest (portal, content, items) only render when the trigger is activated. Getting the trigger right means ensuring correct keyboard navigation, form validation feedback, size consistency, and accessible state communication.

## Implementation

```svelte
<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";
  import { cn, type WithoutChild } from "$lib/utils.js";
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

  let {
    ref = $bindable(null),
    class: className,
    children,
    size = "default",
    ...restProps
  }: WithoutChild<SelectPrimitive.TriggerProps> & {
    size?: "sm" | "default";
  } = $props();
</script>

<SelectPrimitive.Trigger
  bind:ref
  data-slot="select-trigger"
  data-size={size}
  class={cn("... long class list ...", className)}
  {...restProps}
>
  {@render children?.()}
  <ChevronDownIcon class="text-muted-foreground size-4 pointer-events-none" />
</SelectPrimitive.Trigger>
```

## Size Variants

The trigger supports two sizes controlled by the `size` prop:

- **`default`** — `h-8` (32px), `rounded-lg`, standard padding
- **`sm`** — `h-7` (28px), `rounded-[min(var(--radius-md),10px)]` (capped radius)

Sizes are applied via `data-size={size}` and targeted with `data-[size=default]:h-8` / `data-[size=sm]:h-7` Tailwind variants rather than conditional class strings. This approach keeps the Tailwind class list declarative and avoids JavaScript branching for visual-only decisions.

The `sm` size uses `min(var(--radius-md),10px)` as its border radius. The `min()` cap prevents the radius from exceeding 10px when the global radius token is large — ensuring the small trigger never looks over-rounded at small heights.

## Validation State Styling

The trigger applies `aria-invalid` styling automatically:

- **Ring color**: `aria-invalid:ring-destructive/20` (light), `dark:aria-invalid:ring-destructive/40` (dark)
- **Border color**: `aria-invalid:border-destructive`

This means form libraries that set `aria-invalid="true"` on invalid fields will automatically surface red visual feedback without any additional prop or class wiring. The destructive color token adapts to light/dark mode.

## Focus Ring

`focus-visible:border-ring` and `focus-visible:ring-ring/50 focus-visible:ring-3` apply a 3px focus ring in the system ring color when the trigger is focused via keyboard. The `focus-visible` pseudo-class (rather than `:focus`) ensures the ring only appears during keyboard navigation — mouse clicks do not show the ring, which is the expected browser UX pattern.

## Value Display

The `children` slot renders the selected value text via the `SelectValue` sub-component. The trigger applies these rules to `[data-slot=select-value]` children:

- `flex` and `gap-1.5` for icon+text combinations
- `line-clamp-1` to truncate long values to a single line
- `items-center` for vertical alignment

These rules are scoped to `*:data-[slot=select-value]` so they do not affect any other children unintentionally.

## Chevron Icon

The `ChevronDownIcon` is hardcoded as the trailing icon. `pointer-events-none` prevents the icon from intercepting click events that should bubble to the trigger button. The icon uses `text-muted-foreground` to visually de-emphasize it relative to the selected value text.

## Disabled State

`disabled:cursor-not-allowed disabled:opacity-50` communicates disabled state to users without requiring any JavaScript. The `cursor-not-allowed` cursor provides an immediate visual signal; `opacity-50` dims the entire trigger. bits-ui ensures the trigger is not keyboard-focusable when disabled.

## `select-none` Prevention

The `select-none` class prevents text selection on the trigger. Without this, a slow click-drag on the trigger would select the value text, which looks broken in a button context.

## Known Gaps

- No `size="lg"` variant is defined. If Ripple grows to need a large select (e.g., in a hero filter bar), a third size must be added explicitly.
- The `WithoutChild` type excludes the `child` render prop pattern. Callers who want full control over the inner DOM must use bits-ui's `SelectPrimitive.Trigger` directly.

## Summary

`SelectTrigger` bundles size variants, validation feedback, focus management, value display rules, and chevron rendering into a single cohesive component. The heavy use of `data-*` attribute selectors keeps the class list declarative and the component's behavior deterministic across all form states.