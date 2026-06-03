---
{
  "title": "Checkbox Input Widget",
  "summary": "A controlled checkbox widget that wraps the shadcn/ui Checkbox primitive with optional label layout and a local state sync pattern that bridges Svelte 5 reactive props with the underlying component's internal checked state.",
  "concepts": [
    "checkbox",
    "controlled component",
    "local state sync",
    "Svelte 5 effects",
    "$state",
    "$effect",
    "shadcn/ui",
    "label association",
    "boolean input",
    "reactive props"
  ],
  "categories": [
    "widget",
    "input",
    "form"
  ],
  "source_docs": [
    "cfadd8238b8fcab3"
  ],
  "backlinks": null,
  "word_count": 456,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Checkbox.svelte` provides a controlled boolean input for Ripple's generative UI. It wraps shadcn/ui's `Checkbox` component and adds two things: an optional label with proper `for`/`id` association, and a local state sync mechanism that solves a specific problem with controlled components in Svelte 5.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | — | DOM id (required for label association) |
| `checked` | `boolean` | `false` | Controlled checked state |
| `disabled` | `boolean` | `false` | Disabled state |
| `label` | `string` | — | Optional label text |
| `onchange` | `(value?: unknown) => void` | — | Change callback |
| `class` | `string` | — | Extra classes |
| `style` | `Record<string,string>` | — | Inline style map |

## Local State Sync Pattern

The most important pattern in this component:

```typescript
let localChecked = $state(checked);

$effect(() => {
  localChecked = checked;
});
```

This pattern exists because shadcn/ui's `Checkbox` component is built around its own internal state. If you pass `checked` directly as a prop, the component may not re-render when the parent updates `checked` after user interaction — particularly in cases where the parent's state update is async (e.g., after a server round-trip).

By maintaining `localChecked` as a `$state` variable that is synced from the `checked` prop via `$effect`, the component can:
1. Immediately reflect user interactions (via `handleChange` updating `localChecked`)
2. Accept external overrides from the parent (via the `$effect` sync)

## Change Handling

```typescript
function handleChange(value: boolean) {
  localChecked = value;
  onchange?.(value);
}
```

The handler updates local state first (for immediate visual response) and then calls the parent's `onchange`. This ordering prevents a visible flicker if the parent's state update takes a render cycle.

## Label Layout

When `label` is provided, the component renders a wrapper `<div>` with `flex items-center gap-2`, placing the checkbox and label side by side. The label uses `for={id}` for accessibility — clicking the label text toggles the checkbox. When no label is provided, the bare `Checkbox` is rendered with class/style pass-through.

## Style Pass-Through

The `styleString` derived value converts the `style` Record to an inline style string, maintaining compatibility with Ripple's spec format where styles are provided as key-value objects rather than CSS strings.

## Known Gaps

- The `onchange` callback signature is `(value?: unknown) => void` — the `unknown` type is broader than necessary (the actual value is always `boolean`). This is likely for compatibility with the generic widget callback signature used across all input widgets.
- No `indeterminate` state support (three-state checkbox for "select all" patterns).
- The `$effect` sync will trigger on every render if `checked` is a non-primitive (though for boolean this is fine).