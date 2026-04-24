---
{
  "title": "Progress Bar Widget",
  "summary": "A thin wrapper around the shadcn/ui Progress component that adds height variants and runtime color overrides via CSS custom properties. Used by Ripple's generative UI runtime to render determinate progress indicators from a JSON spec.",
  "concepts": [
    "progress bar",
    "determinate progress",
    "CSS custom properties",
    "height variants",
    "tailwind-variants",
    "shadcn/ui",
    "color override",
    "data-slot",
    "style string",
    "Svelte 5 runes"
  ],
  "categories": [
    "widget",
    "display",
    "generative-ui"
  ],
  "source_docs": [
    "47fc4567825d4a75"
  ],
  "backlinks": null,
  "word_count": 477,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `Progress` widget is Ripple's display primitive for determinate progress indicators. It wraps the shadcn/ui `Progress` base component and extends it with two capabilities the base component omits: a height variant system and a dynamic bar-color override that works without touching the Tailwind config.

## Props

| Prop | Type | Default | Purpose |
|------|------|---------|--------|
| `value` | `number` | `0` | Current progress (0–max) |
| `max` | `number` | `100` | Maximum value |
| `color` | `string` | — | Optional hex/rgb bar color |
| `variant` | `'default' \| 'thin' \| 'thick'` | `'default'` | Height preset |
| `class` | `string` | — | Extra Tailwind classes |
| `style` | `Record<string,string>` | — | Inline style overrides |

## Height Variants

The `variant` prop resolves to a Tailwind height class via a `$derived` lookup:

```typescript
const variantClass = $derived({
  'default': '',
  'thin': 'h-0.5',
  'thick': 'h-2',
}[variant]);
```

The `default` variant intentionally produces an empty string, leaving the height to whatever the underlying `Progress` component provides. This avoids overriding the base component's own defaults unless the caller explicitly requests a variant.

## Dynamic Color via CSS Custom Properties

The color override is the most interesting defensive pattern here. The base Progress component uses a fixed indicator class internally. To change the bar color at runtime without forking the shadcn component, the widget:

1. Injects `--progress-color:<value>` into the element's style string.
2. Conditionally adds `[&_[data-slot=progress-indicator]]:bg-[var(--progress-color)]` to the class list only when `color` is provided.

```svelte
<Progress
  {value}
  {max}
  class={cn(
    variantClass,
    color ? '[&_[data-slot=progress-indicator]]:bg-[var(--progress-color)]' : '',
    className
  )}
  style={styleString}
/>
```

The guard (`color ? ... : ''`) prevents an empty CSS variable reference from being added when no color is supplied — a blank `var()` would leave the browser unable to resolve the property and could silently break the indicator color across themes.

The `styleString` derived value merges the color variable with any caller-provided `style` entries:

```typescript
const styleString = $derived.by(() => {
  const s: string[] = [];
  if (color) s.push(`--progress-color:${color}`);
  if (style) s.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
  return s.length > 0 ? s.join(';') : undefined;
});
```

Returning `undefined` (rather than an empty string) when neither `color` nor `style` is present ensures the `style` attribute is omitted entirely from the DOM, keeping the rendered HTML clean.

## Data Flow

Props arrive from the Ripple spec parser → reactive Svelte 5 `$props()` destructuring → `$derived` computations produce class and style strings → forwarded to the shadcn `Progress` primitive.

## Known Gaps

- No `animated` prop for indeterminate/striped loading states. If the caller wants an animated spinner instead of a determinate bar, they must use a different widget.
- No validation that `value` stays within `[0, max]`. Passing `value > max` silently renders a full bar because the underlying component clamps it, but the component itself does not warn or clamp defensively.