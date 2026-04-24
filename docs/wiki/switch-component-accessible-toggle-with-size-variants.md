---
{
  "title": "Switch Component — Accessible Toggle with Size Variants",
  "summary": "The Switch component wraps bits-ui's SwitchPrimitive to deliver an accessible, animated toggle control with `sm` and `default` size variants, two-way `checked` binding, validation error state, and RTL support. It uses CSS data attributes and Tailwind variants for all visual states, keeping zero state logic in the component itself.",
  "concepts": [
    "switch",
    "toggle",
    "bits-ui",
    "SwitchPrimitive",
    "aria-checked",
    "bindable checked",
    "size variants",
    "data attributes",
    "RTL support",
    "touch target",
    "aria-invalid",
    "dark mode",
    "Tailwind variants"
  ],
  "categories": [
    "ui",
    "switch",
    "form",
    "accessibility"
  ],
  "source_docs": [
    "6d545663df6b6457"
  ],
  "backlinks": null,
  "word_count": 479,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

A switch is a binary control — on or off — used for settings, feature flags, and preferences. Unlike a checkbox, a switch implies an immediate side effect (the change takes effect when toggled, not when a form is submitted). The component is built on bits-ui's `SwitchPrimitive`, which provides ARIA `role="switch"`, `aria-checked` management, keyboard activation (Space and Enter), and form integration.

## Props

```svelte
let {
  ref = $bindable(null),
  class: className,
  checked = $bindable(false),
  size = "default",
  ...restProps
}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> & {
  size?: "sm" | "default";
} = $props();
```

- **`checked`** (`$bindable(false)`) — Two-way binding for the toggle state. Defaults to `false` (off) so uncontrolled usage works without explicit initialization.
- **`size`** (`"sm" | "default"`) — An extension prop not present in bits-ui's base `RootProps`, added via intersection type. Controls physical dimensions of the track and thumb using `data-[size=default]` and `data-[size=sm]` Tailwind selectors.
- **`ref`** — Bindable DOM reference for the root element.
- **`WithoutChildrenOrChild`** — Strips `children` and `child` from the type since this component defines its own internal structure.

## Size Variants

| Size | Track | Thumb |
|------|-------|-------|
| `default` | 32 × 18.4 px | 16 × 16 px |
| `sm` | 24 × 14 px | 12 × 12 px |

Both sizes use the same translation formula for thumb movement: `translate-x-[calc(100%-2px)]` when checked, `translate-x-0` when unchecked. The `2px` offset accounts for the `1px` border on each side, ensuring the thumb lands flush against the far edge without overflow.

## Visual State System

All visual states are driven purely by data attributes and Tailwind's `data-*` variant system — no JavaScript conditionals in the template:

- **Checked**: `data-checked:bg-primary` — track fills with the primary brand color
- **Unchecked**: `data-unchecked:bg-input` — track shows the muted input background
- **Focus visible**: `focus-visible:ring-3 focus-visible:border-ring` — keyboard focus ring
- **Validation error**: `aria-invalid:ring-3 aria-invalid:ring-destructive/20` — red ring when the form field is in an error state
- **Disabled**: `data-disabled:cursor-not-allowed data-disabled:opacity-50` — visual and cursor feedback
- **Dark mode**: `dark:data-unchecked:bg-input/80` and `dark:data-checked:bg-primary-foreground` adjustments on the thumb

## RTL Support

The thumb has `rtl:data-[state=checked]:translate-x-[calc(-100%)]` — in right-to-left locales, the checked state moves the thumb to the left instead of right. This is a pure CSS fix with no JS locale detection needed.

## Extended Touch Target

The root element uses `after:absolute after:-inset-x-3 after:-inset-y-2` to create an invisible pseudo-element that extends the clickable area by 12px horizontally and 8px vertically beyond the visible component. This addresses WCAG 2.5.5 (Target Size) for small form controls without affecting layout or visual design.

## Thumb Animation

The thumb uses `transition-transform` for smooth position changes. The Svelte transition lifecycle is handled by bits-ui, not the component itself — the CSS transition fires on every state change automatically.

## Known Gaps

None identified. The `size` prop extension pattern works correctly with the TypeScript intersection type, and all visual states are fully covered.