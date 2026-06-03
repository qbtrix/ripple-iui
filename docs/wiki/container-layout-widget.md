---
{
  "title": "Container Layout Widget",
  "summary": "A minimal transparent wrapper widget that renders a plain `\u003cdiv\u003e` with optional id, class, style, onclick, and children. It exists as the simplest possible Ripple layout primitive — a semantic grouping container with no visual opinions.",
  "concepts": [
    "container",
    "layout primitive",
    "transparent wrapper",
    "style pass-through",
    "Snippet",
    "$derived.by",
    "a11y suppression",
    "onclick",
    "grouping element"
  ],
  "categories": [
    "layout",
    "widget"
  ],
  "source_docs": [
    "82df9956882607e1"
  ],
  "backlinks": null,
  "word_count": 393,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Container` is the lowest-level layout widget in the Ripple system. It renders a single `<div>` that passes through id, class, computed inline style, and an optional click handler to its children. Unlike `Card`, `Flex`, or `Grid`, it adds no visual styling by default — it is purely a structural grouping element.

## Props

| Prop | Type | Purpose |
|------|------|--------|
| `id` | `string` | Element identity |
| `class` | `string` | CSS class override |
| `style` | `Record<string, string>` | Inline CSS map |
| `children` | `Snippet` | Nested content |
| `onclick` | `(e?: unknown) => void` | Click handler |

## Why This Widget Exists

The Ripple node schema can generate any widget type. When the AI needs a wrapper that imposes no visual styling — just grouping — `Container` is the correct target. Using `Card` would add borders and padding; using `Flex` or `Grid` would impose a flex/grid display context. `Container` preserves full layout freedom for the children.

## Style Derivation

```svelte
const styleString = $derived.by(() => {
  if (!style) return undefined;
  return Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';');
});
```

`$derived.by()` is used here (rather than the shorter `$derived()` expression form) for the multi-step logic. The `if (!style) return undefined` branch prevents an empty `style=""` attribute from being emitted when no styles are passed — some CSS-in-JS tools treat `style=""` differently from no style attribute.

## Accessibility Note

The template includes `svelte-ignore a11y_click_events_have_key_events` and `a11y_no_static_element_interactions`. These suppressions acknowledge that `Container` deliberately exposes an `onclick` on a non-interactive div. This is an intentional escape hatch — callers that need a clickable container and manage their own keyboard events can use it. The trade-off is that consumers are responsible for keyboard accessibility.

This is different from `Card`, which handles keyboard events internally when `interactive: true`.

## Children via Snippet

`children` uses Svelte 5's `Snippet` pattern. The `{@render children?.()}` call is optional-chained so the component renders an empty div when no children are provided, rather than throwing.

## Known Gaps

- No `role` or `aria-label` prop is exposed. Consumers needing semantic roles (e.g., `role="region"`) must use the `class` prop with a workaround.
- The accessibility suppression comments are a blanket ignore rather than a targeted fix. A future improvement would be to conditionally add `role` and keyboard handlers when `onclick` is set, similar to the `Card` pattern.