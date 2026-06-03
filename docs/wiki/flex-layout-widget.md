---
{
  "title": "Flex Layout Widget",
  "summary": "A flexbox layout container widget that maps semantic prop names (`justify`, `align`, `direction`, `gap`, `wrap`) to CSS flexbox values via lookup tables, eliminating the need for callers to know CSS property names. It also supports `divided` and `compact` layout variants that apply separator borders or tight padding to direct children.",
  "concepts": [
    "flexbox",
    "justify-content",
    "align-items",
    "flex-direction",
    "gap normalization",
    "wrap",
    "divided variant",
    "compact variant",
    "CSS variable",
    "layout widget",
    "prop-to-CSS mapping"
  ],
  "categories": [
    "layout",
    "widget"
  ],
  "source_docs": [
    "09c948e2588baeee"
  ],
  "backlinks": null,
  "word_count": 494,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Flex` gives AI-generated and hand-authored Ripple nodes a clean, prop-driven flexbox container. Instead of passing raw CSS (`justify-content: space-between`), callers use semantic names (`justify="between"`) that the component resolves internally. This prevents a class of bugs where AI generation produces invalid or inconsistent CSS shorthand.

## Prop-to-CSS Lookup Tables

```typescript
const justifyMap: Record<string, string> = {
  start: 'flex-start', end: 'flex-end', center: 'center',
  between: 'space-between', around: 'space-around', evenly: 'space-evenly'
};

const alignMap: Record<string, string> = {
  start: 'flex-start', end: 'flex-end', center: 'center',
  baseline: 'baseline', stretch: 'stretch'
};
```

The `?? 'flex-start'` and `?? 'stretch'` fallbacks in the derived style ensure that an unknown value produces a valid CSS property rather than an empty or broken rule. This is a defensive pattern against AI node schemas emitting prop values that fall outside the TypeScript union type.

## Gap Normalization

```typescript
const gapValue = $derived(
  gap == null ? undefined : typeof gap === 'number' ? `${gap * 4}px` : gap
);
```

Numeric gap values are multiplied by 4 to produce a pixel value, implementing a 4px grid system (common in design tokens). This means `gap={2}` produces `8px` and `gap={4}` produces `16px`. String values (e.g., `"1rem"`) pass through unchanged, giving escape hatch access for non-standard spacing.

## Wrap Normalization

```typescript
const wrapValue = $derived(
  wrap === true || wrap === 'wrap' ? 'wrap' : wrap === 'wrap-reverse' ? 'wrap-reverse' : 'nowrap'
);
```

`wrap` accepts both a boolean and a CSS string. `true` is the ergonomic form for simple wrapping; the string forms allow `wrap-reverse`. Any other value (including `false`) maps to `nowrap`.

## Layout Variants

The `variant` prop adds scoped CSS modifiers to direct children:

- **`divided`**: Removes gap and adds a bottom border between each child (`border-bottom: 1px solid var(--ripple-border-subtle)`). The last child has the border removed via `:last-child`. This produces a list-like separator pattern without requiring a separate `Divider` widget.
- **`compact`**: Removes gap and adds `3px 0` padding to each child for dense lists.

Both variants use `!important` on `gap: 0` to override any gap passed via the `gap` prop. This is intentional — `divided` and `compact` own the spacing contract for their children.

## Style Construction

All flex properties are assembled into a single inline style string:

```typescript
const combinedStyle = $derived.by(() => {
  const s: string[] = ['display:flex', ...];
  if (gapValue) s.push(`gap:${gapValue}`);
  if (style) s.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
  return s.join(';');
});
```

User `style` overrides are appended last, so they can override computed flex values if needed.

## `min-width: 0` Base Style

The scoped `.rflex` class sets `min-width: 0`, the same overflow guard used in `DashboardSlot`. Without it, a flex child with wide content can escape the flex container's bounds.

## Known Gaps

- No `grow` or `shrink` props are exposed for controlling `flex-grow` / `flex-shrink` on the container itself.
- The `divided` variant's border color uses a CSS variable (`--ripple-border-subtle`) that is not defined in this file — consumers must ensure the variable is set in the theme.