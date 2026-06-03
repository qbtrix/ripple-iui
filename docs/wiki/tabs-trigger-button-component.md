---
{
  "title": "Tabs Trigger Button Component",
  "summary": "The clickable tab button that activates a content panel, with an extensive Tailwind class composition covering active state, focus visibility, dark mode, orientation adaptation, and an animated line-variant underline indicator.",
  "concepts": [
    "tabs trigger",
    "active state",
    "focus-visible",
    "dark mode",
    "disabled state",
    "line variant",
    "underline indicator",
    "after pseudo-element",
    "group selector",
    "data-active",
    "orientation",
    "cn utility",
    "bits-ui",
    "SVG sizing"
  ],
  "categories": [
    "tabs",
    "navigation",
    "accessibility"
  ],
  "source_docs": [
    "b9f339e5cf27909c"
  ],
  "backlinks": null,
  "word_count": 428,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`TabsTrigger` is the most visually complex component in the tabs system. It wraps `bits-ui`'s `Tabs.Trigger` primitive and layers on Tailwind classes that handle every visual state the trigger can be in: default, hover, active, focused, disabled, dark mode, horizontal orientation, vertical orientation, and the line variant's underline indicator.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ref` | `HTMLElement \| null` | `null` | Bindable DOM reference |
| `class` | `string` | — | Additional classes merged at end |
| `...restProps` | `TabsPrimitive.TriggerProps` | — | All bits-ui Trigger props (notably `value`) |

## Class Composition Breakdown

The class string is split into four `cn()` arguments for readability. Each group addresses a distinct concern:

### Group 1 — Base Layout and Interaction
`gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium` establishes spacing. `[&_svg:not([class*='size-'])]:size-4` automatically sizes any icon inside the trigger to 4 units unless the icon already has a size class — preventing oversized icons without forcing consumers to add size classes on every icon.

`focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-1 focus-visible:outline-ring` implements a layered focus indicator. The combination of ring and border-as-outline provides a clear keyboard navigation signal while staying within the component's border box.

`disabled:pointer-events-none disabled:opacity-50` prevents interaction and reduces opacity for disabled triggers.

### Group 2 — Variant-Aware Backgrounds
Selectors like `group-data-[variant=line]/tabs-list:bg-transparent` and `group-data-[variant=line]/tabs-list:data-active:bg-transparent` ensure that in line-variant tab lists, the active trigger never shows a background fill — only the underline indicator (group 4) should signal active state.

### Group 3 — Active State Colors
`data-active:bg-background data-active:text-foreground` provides the active trigger appearance in default variant. Dark mode selectors add `dark:data-active:border-input dark:data-active:bg-input/30` to ensure the active trigger is still distinguishable on dark backgrounds without a stark white fill.

### Group 4 — Line Variant Underline Indicator
The `after:` pseudo-element classes build an animated underline indicator:

- The `after:` is positioned absolutely within the trigger.
- In horizontal orientation: `group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5` draws a horizontal bar below the trigger.
- In vertical orientation: `group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5` draws a vertical bar to the right of the trigger.
- `after:opacity-0` hides it by default; `group-data-[variant=line]/tabs-list:data-active:after:opacity-100` reveals it only when the trigger is active inside a line-variant list.

This approach — using opacity transition on a positioned pseudo-element — avoids layout shifts that would occur if the indicator were toggled with `display: none`.

## Known Gaps

No TODO or FIXME markers. The class string is dense and difficult to audit at a glance. Changes to orientation or variant behavior require careful attention to the group selector chain to avoid unintended side effects.