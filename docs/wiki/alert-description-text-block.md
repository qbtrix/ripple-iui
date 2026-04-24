---
{
  "title": "Alert Description Text Block",
  "summary": "AlertDescription renders the body text of an alert with opinionated typography defaults including responsive text balancing, auto-spaced paragraphs, and normalized link styling. It is a thin presentational wrapper with no behavioral logic.",
  "concepts": [
    "alert",
    "alert description",
    "text-balance",
    "text-pretty",
    "text-wrap",
    "Tailwind CSS",
    "data-slot",
    "muted foreground",
    "link styles",
    "paragraph spacing",
    "cn utility"
  ],
  "categories": [
    "widget",
    "layout"
  ],
  "source_docs": [
    "254b567fcddf01c6"
  ],
  "backlinks": null,
  "word_count": 470,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`alert-description.svelte` is the text body slot of an alert component. It wraps content in a styled `<div>` that handles the common typographic needs of alert body text without requiring callers to add their own styles.

## Typography Decisions

### `text-balance` and `text-pretty`

```
text-sm text-balance md:text-pretty
```

`text-balance` (CSS `text-wrap: balance`) distributes words across lines as evenly as possible. This avoids awkward widows (a single word on the last line) in short alert messages. At `md` breakpoints, it switches to `text-pretty` (CSS `text-wrap: pretty`), which prioritizes the last line specifically — better for longer, paragraph-length descriptions where full balancing would cause uneven line lengths.

This responsive `text-wrap` switching is intentional: `balance` performs best on short text (2-4 lines), while `pretty` is better for longer prose. Alert descriptions can be either, so the breakpoint-based switch covers both.

### Paragraph Spacing

```
[&_p:not(:last-child)]:mb-4
```

Multi-paragraph descriptions (e.g., error explanations with steps) receive automatic spacing between paragraphs except the last one. Without this, callers would need to add `mb-4` manually to every intermediate `<p>` tag inside the description — an easy omission that produces cramped text.

### Link Styles

```
[&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground
```

Links inside alert descriptions are underlined (for accessibility — color alone is insufficient for link indication) with a small offset to improve readability. On hover, they transition to the foreground color. This normalization means callers can drop `<a>` tags in descriptions without adding link styles.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | `HTMLDivElement` (bindable) | DOM reference |
| `class` | `string` | Appended via `cn()` to the base classes |
| `children` | snippet | Description body |
| `...restProps` | spread | Any `HTMLDivElement` attributes |

`text-muted-foreground` sets the text color to a reduced-contrast token, signaling that this is supporting text below a title — a standard UX convention for alert hierarchies.

## `data-slot` Attribute

`data-slot="alert-description"` is used by the parent `Alert` component's destructive variant:

```
*:data-[slot=alert-description]:text-destructive/90
```

This makes the description slightly less intense than the title in destructive alerts, maintaining visual hierarchy without requiring callers to pass a `variant` prop to the description separately.

## Destructive Variant Integration

The `data-slot="alert-description"` attribute participates in the destructive styling variant defined in the parent `alert.svelte`. When `variant="destructive"` is set on the root `Alert`, the Tailwind selector `*:data-[slot=alert-description]:text-destructive/90` applies a slightly muted destructive color to the description — `/90` opacity relative to the base destructive token. This creates a subtle visual hierarchy where the title reads at full destructive intensity and the description is slightly softer, guiding the eye to the most critical information first.

## Known Gaps

No known gaps. The component is intentionally minimal. One potential enhancement: `text-balance` has limited browser support before Chrome 114 / Safari 17.5. Projects targeting older browsers may see unbalanced text without a polyfill.