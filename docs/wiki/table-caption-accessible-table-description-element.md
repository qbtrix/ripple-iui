---
{
  "title": "Table Caption — Accessible Table Description Element",
  "summary": "TableCaption renders a styled HTML `\u003ccaption\u003e` element that provides an accessible, programmatically associated description for a table. Positioned below the table by default via `margin-top`, it uses muted foreground and small text to visually distinguish itself from table data.",
  "concepts": [
    "table",
    "caption",
    "accessibility",
    "screen reader",
    "HTMLElement",
    "caption-side",
    "text-muted-foreground",
    "semantic HTML",
    "aria-labelledby",
    "WithElementRef",
    "data-slot"
  ],
  "categories": [
    "ui",
    "table",
    "accessibility",
    "data-display"
  ],
  "source_docs": [
    "833673985bccdd54"
  ],
  "backlinks": null,
  "word_count": 440,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The HTML `<caption>` element is the semantic mechanism for providing a description or title for a table. Unlike a heading placed above a table (which has no formal association with it in the DOM), a `<caption>` is a direct child of `<table>` and is announced by screen readers as the table's name when users navigate to it. This makes `TableCaption` an accessibility primitive, not a decorative component.

## Component Design

```svelte
<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<caption
  bind:this={ref}
  data-slot="table-caption"
  class={cn("text-muted-foreground mt-4 text-sm", className)}
  {...restProps}
>
  {@render children?.()}
</caption>
```

## Why `<caption>` Over a Plain `<p>` or `<div>`?

The `<caption>` element has specific browser behavior that no other element replicates:

1. **Automatic association**: Browsers and accessibility APIs automatically link the caption to its parent `<table>` via `aria-labelledby` at the platform level — no explicit `id`/`aria-labelledby` wiring needed.
2. **Correct DOM position**: Browsers render `<caption>` above or below the table (controlled by `caption-side` CSS property) regardless of its position in the source HTML, and will automatically move it to the correct spot in the DOM structure.
3. **Screen reader announcement**: When a user navigates to the table, assistive technology reads the caption content as the table's label before announcing the dimensions and headers.

Using a `<div>` or `<p>` above the table would look the same visually but break all three of these behaviors.

## Styling Choices

- **`text-muted-foreground`**: The caption is metadata, not data. Using a lower-contrast color signals this semantic distinction visually.
- **`mt-4`**: Places the caption below the table with a standard spacing token (assuming `caption-side: bottom` CSS). Without this margin, the caption would run directly against the table border.
- **`text-sm`**: Slightly smaller than body text further de-emphasizes the caption relative to the table content.

All three defaults can be overridden by passing a `className` prop.

## The `HTMLElement` Type Choice

The props type uses `HTMLAttributes<HTMLElement>` rather than a more specific type (there is no `HTMLCaptionElement` in the TypeScript DOM types — `<caption>` shares the base `HTMLElement` interface). This is correct — it means all standard HTML attributes are accepted.

## Usage Context

```svelte
<Table.Root>
  <Table.Caption>Monthly revenue by region, Q1 2026</Table.Caption>
  <Table.Header> ... </Table.Header>
  <Table.Body> ... </Table.Body>
</Table.Root>
```

The caption renders below the table data by default in most browsers, making it a good place for footnotes, data sources, or contextual notes in addition to the primary table title.

## Known Gaps

None. Caption placement (top vs. bottom) can be controlled via a `className` that includes `caption-side-top` if needed.