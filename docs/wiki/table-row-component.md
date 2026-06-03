---
{
  "title": "Table Row Component",
  "summary": "A styled `\u003ctr\u003e` wrapper that provides hover, selection, and transition behaviors for table rows. Exposes a bindable ref and forwards all native HTML table row attributes.",
  "concepts": [
    "table row",
    "tr element",
    "data-slot",
    "hover state",
    "selected state",
    "cn utility",
    "bindable ref",
    "transition-colors",
    "Tailwind Merge",
    "HTMLTableRowElement",
    "Svelte 5 props",
    "class merging"
  ],
  "categories": [
    "widget",
    "table",
    "layout"
  ],
  "source_docs": [
    "b1e6bb4f2b88d179"
  ],
  "backlinks": null,
  "word_count": 482,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `TableRow` component is a lightweight Svelte 5 wrapper around the native HTML `<tr>` element. Its purpose is to apply consistent visual treatment to every row in a data table — hover shading, selected-state highlighting, and smooth transitions — without requiring each consumer to repeat the same Tailwind class string.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ref` | `HTMLTableRowElement \| null` | `null` | Bindable DOM reference for programmatic access |
| `class` | `string` | — | Additional classes merged via `cn()` |
| `children` | snippet | — | Cell content rendered inside the row |
| `...restProps` | `HTMLAttributes<HTMLTableRowElement>` | — | Any native `<tr>` attribute |

## Rendering Behavior

The component renders a single `<tr>` element. Two key Tailwind utilities drive the visual contract:

- **`hover:bg-muted/50`** — On pointer hover, the row background shifts to a semi-transparent muted tone. This ensures rows are scannable without overwhelming the table's base background.
- **`data-[state=selected]:bg-muted`** — When external state management sets `data-state="selected"` on the element (typically done by a headless table library), the full muted background activates, making the selected row visually distinct.
- **`border-b`** — A bottom border separates rows, providing the grid-line structure most data tables require.
- **`transition-colors`** — Smooths all color changes (hover, selection) so state transitions feel polished rather than jarring.

## The `data-slot` Attribute

The element carries `data-slot="table-row"`, a ripple-wide convention that makes components targetable by ancestor styles without coupling to class names or element tags. This allows a parent `Table` or layout wrapper to style `.table-row` children via CSS attribute selectors, keeping the component boundary clean.

## The `cn()` Utility and Class Merging

Classes are composed with `cn()`, which combines clsx-style conditional logic with Tailwind Merge. This prevents conflicting Tailwind classes from stacking — if a consumer passes `className="bg-red-500"`, the `cn()` call ensures it wins over or merges cleanly with the default `hover:bg-muted/50`, depending on specificity rules. Without this guard, duplicate or conflicting utilities would cause unpredictable visual output.

## Bindable `ref`

The `ref = $bindable(null)` pattern in Svelte 5 exposes the underlying DOM node to parent components. This is critical for table use cases that need to measure row height, scroll a specific row into view, or attach third-party drag-and-drop handlers. Without the `$bindable` declaration, parents would have no way to obtain the DOM reference without additional wrappers.

## Children Rendering

The `{@render children?.()}` expression uses optional chaining. This means the component will not throw if rendered without children — an empty row is valid HTML and may be used as a placeholder during loading states.

## Known Gaps

No TODO, FIXME, or HACK markers are present. The component is intentionally minimal — selection state must be set externally (e.g., by a headless table instance). There is no built-in click handler to toggle selection, which means consumer code must wire up that behavior separately.