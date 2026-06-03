---
{
  "title": "Button Input Widget",
  "summary": "A fully-featured button widget for Ripple's generative UI runtime, supporting six visual variants, four sizes, loading state with spinner, slot-based leading/trailing icons, and form integration. Designed to prevent double-submission and expose machine-readable state via data attributes.",
  "concepts": [
    "button widget",
    "loading state",
    "double-submission prevention",
    "Svelte snippets",
    "tailwind-variants",
    "aria-busy",
    "data attributes",
    "icon slots",
    "form association",
    "disabled state"
  ],
  "categories": [
    "widget",
    "input",
    "accessibility"
  ],
  "source_docs": [
    "71764d6a5161e06a"
  ],
  "backlinks": null,
  "word_count": 555,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Button.svelte` is Ripple's primary interactive widget for triggering actions. It is built to be spec-driven — all visual properties come in as props — while handling the behavioral complexity of disabled states, loading spinners, icon placement, and form association that basic HTML buttons leave to the implementer.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Button text |
| `children` | `Snippet` | — | Custom slot content |
| `hasChildren` | `boolean` | `false` | Must be `true` to render `children` snippet |
| `leading` / `trailing` | `Snippet` | — | Icon slots before/after label |
| `variant` | `'default' \| 'secondary' \| 'outline' \| 'ghost' \| 'link' \| 'destructive'` | `'default'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg' \| 'icon'` | `'md'` | Size preset |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading/busy state |
| `form` | `string` | — | Associate with a form by id |
| `name` / `value` | `string` | — | Form field name/value |
| `aria-label` | `string` | — | Accessible label for icon-only buttons |
| `onclick` | `(e?: MouseEvent) => void` | — | Click handler |

## Loading State and Double-Submission Prevention

```typescript
const isDisabled = $derived(disabled || loading);
```

When `loading` is true, `isDisabled` becomes true, which both sets the HTML `disabled` attribute and is checked in `handleClick`. This double-guard (attribute + handler check) prevents a race condition where a user clicks fast enough to fire a second event before the browser reflects the disabled attribute. The `handleClick` guard is the last line of defense:

```typescript
function handleClick(e: MouseEvent) {
  if (isDisabled) return;
  onclick?.(e);
}
```

## The `hasChildren` Flag

The `hasChildren` prop deserves explanation. In Svelte 5, snippets passed as props are always defined if the parent provides them, but the spec renderer cannot always detect whether the parent will provide a snippet dynamically. The flag lets the spec system explicitly signal "this button has slot content" without relying on snippet truthiness, which can be unreliable across serialization boundaries.

## Trailing Slot During Loading

```svelte
{#if !loading && trailing}
  <span data-slot="button-trailing">...
```

The trailing slot is hidden during loading. This prevents a trailing chevron or count badge from appearing alongside the loading spinner, which would look visually broken. The leading slot is replaced entirely by the spinner when loading is active.

## Accessibility

- `aria-busy="true"` is set during loading to signal to screen readers that the button is processing.
- `aria-label` is forwarded directly to the button element for icon-only (`size="icon"`) buttons.
- `type` defaults to `"button"` rather than the HTML default of `"submit"`, which prevents accidental form submission when the button is placed inside a `<form>` element.

## Machine-Readable State

The component exposes `data-variant`, `data-size`, and `data-state` attributes on the root element. `data-state` can be `'idle'`, `'disabled'`, or `'loading'`, providing a stable hook for CSS-in-JS, tests, and parent component styling.

## Known Gaps

- No `debounce` or `throttle` option for preventing rapid-fire clicks on async actions.
- The `children` snippet requires `hasChildren=true` to render — forgetting this prop silently shows an empty button.