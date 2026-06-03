---
{
  "title": "Accordion Trigger Button",
  "summary": "AccordionTrigger wraps the bits-ui `Accordion.Header` and `Accordion.Trigger` primitives to render the clickable row that expands or collapses an accordion item. It renders a chevron icon that switches between down and up variants based on the item's open state using CSS group-aria selectors.",
  "concepts": [
    "accordion",
    "bits-ui",
    "Accordion.Trigger",
    "Accordion.Header",
    "chevron icon",
    "group-aria-expanded",
    "Tailwind CSS",
    "named group variant",
    "heading level",
    "accessibility",
    "Lucide icons"
  ],
  "categories": [
    "widget",
    "layout"
  ],
  "source_docs": [
    "aa656c601de0c2dc"
  ],
  "backlinks": null,
  "word_count": 436,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`accordion-trigger.svelte` is the interactive header button of each accordion section. It composes `Accordion.Header` (for semantic HTML heading structure) and `Accordion.Trigger` (for accessible button behavior) from bits-ui, then adds the chevron icon indicator.

## Icon Switching Without JavaScript

The component imports both `ChevronDownIcon` and `ChevronUpIcon` from Lucide and renders both simultaneously:

```svelte
<ChevronDownIcon
  data-slot="accordion-trigger-icon"
  class="... group-aria-expanded/accordion-trigger:hidden"
/>
<ChevronUpIcon
  data-slot="accordion-trigger-icon"
  class="... hidden group-aria-expanded/accordion-trigger:inline"
/>
```

`ChevronDownIcon` is visible by default and hidden when the trigger's `aria-expanded` attribute is `true`. `ChevronUpIcon` is hidden by default and visible when `aria-expanded` is `true`. bits-ui manages the `aria-expanded` attribute on the trigger element; the group CSS selectors respond to it. This approach requires zero JavaScript — no `$derived` state, no `$effect`, no event listener — because the icon swap is a pure CSS rule.

The `/accordion-trigger` suffix on `group-aria-expanded/accordion-trigger:` is a Tailwind named group variant. It scopes the group selector to the accordion trigger's group, preventing interference if the trigger is nested inside another group-bearing element.

## Heading Level

The `level` prop (default `3`) is forwarded to `Accordion.Header`. This lets callers adjust the semantic heading level for accessibility and SEO. An accordion inside a `<main>` heading structure at `h2` level should use `level={3}` for its items; an accordion in a sidebar might use `level={4}`. Hardcoding `h3` would break documents with non-standard heading hierarchies.

## Accessibility

- The trigger has `focus-visible:ring-3` and `focus-visible:border-ring` for keyboard focus visibility.
- `disabled:pointer-events-none disabled:opacity-50` prevents interaction and provides visual feedback for disabled items.
- `aria-expanded` is managed by bits-ui's Accordion.Trigger — the component does not need to track open state itself.

## Styling

The trigger occupies the full width of its container (`flex flex-1`) with items spread between the text content and the chevron icon (`justify-between`). The icon receives `ml-auto` via the `**:data-[slot=accordion-trigger-icon]:ml-auto` selector, keeping it right-aligned regardless of label length. The `shrink-0` class on the icon containers prevents icon compression on narrow viewports.

## `data-slot` on Icons

Both icons carry `data-slot="accordion-trigger-icon"`. This serves a dual purpose: the trigger's base class uses `**:data-[slot=accordion-trigger-icon]:ml-auto` and `**:data-[slot=accordion-trigger-icon]:size-4` to apply consistent sizing and alignment to both icons without targeting them by element type or position. If additional icon variants are added in future (e.g., a custom `+/-` toggle), they only need to carry the same `data-slot` to inherit this layout.

## Known Gaps

Both icons are rendered in the DOM simultaneously (one hidden via CSS). Screen readers that expose all DOM nodes regardless of CSS visibility may announce both icons. A more robust solution would use a single icon component with a derived `aria-hidden` prop, or use `{#if}` blocks controlled by a reactive state derived from bits-ui's context.