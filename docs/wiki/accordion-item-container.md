---
{
  "title": "Accordion Item Container",
  "summary": "AccordionItem is a thin wrapper around the bits-ui `Accordion.Item` primitive that adds a bottom border to all items except the last, maintains a `data-slot` marker for styling, and exposes a `ref` binding. It is the structural unit that groups a trigger and its content panel.",
  "concepts": [
    "accordion",
    "bits-ui",
    "Accordion.Item",
    "data-slot",
    "Tailwind CSS",
    "not-last variant",
    "cn utility",
    "ref binding",
    "restProps"
  ],
  "categories": [
    "widget",
    "layout"
  ],
  "source_docs": [
    "0bab5a06dfaad612"
  ],
  "backlinks": null,
  "word_count": 445,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`accordion-item.svelte` represents a single collapsible section within an accordion. It does not manage open/close state itself — that is the responsibility of the parent `Accordion.Root` (or `accordion.svelte`). An `AccordionItem` binds a unique `value` prop (passed via `restProps`) that the root uses to track which sections are open.

## Visual Separation

The only styling added beyond the primitive is `not-last:border-b` — a Tailwind variant that applies a bottom border to every item except the final one. This creates a natural visual list without adding a top border to the first item or requiring the parent to handle separators.

This is preferable to adding `border-b` to every item and removing it with a `last:border-b-0` override because the `not-last:` variant avoids a specificity battle on the last item — the rule simply does not apply.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | `HTMLElement` (bindable) | Direct DOM reference to the rendered item element |
| `class` | `string` | Merged with the base class via `cn()` |
| `...restProps` | spread | Required: must include `value` (string) to identify the item to the root |

The `value` prop is not explicitly destructured — it flows through `restProps` to `Accordion.Item`. This is a deliberate choice: `AccordionPrimitive.ItemProps` already types `value` as required, so TypeScript will catch missing values at the call site.

## `data-slot` Attribute

`data-slot="accordion-item"` is set unconditionally. This attribute has two purposes:

1. **Theming hooks** — Parent components (like an accordion widget in the Ripple widget library) can use `**:data-[slot=accordion-item]:` Tailwind selectors to apply styles without additional class names.
2. **Test selectors** — Automated tests can query `[data-slot="accordion-item"]` without coupling to class names that might change.

## Rendering

The component renders as a self-closing `<AccordionPrimitive.Item />` — it passes no children snippet of its own. Children (the trigger and content) are passed by the caller directly as markup between the opening and closing `<AccordionItem>` tags, which bits-ui forwards to the underlying element.

## Use in Ripple Widget Specs

When Ripple renders an `accordion` spec node, `NodeRenderer` resolves the accordion widget component and passes children as snippets. The accordion widget implementation uses `AccordionItem` as the container for each section defined in the spec. The `value` for each item typically comes from the spec's item `id` or an index-based key, allowing the accordion widget to track open state reactively within the Ripple `StateManager`.

## Known Gaps

No known gaps. The component is intentionally minimal — all behavioral complexity lives in `Accordion.Root` and `Accordion.Content`. The only risk is that the `not-last:` Tailwind variant requires Tailwind v3.3+ or a custom variant definition. If the project uses an older Tailwind version, separators will not render.