---
{
  "title": "Text Display Widget",
  "summary": "A foundational text rendering primitive that maps a flat set of typography props — size, weight, color, and inline mode — to semantic HTML elements. Renders as a `\u003cp\u003e` block element by default or an inline `\u003cspan\u003e` when the `inline` prop is set.",
  "concepts": [
    "text widget",
    "typography",
    "size presets",
    "font-mono",
    "inline rendering",
    "color guard",
    "muted-foreground",
    "block vs inline",
    "Svelte 5 runes",
    "CSS custom properties"
  ],
  "categories": [
    "widget",
    "display",
    "typography"
  ],
  "source_docs": [
    "7d8ab16dbccbabbc"
  ],
  "backlinks": null,
  "word_count": 532,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Text.svelte` is Ripple's most basic display widget. Its purpose is to render a string with controlled typography without requiring the spec author to know Tailwind class names. The component abstracts font-size, font-weight, and color into named values that map to a consistent visual system.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | `''` | The string to render |
| `size` | `'xs' \| 'sm' \| 'base' \| 'lg' \| 'xl' \| '2xl' \| '3xl'` | `'base'` | Size preset |
| `weight` | `'normal' \| 'medium' \| 'semibold' \| 'bold'` | `'normal'` | Font weight |
| `color` | `string` | — | Hex or RGB color override |
| `inline` | `boolean` | `false` | Render as `<span>` instead of `<p>` |
| `id` | `string` | — | DOM id |
| `class` | `string` | — | Additional Tailwind classes |
| `style` | `Record<string,string>` | — | Inline style map |

## Size-to-Color Coupling

A notable design choice is that the `size` map bundles both font-size and text-color presets:

```typescript
const sizeClasses: Record<string, string> = {
  xs: 'text-xs text-muted-foreground',
  sm: 'text-sm text-muted-foreground',
  base: 'text-sm text-foreground',
  lg: 'text-base text-foreground font-mono',
  xl: 'text-lg text-foreground font-mono',
  '2xl': 'text-xl text-foreground font-mono',
  '3xl': 'text-2xl text-foreground font-mono',
};
```

`xs` and `sm` default to `text-muted-foreground` (secondary text color) while `base` and larger use `text-foreground` (primary text color). This reflects the convention that small text is typically secondary/supporting content, while larger text is primary content. It lets spec authors write `size="xs"` and automatically get visually appropriate muted styling.

Larger sizes (`lg` and above) also apply `font-mono`, encoding the design convention that large display text in this UI system uses monospace (likely for numeric dashboards or terminal-adjacent contexts).

## Color Override Guard

```typescript
if (color && (color.startsWith('#') || color.startsWith('rgb'))) {
  styles.push(`color:${color}`);
}
```

The color prop is only applied to inline styles if it starts with `#` or `rgb`. This is a defensive guard against spec authors accidentally passing Tailwind class names (like `"text-red-500"`) as the `color` prop, which would produce an invalid `style` attribute. Tailwind names are silently ignored, encouraging correct usage.

## Inline vs Block Rendering

```svelte
{#if inline}
  <span ...>{text}</span>
{:else}
  <p ...>{text}</p>
{/if}
```

The `inline` prop switches between `<p>` (block) and `<span>` (inline). This matters for text that lives inside other inline contexts — e.g., a text widget inside a flex row alongside a badge — where a `<p>` element would break the flow.

Both elements apply `m-0` to suppress default browser paragraph margin, preventing unexpected spacing when the widget is used inside layouts with tight gap control.

## Data Flow

Text is a pure display widget with no event emission. Props flow in; a styled HTML element flows out. The Ripple spec parser maps the `text` widget type to this component, passing `text`, `size`, and other props directly from the JSON spec fields.

## Known Gaps

- No `truncate` or `clamp` prop for overflow control. Long strings in fixed-width containers will overflow unless the parent applies overflow handling.
- No support for named color tokens (e.g., `"muted"` or `"primary"`) — the color override only accepts raw hex/rgb values.