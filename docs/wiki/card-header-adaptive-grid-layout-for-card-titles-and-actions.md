---
{
  "title": "Card Header — Adaptive Grid Layout for Card Titles and Actions",
  "summary": "CardHeader is the top section of a card component. It uses CSS Grid with container queries and group-data selectors to dynamically adapt its layout based on which child slots (title, description, action) are present.",
  "concepts": [
    "card-header",
    "CSS Grid",
    "container queries",
    "group-data variants",
    "has-data selectors",
    "card-action",
    "card-description",
    "adaptive layout",
    "Svelte 5 snippets",
    "Tailwind CSS"
  ],
  "categories": [
    "widget",
    "layout",
    "card"
  ],
  "source_docs": [
    "c4cd0ee00bc57d1a"
  ],
  "backlinks": null,
  "word_count": 360,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`card-header.svelte` renders the top zone of a card widget. Unlike a simple flex container, it implements an adaptive CSS Grid that restructures itself based on its children's slot types — specifically whether a `card-action` or `card-description` is present.

## Adaptive Grid Layout

The header's class list encodes multiple conditional layout strategies:

```
has-data-[slot=card-action]:grid-cols-[1fr_auto]
has-data-[slot=card-description]:grid-rows-[auto_auto]
```

- When a `card-action` is present, the grid switches to a two-column layout — title/description on the left, action button on the right. Without this, an action element would stack below the title rather than anchoring inline.
- When a `card-description` exists, the grid adds a second auto row, ensuring the description gets its own row below the title rather than collapsing into the same cell.

This is a zero-JS layout adaptation — no `if` checks, no prop threading. The CSS directly observes slot presence via `has-data-[slot=...]` selectors.

## Container Query Context

`@container/card-header` establishes a named container query context. Child components (title, description, action) can define `@container` breakpoints scoped to the header's width rather than the viewport. This is particularly valuable in generative UI contexts where a card might appear in a narrow sidebar or a wide main panel — children respond to available space, not global layout.

## Group Context for Nested Children

The `group/card-header` class registers this element as a named group so that deeply nested children can write `group-[...]/card-header:` variants. This scoped group naming prevents selector bleed — only children of this specific header respond to group state, not children of any ancestor that also uses `group`.

## Responsive Sizing via Parent Card

`group-data-[size=sm]/card:px-3` reads the card's `data-size` attribute and reduces horizontal padding. The `[.border-b]:pb-4` and its small-variant equivalent add bottom padding only when the header has a border-bottom applied — allowing optional divider styles without hardcoding the padding regardless.

## Props

```svelte
let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
```

Identical prop contract to other card sub-components: bindable `ref`, class merging via `cn()`, optional `children` snippet, and full attribute pass-through.

## Known Gaps

None identified. The `auto-rows-min` default prevents rows from stretching unnecessarily, and `items-start` prevents vertical centering that would misalign multiline descriptions.
