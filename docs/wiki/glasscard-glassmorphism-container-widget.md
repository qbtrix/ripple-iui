---
{
  "title": "GlassCard Glassmorphism Container Widget",
  "summary": "A specialized card widget that renders a frosted-glass container using backdrop-filter, color-mix, and multi-layer box-shadow. Extracted from the paw-os-ui enterprise layout system, it exposes fine-grained glass effect controls (`opacity`, `blur`, `tint`, `borderGlow`) as props.",
  "concepts": [
    "glassmorphism",
    "backdrop-filter",
    "color-mix",
    "box-shadow",
    "reflex glow",
    "border glow",
    "webkit prefix",
    "tint",
    "blur",
    "dark-mode",
    "paw-os-ui",
    "glass effect"
  ],
  "categories": [
    "layout",
    "widget",
    "visual-effects"
  ],
  "source_docs": [
    "be81734d0e4c09cd"
  ],
  "backlinks": null,
  "word_count": 474,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`GlassCard` brings the liquid glass aesthetic from the PocketPaw enterprise OS UI into Ripple as a reusable widget. It was extracted during Phase 4 of the paw-os-ui migration to avoid duplicating the complex CSS across every dashboard that needed the glass look.

## The Glass Effect Stack

The glass appearance is built from four CSS layers, all computed in `glassStyle`:

### 1. Background Color

```css
background-color: color-mix(in srgb, <tint> <opacity>%, transparent)
```

`color-mix()` blends the tint color with transparency, producing the colored-glass background. Default is `color-mix(in srgb, #000000 38%, transparent)` — a dark frosted glass. Changing `tint` to a blue shifts the glass tint without needing separate rgba calculations.

### 2. Backdrop Filter

```css
backdrop-filter: blur(8px) saturate(150%);
-webkit-backdrop-filter: blur(8px) saturate(150%);
```

The `-webkit-backdrop-filter` duplicate is required for Safari compatibility. Without it, the blur effect is absent on Safari/iOS. The `saturate(150%)` boosts color richness of blurred content to compensate for the visual flattening that blur produces.

### 3. Border

```css
border: 1px solid rgba(255, 255, 255, 0.12)
```

A subtle white border at 12% opacity creates the glass edge. This is baked in rather than themed because the glass effect only makes sense on dark backgrounds where a white border reads as a light refraction.

### 4. Border Glow (optional)

When `borderGlow: true` (default), a 6-layer `box-shadow` creates the reflex highlight effect:

```typescript
base['box-shadow'] = [
  'inset 0 0 0 1px color-mix(in srgb, #fff 10%, transparent)',
  'inset 2px 1px 0px -1px color-mix(in srgb, #fff 30%, transparent)',
  'inset -1.5px -1px 0px -1px color-mix(in srgb, #fff 20%, transparent)',
  'inset -2px -6px 1px -5px color-mix(in srgb, #fff 40%, transparent)',
  'inset -1px 2px 3px -1px color-mix(in srgb, #000 20%, transparent)',
  '0px 3px 10px 0px color-mix(in srgb, #000 12%, transparent)',
].join(', ');
```

These six shadows simulate the way light refracts through glass edges — brighter at the top-left, darker at the bottom-right, with a subtle drop shadow. The use of `color-mix` rather than hardcoded rgba values means each layer adapts if the CSS color space changes.

## User Style Override

```typescript
if (style) Object.assign(base, style);
```

The user `style` record is merged into the base style object last, so callers can override any computed property. The final string is assembled from the merged record.

## Header Section

Title and description are rendered with fixed colors (`rgba(255,255,255,0.90)` and `rgba(255,255,255,0.50)`) rather than theme tokens because glass cards are always assumed to be on dark backgrounds. Using theme-relative colors would make the text unreadable on light themes.

## Known Gaps

- `GlassCard` is not compatible with light-mode themes — the white borders and dark tint assumptions will look wrong on light backgrounds.
- The `borderGlow` box-shadow values are hardcoded. There is no way to adjust the highlight intensity proportionally.
- `overflow: hidden` on `.ripple-glass-card` clips children, which may surprise consumers trying to render tooltips or popover anchors inside the card.