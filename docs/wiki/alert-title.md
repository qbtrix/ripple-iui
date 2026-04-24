---
{
  "title": "Alert Title",
  "summary": "AlertTitle renders the heading line of an alert, with automatic column positioning when the alert contains an icon, and normalized link styling. It is a semantic label wrapper with no behavioral logic.",
  "concepts": [
    "alert",
    "alert title",
    "group-has variant",
    "col-start",
    "CSS grid",
    "icon alignment",
    "named group variant",
    "Tailwind CSS",
    "data-slot",
    "cn utility",
    "semantic HTML"
  ],
  "categories": [
    "widget",
    "layout"
  ],
  "source_docs": [
    "dc73d889656f5d17"
  ],
  "backlinks": null,
  "word_count": 433,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`alert-title.svelte` is the heading of an alert. It renders a `<div>` with `font-medium` weight and two context-sensitive layout adjustments driven entirely by CSS.

## Icon-Aware Column Positioning

```
group-has-[>svg]/alert:col-start-2
```

The parent `Alert` applies `has-[>svg]:grid-cols-[auto_1fr]` — a two-column grid that activates when an `<svg>` (icon) is a direct child of the alert. In this grid layout:
- Column 1 (`auto`) holds the icon
- Column 2 (`1fr`) holds the text content

Without `col-start-2`, the title would render in column 1 (overlapping the icon) in some grid placement scenarios. The `group-has-[>svg]/alert:` selector detects whether the named group (`/alert`) contains an `<svg>` and conditionally applies `col-start-2`. This keeps the title right-aligned with the description text in icon+text alert layouts.

The named group variant `/alert` scopes this rule to alert groups specifically, preventing false positives from unrelated SVGs in nested components.

## Link Styles

```
[&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3
```

Links inside the title receive the same normalization as `AlertDescription`. Alert titles can sometimes include documentation links (e.g., "See the [migration guide]()") — these rules ensure they render consistently with body links without extra markup.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | `HTMLDivElement` (bindable) | DOM reference |
| `class` | `string` | Appended via `cn()` |
| `children` | snippet | Title text (and optional inline elements) |
| `...restProps` | spread | Any `HTMLDivElement` attributes |

## Semantic Note

AlertTitle renders as a `<div>`, not an `<hN>` heading. This is intentional: alerts are inline notification patterns, not document-structure headings. Using a heading tag would pollute the page's heading hierarchy and confuse screen reader navigation by heading. The `font-medium` class provides visual weight without semantic heading structure.

## Relationship to AlertDescription

`AlertTitle` and `AlertDescription` are both `<div>` wrappers, but they carry different `data-slot` values and different default styles. The title is `font-medium` (slightly bold); the description is `text-muted-foreground text-sm` (reduced weight and contrast). This hierarchy communicates urgency at a glance — title for the what, description for the why or how-to-fix.

Both components apply the same link normalization rules (`[&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground`). This is intentional duplication rather than shared utility — each component is self-contained and can be used independently without the other, so they cannot rely on a shared ancestor for link styling.

## Known Gaps

`group-has-[>svg]/alert:col-start-2` uses a named group variant that requires the parent `Alert` component to apply `group/alert` — which it does via `alertVariants`. If `AlertTitle` is used outside an `Alert` (e.g., in a custom notification component), the column positioning rule will never fire and the layout may misalign when an icon is present.