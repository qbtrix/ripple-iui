---
{
  "title": "Alert Root Component with Variant System",
  "summary": "The Alert root component provides a styled notification container with a `default` and `destructive` variant system built with `tailwind-variants`. It uses CSS grid with data-slot selectors to automatically accommodate icon+text layouts and action button placements without requiring callers to specify layout props.",
  "concepts": [
    "alert",
    "tailwind-variants",
    "tv()",
    "CSS grid",
    "has-[\u003esvg]",
    "data-slot",
    "ARIA role",
    "variant system",
    "AlertVariant",
    "action slot",
    "icon alignment",
    "compound component",
    "conditional layout"
  ],
  "categories": [
    "widget",
    "layout",
    "state-management"
  ],
  "source_docs": [
    "edfd8aacb14a67b5"
  ],
  "backlinks": null,
  "word_count": 461,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`alert.svelte` is the outermost wrapper of the alert compound component. It establishes the visual container, manages the variant system, and sets up the CSS grid/group context that all child alert sub-components (`AlertTitle`, `AlertDescription`, `AlertAction`) depend on.

## Variant System via `tailwind-variants`

The module-level `alertVariants` is defined using `tv()` from `tailwind-variants`:

```typescript
export const alertVariants = tv({
  base: "...",
  variants: {
    variant: {
      default: "bg-card text-card-foreground",
      destructive: "text-destructive bg-card ...",
    },
  },
  defaultVariants: { variant: "default" },
});
```

`tailwind-variants` handles class merging and variant-conditional application, preventing duplicate or conflicting class names when `className` overrides are passed. Exported as `alertVariants`, it can be reused in tests or in custom wrappers that want the same style surface without the full component.

`AlertVariant` is exported as a type so callers can type their own alert variant props without coupling to the `tv()` return type.

## CSS Grid Layout

The base class includes:

```
has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2
```

When an `<svg>` is a direct child of the alert (i.e., an icon is passed), the alert switches from a single-column stack to a two-column grid: `auto` for the icon and `1fr` for the text content. Without this, icon and text would render inline and wrap awkwardly.

```
*:[svg]:row-span-2 *:[svg]:translate-y-0.5
```

Icons span two rows (title + description) so they remain vertically centered in the full text block. A slight `translate-y-0.5` correction aligns the icon optically with the cap-height of the title text.

## Action Slot Accommodation

```
has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18
```

When an `AlertAction` is present (detected via `data-slot="alert-action"`), the alert adds `position: relative` (making itself the containing block for the absolute-positioned action) and `pr-18` (reserving right-side space so text doesn't flow under the action button). Both rules are conditional — alerts without actions are unaffected.

## ARIA Role

`role="alert"` is set unconditionally. This causes screen readers to announce the alert content immediately when it is inserted into the DOM, without the user needing to navigate to it. This is appropriate for transient notifications (errors, warnings, confirmations). For static informational banners that don't require immediate announcement, `role="note"` or no role would be more appropriate — but `alert` covers the most common use case.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | `HTMLDivElement` (bindable) | DOM reference |
| `class` | `string` | Merged via `cn()` after variant classes |
| `variant` | `'default' \| 'destructive'` | Controls color scheme |
| `children` | snippet | Sub-components |
| `...restProps` | spread | Any `HTMLDivElement` attributes |

## Known Gaps

The `role="alert"` is hardcoded. If `Alert` is used to render persistent informational banners (not transient notifications), live-region announcements will fire on every mount, which can be disruptive for screen reader users. A `role` prop override would give callers control over this behavior.