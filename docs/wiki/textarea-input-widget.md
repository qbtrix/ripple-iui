---
{
  "title": "Textarea Input Widget",
  "summary": "A controlled multi-line text input widget that wraps the shadcn Textarea primitive with Ripple's prop and event conventions. It maintains local state synchronized with an incoming `value` prop and surfaces `onchange`, `onfocus`, and `onblur` callbacks for flow integration.",
  "concepts": [
    "textarea",
    "controlled input",
    "local state sync",
    "shadcn primitive",
    "oninput",
    "Svelte 5 runes",
    "$effect",
    "$state",
    "label association",
    "style pass-through",
    "input widget"
  ],
  "categories": [
    "widget",
    "input",
    "form"
  ],
  "source_docs": [
    "15458bb2dc341c55"
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

The `Textarea` widget provides a multi-line free-text input surface in Ripple dashboards. It wraps shadcn's `Textarea` primitive with a consistent API that matches the rest of the input widget family (`Input`, `Switch`, `Select`, etc.), making it safe to use interchangeably inside `NodeRenderer`-driven layouts.

## Props

| Prop | Type | Default | Purpose |
|------|------|---------|--------|
| `value` | `string` | `''` | Controlled text content |
| `placeholder` | `string` | `''` | Hint text when empty |
| `rows` | `number` | `3` | Visible row height |
| `disabled` | `boolean` | `false` | Prevents editing |
| `label` | `string` | — | Optional visible label |
| `id` | `string` | — | For label association |
| `class` / `style` | — | — | Pass-through styling |

Event callbacks follow the `(value?: unknown) => void` signature shared by all Ripple input widgets so the flow engine can wire them uniformly.

## Local State and the $effect Sync Pattern

The widget holds a `localValue = $state(value)` alongside the incoming `value` prop. A `$effect` mirrors any external prop change into `localValue`:

```svelte
let localValue = $state(value);

$effect(() => {
  localValue = value ?? '';
});
```

This pattern exists because Svelte 5 runes do not allow direct two-way binding on a component prop from outside. If the flow engine pushes a new value (e.g., programmatic reset), the effect ensures the `<Textarea>` re-renders with the updated content. Without it, the UI would show stale text after an external state write.

The `?? ''` fallback guards against `undefined` being passed as `value`, which would produce an uncontrolled component warning inside the underlying `<textarea>` element.

## Event Handling

Input events are caught at the `oninput` level (not `onchange`) to give real-time feedback:

```svelte
function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  localValue = target.value;
  onchange?.(target.value);
}
```

Using `oninput` instead of `onchange` ensures `localValue` and the parent flow state stay in sync on every keystroke rather than only on blur. The raw `target.value` is forwarded rather than `localValue` to avoid a one-tick lag that could otherwise cause the emitted value to trail the visible text.

## Style Pass-Through

The `style` prop accepts a `Record<string, string>` (CSS property map) which is derived into an inline style string:

```svelte
const styleString = $derived(
  style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
);
```

This prevents the AI-generated JSON style objects that Ripple node schemas emit from being passed as objects to the DOM, which browsers reject silently.

## Label Rendering

The label is rendered only when the `label` prop is provided, keeping markup minimal for unlabeled uses. The `for={id}` association requires the `id` prop to be set; without it, clicking the label will not focus the textarea.

## Known Gaps

- No `maxlength` or `minlength` prop is exposed. Consumers needing character limits must pass them via `class` or a wrapper.
- `onchange` fires on every keystroke (via `oninput`). There is no `debounce` option, which can generate high-frequency state updates in flows with expensive downstream effects.
- The `onfocus` callback receives `localValue` at the moment of focus, not the event object, which is inconsistent with how native focus events work.