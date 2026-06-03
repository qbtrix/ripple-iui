---
{
  "title": "Table Root Component",
  "summary": "The root container for data tables, wrapping a native `\u003ctable\u003e` in an overflow-safe scroll container. Applies consistent sizing and caption positioning while exposing a bindable DOM reference.",
  "concepts": [
    "table",
    "overflow-x-auto",
    "scroll container",
    "caption-bottom",
    "data-slot",
    "bindable ref",
    "HTMLTableAttributes",
    "responsive layout",
    "table container",
    "cn utility",
    "Svelte 5 props",
    "text-sm"
  ],
  "categories": [
    "widget",
    "table",
    "layout"
  ],
  "source_docs": [
    "ac2604605cc58b47"
  ],
  "backlinks": null,
  "word_count": 505,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Table` is the outermost building block of ripple's table system. It solves two structural problems that come up every time a table is rendered in a responsive layout: overflow management and consistent typographic sizing. Rather than asking every consumer to remember the scroll wrapper pattern, this component bundles it in.

## Structure

The component renders two DOM nodes:

```svelte
<div data-slot="table-container" class="relative w-full overflow-x-auto">
  <table bind:this={ref} data-slot="table" class={cn("w-full caption-bottom text-sm", className)} {...restProps}>
    {@render children?.()}
  </table>
</div>
```

The outer `<div>` is the scroll host; the inner `<table>` is the actual semantic table.

## Why the Scroll Wrapper Exists

Tables are among the few HTML elements that refuse to shrink below their intrinsic content width. On narrow viewports, a table with many columns will overflow its container and push the page layout sideways. Wrapping the table in `overflow-x-auto` confines the overflow to the wrapper itself, enabling horizontal scrolling of just the table while the rest of the page stays fixed. The `relative w-full` on the wrapper ensures it takes up its parent's full width and establishes a positioning context for any absolutely-positioned children (like sticky headers or overlay loading states).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ref` | `HTMLTableElement \| null` | `null` | Bindable reference to the `<table>` DOM node |
| `class` | `string` | — | Extra classes merged onto the `<table>` |
| `children` | snippet | — | `<thead>`, `<tbody>`, `<tfoot>`, `<caption>` content |
| `...restProps` | `HTMLTableAttributes` | — | Any valid HTML table attribute |

## Default Classes Explained

- **`w-full`** — Stretches the table to fill the scroll container, so tables with few columns don't appear oddly narrow.
- **`caption-bottom`** — Positions any `<caption>` element below the table body, which is the common modern convention.
- **`text-sm`** — Sets a consistent small font size across all table content. Individual cells can override this, but having a sensible default prevents dense tables from using the browser's default body font size.

## The `data-slot` Convention

Both the wrapper and the table carry `data-slot` attributes (`table-container` and `table`). This double-slot pattern is intentional: parent components or CSS layers can target the scroll container separately from the table element itself. For example, adding a sticky header requires styling the container, not the table.

## `ref` Binding Targets the Table, Not the Container

The `bind:this={ref}` is attached to `<table>`, not the outer `<div>`. This is a deliberate choice — consumers who need the DOM node almost always want the semantic table element (to measure columns, initialize a virtual scroller, or call `getBoundingClientRect()` for layout calculations). The wrapper div is an implementation detail and should not leak through the API.

## Known Gaps

No known gaps or incomplete implementations. The scroll container does not expose its own `ref`, which means consumers cannot programmatically scroll to a specific column position without querying the DOM outside of Svelte's model. If programmatic scroll control over the wrapper becomes necessary, a second bindable ref would need to be added.