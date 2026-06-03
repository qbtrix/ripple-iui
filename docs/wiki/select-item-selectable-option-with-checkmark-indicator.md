---
{
  "title": "Select Item — Selectable Option with Checkmark Indicator",
  "summary": "A styled selectable option for the select dropdown that renders a checkmark when selected and accepts either a `label` string, a `value` fallback, or a custom children snippet with access to `selected` and `highlighted` state. It handles all interactive states — hover, keyboard highlight, selected, disabled — through Tailwind data-attribute variants.",
  "concepts": [
    "select item",
    "CheckIcon",
    "data-highlighted",
    "snippet render props",
    "RTL support",
    "end-2 logical property",
    "SVG size guard",
    "label/value fallback",
    "bits-ui SelectItem",
    "ARIA option"
  ],
  "categories": [
    "widget",
    "form",
    "interaction"
  ],
  "source_docs": [
    "d2dadf108fda6c27"
  ],
  "backlinks": null,
  "word_count": 427,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`select-item.svelte` is the workhorse of the select component family. It renders each individual option in the dropdown list, managing selected state display, keyboard highlight state, and custom rendering — all while maintaining correct ARIA option semantics.

## Flexible Content Rendering

The component supports three rendering strategies, evaluated in priority order:

1. **Custom children snippet** — if `childrenProp` is provided, render it with `{ selected, highlighted }` context
2. **Label prop** — if no children but `label` is provided, render the label string
3. **Value fallback** — if neither, render `value` as display text

This hierarchy prevents blank items (a common bug in generated UIs where only `value` is passed without `label`). It also enables rich option rendering — icons, badges, descriptions — without needing a separate `ItemContent` sub-component.

## Checkmark Indicator Positioning

```svelte
<span class="absolute end-2 flex size-3.5 items-center justify-center">
  {#if selected}
    <CheckIcon class="cn-select-item-indicator-icon" />
  {/if}
</span>
```

The checkmark uses `end-2` (logical end, RTL-aware) rather than `right-2`. This ensures the indicator appears on the correct side in right-to-left languages without requiring a separate RTL stylesheet. The icon is conditionally rendered (not just hidden) to avoid screen readers announcing a decorative icon in the unselected state.

## State-Driven Styling

The item's class list handles five distinct interaction states:

| State | Trigger | Visual Change |
|---|---|---|
| Default | — | Transparent background |
| Highlighted | `data-highlighted` | `bg-accent`, `text-accent-foreground` |
| Focused | `focus:` | `bg-accent`, `text-accent-foreground` |
| Selected | In snippet via `selected` boolean | `CheckIcon` appears |
| Disabled | `data-[disabled]` | `pointer-events-none`, `opacity-50` |

Highlighted and focused produce identical visuals intentionally — keyboard navigation uses focus, mouse hover uses the highlight data attribute, and they should look the same to the user.

## SVG Icon Sizing

The class `[&_svg:not([class*='size-'])]:size-4` applies a default size of 16px to any SVG inside the item that doesn't already have a size class. This prevents icon blowup when consumers embed `lucide-svelte` icons in custom children without specifying a size — a common oversight that would otherwise produce oversized icons without this defensive rule.

## Props

- **`value`** (`string`): The machine-readable value submitted on selection.
- **`label`** (`string | undefined`): Human-readable display text. Falls back to `value` if absent.
- **`ref`** (bindable): DOM reference to the item element.
- **`class`**: Merged via `cn` over extensive base classes.
- **`children`**: Optional snippet receiving `{ selected, highlighted }`.
- **`...restProps`**: Forwarded to `SelectPrimitive.Item` — includes `disabled`.

## Known Gaps

No known gaps. The label/value fallback chain and the RTL-aware `end-2` positioning are both well-considered defensive patterns.