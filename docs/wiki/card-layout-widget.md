---
{
  "title": "Card Layout Widget",
  "summary": "A versatile card container widget with five visual variants, two density modes, and optional interactive behavior. It dynamically renders as either a `\u003cdiv\u003e` or a `\u003cbutton\u003e` depending on whether an `onclick` handler is provided alongside `interactive: true`, ensuring semantic HTML and full keyboard accessibility.",
  "concepts": [
    "card",
    "tailwind-variants",
    "interactive element",
    "svelte:element",
    "keyboard accessibility",
    "aria-pressed",
    "variant",
    "density",
    "Snippet",
    "semantic HTML",
    "layout container"
  ],
  "categories": [
    "layout",
    "widget",
    "accessibility"
  ],
  "source_docs": [
    "39c11c7606a3ed19"
  ],
  "backlinks": null,
  "word_count": 506,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Card` is the primary surface container in Ripple layouts. It composes a header (title + description + custom snippet), a body, and a footer into a rounded, bordered card. Visual variants and density are driven by `tailwind-variants` (`tv`) so the class logic is co-located with the component rather than scattered across template conditionals.

## Visual Variants

```svelte
variant?: 'default' | 'muted' | 'outlined' | 'selected' | 'glass'
density?: 'comfortable' | 'compact'
```

| Variant | Purpose |
|---------|---------|
| `default` | Standard border card |
| `muted` | Subdued background for secondary info |
| `outlined` | Lighter border for low-emphasis surfaces |
| `selected` | Adds a primary-colored ring to indicate active selection |
| `glass` | Frosted-glass effect for overlay or dark-mode contexts |

Density controls padding and gap: `compact` (default) uses `p-4 gap-2`, `comfortable` uses `p-5 gap-3`.

## Interactive Mode and Semantic HTML

The card can become a clickable element, but only when both `interactive: true` and an `onclick` function are provided:

```svelte
const isInteractive = $derived(interactive && typeof onclick === 'function');
```

When interactive, `<svelte:element this="button">` is used instead of `<div>`. This matters because:

- Buttons are natively keyboard-focusable and activatable without extra ARIA.
- Screen readers announce them as interactive controls.
- Setting `role="button"` on a `<div>` requires manual `tabindex` and keyboard handling — error-prone.

The guard requiring `typeof onclick === 'function'` prevents a card with `interactive: true` but no handler from being announced as a button with no action — a confusing state for screen reader users.

## Keyboard Accessibility

For interactive cards, `Enter` and `Space` both trigger `onclick`:

```svelte
function onKeydown(e: KeyboardEvent) {
  if (!isInteractive) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onclick?.(e);
  }
}
```

`e.preventDefault()` on `Space` prevents the page from scrolling — the default browser behavior for spacebar on non-button elements.

## ARIA: Selected State

When `variant === 'selected'` and the card is interactive, `aria-pressed="true"` is set. This communicates the toggled state to assistive technology without requiring a separate ARIA live region.

## Header Conditional Rendering

```svelte
const showHeader = $derived(Boolean(title || description || header));
```

The header `<div>` is only rendered when there is something to show. Without this guard, an empty `card-header` div would consume space and confuse layout consumers that rely on flex gap.

## Style Derivation

The `style` prop (a `Record<string, string>`) is converted to an inline style string via `$derived`. This is the same pattern used across all layout widgets to safely pass CSS from JSON node schemas.

## Slots via Snippets

`header`, `footer`, and `children` are all Svelte 5 `Snippet` props. The `hasChildren` boolean prop exists for cases where the parent knows content will be rendered but cannot pass a snippet directly (e.g., server-side rendering or skeleton placeholders).

## Known Gaps

- The `glass` variant duplicates some of the glass CSS from `GlassCard.svelte`. These two surfaces have not been unified.
- `aria-pressed` is only set for `variant === 'selected'`, but a card could be in other selected-like states without using that variant name.