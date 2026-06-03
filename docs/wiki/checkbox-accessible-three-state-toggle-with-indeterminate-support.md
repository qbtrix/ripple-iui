---
{
  "title": "Checkbox — Accessible Three-State Toggle with Indeterminate Support",
  "summary": "The Checkbox component wraps bits-ui's `Checkbox.Root` primitive to provide a fully accessible toggle with three visual states: unchecked, checked, and indeterminate. It uses lucide icons as indicators and applies extensive Tailwind classes for focus rings, validation states, and disabled group context.",
  "concepts": [
    "checkbox",
    "bits-ui",
    "indeterminate state",
    "three-state checkbox",
    "focus-visible",
    "aria-invalid",
    "group-has-disabled",
    "touch target",
    "data-checked",
    "lucide icons"
  ],
  "categories": [
    "widget",
    "form",
    "accessibility"
  ],
  "source_docs": [
    "529905d5acc661b4"
  ],
  "backlinks": null,
  "word_count": 407,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`checkbox.svelte` is a styled, accessible checkbox built on bits-ui's headless `Checkbox.Root`. It renders a small square control that transitions between unchecked, checked (checkmark), and indeterminate (minus) states, with full keyboard navigation and ARIA semantics provided by the primitive.

## Three-State Model

```svelte
let {
  checked = $bindable(false),
  indeterminate = $bindable(false),
  ...
};
```

Both `checked` and `indeterminate` are bindable, enabling parent components to control and observe state. The indeterminate state represents a partial selection — used in "select all" patterns where some but not all children are checked. Without explicit indeterminate support, consumers would need to fake it with visual hacks rather than proper ARIA state.

The icon selection is determined by slot state:
```svelte
{#snippet children({ checked, indeterminate })}
  {#if checked}
    <CheckIcon />
  {:else if indeterminate}
    <MinusIcon />
  {/if}
{/snippet}
```

When neither `checked` nor `indeterminate` is true, nothing renders inside the indicator — the checkbox appears empty.

## Focus and Validation Ring System

The Tailwind class list encodes several state-dependent ring behaviors:

- `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3` — keyboard focus shows a colored border and semi-transparent outer ring, ensuring visibility without mouse-dependent `:focus` styling
- `aria-invalid:border-destructive` / `aria-invalid:ring-destructive/20` — when the checkbox is marked invalid (e.g. a required unchecked field), the border and ring turn red. The dark mode variants use slightly desaturated values to avoid harsh contrast.
- `aria-invalid:aria-checked:border-primary` — when both invalid and checked, the primary color overrides the destructive color, because a checked state resolves the validation error

## Extended Touch Target

```
after:absolute after:-inset-x-3 after:-inset-y-2
```

The `after:` pseudo-element extends the interactive area 12px horizontally and 8px vertically beyond the visible 16px box. This ensures the checkbox is easy to tap on mobile without increasing the visual footprint — a common accessibility pattern for small interactive targets.

## Group Disabled Context

```
group-has-disabled/field:opacity-50
```

This reads a `group/field` ancestor's disabled state. When a form field group is disabled, all checkboxes within automatically dim without needing individual `disabled` props threaded down. This prevents oversight errors in form groups where individual elements might miss the disabled prop.

## Checked State Styling

`data-checked:bg-primary data-checked:text-primary-foreground data-checked:border-primary` — bits-ui sets `data-checked` on the root when checked, which triggers the filled primary-colored background. Using `data-checked` rather than `:checked` works for both native checkbox semantics and the ARIA role-based implementation bits-ui uses.

## Known Gaps

None identified. The component handles all three states, focus visibility, validation states, touch targets, and group-disabled context within a single composable primitive.
