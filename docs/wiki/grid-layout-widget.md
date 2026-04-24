---
{
  "title": "Grid Layout Widget",
  "summary": "A CSS grid layout widget that maps numeric column/row counts or raw CSS template strings to `grid-template-columns` and `grid-template-rows`, with optional gap normalization using the 4px grid system. It is the explicit-structure counterpart to `Dashboard`'s auto-fill approach.",
  "concepts": [
    "CSS grid",
    "grid-template-columns",
    "grid-template-rows",
    "explicit grid",
    "1fr",
    "repeat",
    "gap normalization",
    "4px grid",
    "min-width: 0",
    "layout widget",
    "overflow guard"
  ],
  "categories": [
    "layout",
    "widget"
  ],
  "source_docs": [
    "aad5833f2a3cae3f"
  ],
  "backlinks": null,
  "word_count": 420,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Grid` gives Ripple layouts an explicit, fixed-structure CSS grid. Unlike `Dashboard`, which auto-fills columns based on a minimum width, `Grid` requires callers to specify the exact column (and optionally row) structure. This makes it suitable for precise multi-column forms, two-panel layouts, and structured data grids where the number of columns is known ahead of time.

## Column Template Logic

```typescript
if (typeof columns === 'number') s.push(`grid-template-columns:repeat(${columns},1fr)`);
else s.push(`grid-template-columns:${columns}`);
```

When `columns` is a number, the grid creates N equal-width columns (`repeat(N, 1fr)`). This is the ergonomic form — `columns={3}` produces a clean three-column layout.

When `columns` is a string, it is passed directly as `grid-template-columns`. This allows non-uniform layouts like `"200px 1fr 200px"` (fixed sidebars with flexible center) or `"repeat(2, 1fr) 2fr"` (weighted columns) that cannot be expressed with a single number.

The same dual-mode logic applies to `rows`.

## Gap Normalization

```typescript
const gapValue = $derived(
  gap == null ? undefined : typeof gap === 'number' ? `${gap * 4}px` : gap
);
```

Identical to the `Flex` widget's gap logic: numbers are multiplied by 4 (4px grid), strings pass through. `gap == null` (covering both `null` and `undefined`) results in no gap style being set, allowing the browser's default to apply rather than forcing `gap: 0`.

## Overflow Guard

```css
.rgrid { min-width: 0; }
```

The same `min-width: 0` defensive rule used by `Flex` and `DashboardSlot`. Without this, grid children with intrinsic widths wider than the column can blow out the grid container.

## Style Construction

```typescript
const combinedStyle = $derived.by(() => {
  const s: string[] = ['display:grid'];
  // ... push column, row, gap
  if (style) s.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
  return s.join(';');
});
```

User `style` overrides are appended after computed values. This allows callers to set `align-items`, `justify-items`, or other grid properties not exposed as dedicated props.

## Relationship to Dashboard and DashboardSlot

- `Dashboard` is auto-fill grid (no column count needed).
- `Grid` is explicit-count grid (column count or template required).
- `DashboardSlot` can be used inside either as a cell wrapper.

For AI-generated layouts where column counts are known from the node schema, `Grid` is preferred over `Dashboard` because it produces predictable, non-reflow layouts.

## Known Gaps

- No `autoFlow`, `autoRows`, or `autoColumns` props are exposed. Fine-grained grid flow control requires `style` overrides.
- No named template areas (`grid-template-areas`) support. Complex overlapping or named-zone layouts cannot be expressed.
- `rows` defaults to `undefined` (no row template), so rows auto-size. There is no way to enforce equal row heights without a `style` override.