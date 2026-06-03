---
{
  "title": "Select Group Heading — Accessible Label for Option Groups",
  "summary": "A styled wrapper around bits-ui's `SelectPrimitive.GroupHeading` that renders small, muted text as a non-interactive section header within grouped select options. It links to its parent `SelectGroup` via ARIA and is excluded from the keyboard navigation sequence.",
  "concepts": [
    "select group heading",
    "ARIA optgroup",
    "group label",
    "text-muted-foreground",
    "text-xs",
    "SelectGroup",
    "screen reader",
    "non-interactive",
    "bits-ui GroupHeading",
    "semantic HTML"
  ],
  "categories": [
    "widget",
    "form",
    "accessibility"
  ],
  "source_docs": [
    "1501faeabf7c8f84"
  ],
  "backlinks": null,
  "word_count": 390,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`select-group-heading.svelte` renders the visible label that appears above a group of related select options. It is a purely semantic element — users cannot select it, it does not respond to keyboard events, and it exists primarily to communicate structure to sighted users and screen readers.

## Why a Separate Heading Component

A common mistake in dropdown implementations is using a visually styled but semantically meaningless `div` as a group label. The problem: screen readers announce all text in the option list, so a plain div label gets read out as if it were an option, confusing users who hear "Fruits" and wonder if it is selectable.

The `SelectPrimitive.GroupHeading` from bits-ui renders with `aria-hidden` or as a proper `optgroup`-equivalent element depending on the rendering strategy, ensuring screen readers treat it as a structural label rather than a selectable option. This wrapper preserves that semantic behavior while adding Ripple's visual styling.

## Visual Styling

```svelte
<SelectPrimitive.GroupHeading
  class={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
  ...
>
```

The heading uses:
- **`text-muted-foreground`** — reduced contrast to visually differentiate from selectable options
- **`text-xs`** — smaller text size signals hierarchy (heading < option)
- **`px-2 py-1.5`** — horizontal padding aligns with option text; vertical padding creates breathing room

This styling follows the same visual language as `SelectLabel` but is semantically distinct — `GroupHeading` is always inside a `SelectGroup` and labels that specific group.

## Props

- **`ref`** (bindable): DOM reference to the heading element.
- **`class`**: Merged via `cn` over the base styling. Allows overriding colors, size, or spacing for custom themes.
- **`children`** (snippet): The heading text. Optional chaining (`children?.()`) prevents errors if no children are passed.
- **`...restProps`**: Any additional HTML attributes forwarded to the primitive.

## Relationship to SelectGroup

In a properly composed select, the heading must be a direct child of `SelectGroup`:

```svelte
<SelectGroup>
  <SelectGroupHeading>Fruits</SelectGroupHeading>
  <SelectItem value="apple">Apple</SelectItem>
  <SelectItem value="banana">Banana</SelectItem>
</SelectGroup>
```

The bits-ui primitive associates the heading with the group via `aria-labelledby` on the group container, so screen readers announce the group label before reading its options.

## Difference from SelectLabel

`SelectLabel` (`select-label.svelte`) is a standalone label not tied to a group — it can appear anywhere in the content panel. `SelectGroupHeading` is specifically for labeling a `SelectGroup` and participates in the ARIA group association. They look visually similar but serve different structural purposes.

## Known Gaps

No known gaps.