---
{
  "title": "Radio Group Root — Selection Container with Bindable Value",
  "summary": "The root container for a radio group, wrapping bits-ui's `RadioGroup.Root` to expose a two-way bindable `value` prop defaulting to an empty string. It renders as a full-width CSS grid with 8px gaps and provides the selection context that child `RadioGroupItem` components read from.",
  "concepts": [
    "radio group root",
    "bindable value",
    "controlled component",
    "uncontrolled component",
    "roving tabindex",
    "keyboard navigation",
    "ARIA radiogroup",
    "CSS grid layout",
    "bits-ui context",
    "form integration"
  ],
  "categories": [
    "widget",
    "form",
    "state-management"
  ],
  "source_docs": [
    "d6cebb7ec4ad6f87"
  ],
  "backlinks": null,
  "word_count": 389,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`radio-group.svelte` is the container component of the radio group composition. It manages which option is currently selected, coordinates keyboard navigation between items, and provides the ARIA `role="radiogroup"` container. Child `RadioGroupItem` components use shared context (set up by the bits-ui primitive) to know whether they are selected.

## Two-Way Binding Architecture

```svelte
let {
  ref = $bindable(null),
  class: className,
  value = $bindable(""),
  ...restProps
}: RadioGroupPrimitive.RootProps = $props();
```

The `value = $bindable("")` declaration enables both controlled and uncontrolled usage:

- **Uncontrolled** — no binding from parent; the group manages selection internally, starting with an empty string (nothing selected).
- **Controlled** — parent binds `bind:value={formField}` to synchronize selection with external state like a form store or reactive variable.

The empty string default (`""`) rather than `undefined` or `null` is intentional: it prevents TypeScript errors in contexts where `value` is passed to string comparisons, and it signals a "no selection" state that the bits-ui primitive handles correctly (no item will match an empty string value).

## Layout: Full-Width Grid

The root renders with `class="grid gap-2 w-full"`. This default layout:
- **`grid`** — stacks items vertically by default (single-column grid)
- **`gap-2`** — 8px spacing between items
- **`w-full`** — stretches to fill the container

Consumers can override with `grid-cols-2` or `grid-cols-3` via the `class` prop for horizontal layouts without fighting against flexbox constraints.

## Keyboard Navigation

The bits-ui primitive handles all keyboard navigation automatically:
- `ArrowDown` / `ArrowRight` — move to next item, wrapping
- `ArrowUp` / `ArrowLeft` — move to previous item, wrapping
- `Tab` — moves focus out of the group (only the selected item, or first item if none selected, is in the tab sequence)

This roving tabindex pattern is standard for radio groups per WAI-ARIA spec and prevents the group from consuming N tab stops for N items.

## Data Flow

```
RadioGroup.Root (provides context: value, onChange)
  └── RadioGroupItem (reads context: is this item selected?)
      └── Visual indicator shown/hidden based on checked state
```

## Integration with Forms

```svelte
<RadioGroup bind:value={formData.plan}>
  <RadioGroupItem value="free" />
  <RadioGroupItem value="pro" />
</RadioGroup>
```

The bound `value` automatically reflects user selection into `formData.plan`, enabling clean form integration without event handler boilerplate.

## Known Gaps

No known gaps. The empty string default is appropriate for most use cases, though consumers with typed value sets may want to override with a typed union.