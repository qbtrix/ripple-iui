---
{
  "title": "Toggle Switch Input Widget",
  "summary": "A boolean toggle switch widget that wraps shadcn/ui's Switch primitive with an optional label layout and the same local state sync pattern used by the Checkbox widget. Provides a more visually distinctive alternative to Checkbox for on/off settings.",
  "concepts": [
    "toggle switch",
    "boolean input",
    "local state sync",
    "Svelte 5 effects",
    "$state",
    "$effect",
    "shadcn/ui",
    "controlled component",
    "label association",
    "peer classes"
  ],
  "categories": [
    "widget",
    "input",
    "form"
  ],
  "source_docs": [
    "0279ed32fc8c462d"
  ],
  "backlinks": null,
  "word_count": 478,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Switch.svelte` is Ripple's toggle switch input, used for binary on/off settings where the visual affordance of a sliding toggle is more appropriate than a checkbox. It mirrors the architecture of `Checkbox.svelte` closely — same local state sync pattern, same optional label layout, same callback shape.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | — | DOM id |
| `checked` | `boolean` | `false` | Controlled checked/on state |
| `disabled` | `boolean` | `false` | Disabled state |
| `label` | `string` | — | Optional label text |
| `onchange` | `(value?: unknown) => void` | — | Change callback |
| `class` | `string` | — | Extra classes |
| `style` | `Record<string,string>` | — | Inline style map |

## Local State Sync Pattern

Identical to `Checkbox.svelte`:

```typescript
let localChecked = $state(checked);

$effect(() => {
  localChecked = checked;
});
```

This pattern solves the controlled component problem with shadcn/ui's Switch. The underlying component manages its own visual state. By maintaining `localChecked` as reactive local state and syncing it from the `checked` prop via `$effect`, the widget achieves:

1. **Immediate visual feedback** — user interactions update `localChecked` synchronously via `handleChange` before the parent's state update propagates.
2. **External override support** — if the parent updates `checked` (e.g., a server response resets the toggle), the `$effect` picks it up on the next render cycle.

This pattern is repeated in `Checkbox.svelte` for the same reason, suggesting it is a standard Ripple pattern for wrapping shadcn/ui boolean inputs.

## Change Handling

```typescript
function handleChange(value: boolean) {
  localChecked = value;
  onchange?.(value);
}
```

The callback signature uses `boolean` internally but the prop type is `(value?: unknown) => void`. This mismatch is intentional: Ripple's input widgets all share a common callback signature for compatibility with the generic spec action system, which cannot know the specific type of each widget's value.

## Label Layout

When `label` is provided, the component renders a `<div>` with `flex items-center gap-2` containing the switch and a `<label>` with `for={id}`. This mirrors the Checkbox layout pattern, ensuring visual consistency across boolean input types in the same form.

The label's peer classes (`peer-disabled:cursor-not-allowed peer-disabled:opacity-70`) are inherited from shadcn/ui conventions — when the Switch is disabled, the label becomes visually de-emphasized.

## Structural Simplicity

Compared to `Input.svelte`, the Switch is intentionally minimal: no error/helper message support, no prefix/suffix slots, no WidgetRegistry integration. This reflects its use case — switches are settings toggles, not form fields that need validation feedback.

## Known Gaps

- No `onchange` with typed `boolean` in the prop interface — the `unknown` type loses type safety for consumers outside the Ripple spec system.
- No label-less accessible alternative for icon-only switches (no `aria-label` prop).
- No test file exists in this batch for Switch, unlike Button and Input which have dedicated test files.