---
{
  "title": "Textarea Input Component",
  "summary": "A styled multi-line text input that auto-sizes to content, handles validation states visually, and supports dark mode. Exposes bindable `value` and `ref` props and forwards all native textarea attributes.",
  "concepts": [
    "textarea",
    "field-sizing-content",
    "auto-resize",
    "aria-invalid",
    "validation state",
    "disabled state",
    "focus-visible",
    "dark mode",
    "bindable value",
    "WithoutChildren",
    "HTMLTextareaAttributes",
    "data-slot",
    "cn utility"
  ],
  "categories": [
    "form",
    "input",
    "accessibility"
  ],
  "source_docs": [
    "05aa82761828878a"
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

`Textarea` wraps the native HTML `<textarea>` element with a consistent visual treatment for ripple. Unlike a single-line input, a textarea must handle auto-sizing, validation error states, disabled states, and dark mode — all while remaining fully accessible. This component addresses each of those concerns through a carefully composed Tailwind class string.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ref` | `HTMLTextareaElement \| null` | `null` | Bindable DOM reference |
| `value` | `string` | `undefined` | Bindable current text value |
| `class` | `string` | — | Additional classes merged with defaults |
| `data-slot` | `string` | `"textarea"` | Overridable slot identifier |
| `...restProps` | `HTMLTextareaAttributes` (no `children`) | — | Any native textarea attribute |

### `WithoutChildren`

The type uses `WithoutChildren<WithElementRef<HTMLTextareaAttributes>>`. The `WithoutChildren` wrapper removes the `children` prop. Native `<textarea>` does not support child nodes in the DOM (content is controlled by `value`), so stripping `children` from the TypeScript type prevents consumers from accidentally trying to render slot content inside the textarea.

## Key Visual Behaviors

### Auto-Sizing
`field-sizing-content` is a modern CSS property that makes the textarea grow vertically as the user types. Combined with `min-h-16`, the textarea starts at a reasonable 4-row height and expands rather than scrolling internally. This avoids the usability problem of a fixed-height textarea that hides content behind a scroll position.

### Validation States
The `aria-invalid` attribute is the hook for error styling:
- `aria-invalid:ring-destructive/20` — Adds a subtle red ring in light mode
- `dark:aria-invalid:ring-destructive/40` — Increases the ring opacity in dark mode (darker backgrounds need more contrast)
- `aria-invalid:border-destructive` — Turns the border red
- `aria-invalid:ring-3` — Ensures the ring is thick enough to be noticeable

Using `aria-invalid` rather than a custom `invalid` prop keeps the validation signal accessible — screen readers announce invalid fields based on this attribute. The component does not set `aria-invalid` itself; the consuming form must set it based on validation state.

### Disabled States
`disabled:bg-input/50 dark:disabled:bg-input/80 disabled:cursor-not-allowed disabled:opacity-50` — Two separate opacity values for light and dark mode prevent the disabled textarea from appearing too washed out on dark backgrounds. The `cursor-not-allowed` ensures the cursor signals non-interactivity on hover.

### Focus Ring
`focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3` mirrors the focus treatment used across ripple inputs. The `focus-visible` variant ensures the ring only appears during keyboard navigation, not on mouse click — following modern accessibility best practices.

### Overridable `data-slot`
Uniquely, `data-slot` has a default of `"textarea"` but is overridable. This allows a form field wrapper to change the slot name if it embeds the textarea within a compound component, enabling different CSS targeting without forking the component.

## Known Gaps

No TODO or FIXME markers. `field-sizing-content` has limited browser support as of early 2026 — older browsers will fall back to a fixed-height textarea. No polyfill or fallback is provided.