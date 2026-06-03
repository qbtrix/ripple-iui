---
{
  "title": "Tabs List Container with Variant Support",
  "summary": "The container that holds tab trigger buttons, supporting `default` (pill/background) and `line` (underline) visual variants. Uses `tailwind-variants` for variant composition and adapts layout for both horizontal and vertical orientations.",
  "concepts": [
    "tabs list",
    "tailwind-variants",
    "tv()",
    "variant",
    "default variant",
    "line variant",
    "orientation",
    "group modifier",
    "data-variant",
    "module script",
    "TabsListVariant",
    "tabsListVariants",
    "horizontal tabs",
    "vertical tabs"
  ],
  "categories": [
    "tabs",
    "navigation",
    "layout"
  ],
  "source_docs": [
    "263a0bfb3e1e980a"
  ],
  "backlinks": null,
  "word_count": 435,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`TabsList` renders the row (or column) of tab buttons. It is one of the more complex pieces of the tabs system because it must handle two visual variants and two layout orientations, and it exports its variant configuration so other components can extend or reference it.

## Module-Level Variant Definition

The file uses Svelte 5's `<script lang="ts" module>` block to define `tabsListVariants` and `TabsListVariant` at the module level — outside of any component instance. This is intentional: the variant function needs to be importable and usable in TypeScript without instantiating a component. Placing it in the module block makes it a true ES module export.

```typescript
export const tabsListVariants = tv({
  base: "rounded-lg p-[3px] group-data-horizontal/tabs:h-8 ...",
  variants: {
    variant: {
      default: "cn-tabs-list-variant-default bg-muted",
      line: "cn-tabs-list-variant-line gap-1 bg-transparent",
    },
  },
  defaultVariants: { variant: "default" },
});
```

## Variants

### `default`
Renders a pill-shaped container with a muted background. Tab triggers inside appear as raised pills when active. This is the standard segmented control pattern. The `bg-muted` background provides the tray that tabs sit in.

### `line`
Renders a transparent container where active tabs show an underline indicator instead of a background fill. The `gap-1` spacing gives triggers breathing room. This variant suits nav-bar style tabs rather than inline content switches.

## Orientation Handling

The base class uses Tailwind group modifiers to adapt layout:

- `group-data-horizontal/tabs:h-8` — Constrains list height to 8 units in horizontal mode.
- `group-data-[orientation=vertical]/tabs:h-fit` — Allows the list to size to content in vertical mode.
- `group-data-[orientation=vertical]/tabs:flex-col` — Stacks triggers vertically.

These rely on the parent `Tabs.Root` setting `data-orientation` and `data-horizontal` on itself via the `group/tabs` class. The CSS attribute selectors cascade down to the list without any prop threading.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ref` | `HTMLElement \| null` | `null` | Bindable DOM reference |
| `variant` | `TabsListVariant` | `"default"` | Visual style variant |
| `class` | `string` | — | Additional classes |
| `...restProps` | `TabsPrimitive.ListProps` | — | All bits-ui List props |

## The `data-variant` Attribute

The rendered element receives `data-variant={variant}` in addition to the computed class string. This bridges the variant selection to CSS — `TabsTrigger` uses `group-data-[variant=line]/tabs-list:` selectors to adjust its own appearance based on the list's variant. This avoids prop drilling the variant down to every trigger individually.

## Known Gaps

No TODO or FIXME markers. The `cn-tabs-list-variant-default` and `cn-tabs-list-variant-line` class names suggest custom CSS class definitions that live outside Tailwind utilities — consumers need to ensure these classes are defined in their global stylesheet or the design system's CSS layer.