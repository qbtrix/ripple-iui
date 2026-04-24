---
{
  "title": "Text Input Widget with Widget Registry Integration",
  "summary": "A fully-featured text input widget that supports labels, error/helper messages, prefix/suffix icon slots, and size variants. Uniquely, it opts into Ripple's WidgetRegistry when given an `id`, enabling the `invoke` flow action to call `focus()` on the input remotely from a spec action handler.",
  "concepts": [
    "text input",
    "WidgetRegistry",
    "focus action",
    "invoke flow",
    "getContext",
    "auto-generated ID",
    "error state",
    "helper text",
    "aria-invalid",
    "aria-describedby"
  ],
  "categories": [
    "widget",
    "input",
    "accessibility",
    "widget-registry"
  ],
  "source_docs": [
    "db659756e854e1ee"
  ],
  "backlinks": null,
  "word_count": 571,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Input.svelte` is Ripple's primary text entry widget. Beyond standard input features, it contains a notable architectural integration: it registers itself with the runtime's `WidgetRegistry` context when an `id` is set, allowing external code — including spec-driven action flows — to programmatically focus the input.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| number` | `''` | Current value |
| `label` | `string` | — | Label text above the input |
| `placeholder` | `string` | `''` | Placeholder text |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url' \| 'search'` | `'text'` | Input type |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Height/font variant |
| `error` | `string` | — | Error message (sets error state) |
| `helper` | `string` | — | Helper text below input |
| `prefix` / `suffix` | `Snippet` | — | Icon/content slots |
| `disabled` / `readOnly` / `required` | `boolean` | `false` | Input attributes |
| `oninput` / `onchange` / `onfocus` / `onblur` | callbacks | — | Event handlers |

## Auto-Generated ID

```typescript
const uid = $props.id();
const resolvedId = $derived(id ?? `ripple-input-${uid}`);
```

`$props.id()` generates a stable component-instance UID. When no explicit `id` prop is provided, the component self-assigns one. This ensures the label's `for` attribute always has a valid target, preventing broken label-input associations on forms that do not explicitly set IDs.

## WidgetRegistry Integration

This is the component's most distinctive feature:

```typescript
const widgetRegistry = getContext<WidgetRegistry | undefined>('ui-widget-registry');
$effect(() => {
  if (!id || !widgetRegistry) return;
  return widgetRegistry.register(id, 'focus', () => {
    inputEl?.focus();
  });
});
```

When the component mounts in a context that provides a `WidgetRegistry` (set up by the Ripple shell), and when an explicit `id` is provided, it registers a `'focus'` action handler. The `invoke` flow action can then call `invoke('my-input-id', 'focus')` from a spec action to focus the input without the parent component holding a direct reference to it. The `$effect` returns its cleanup function, which deregisters the handler on unmount.

The guard `if (!id || !widgetRegistry) return` means the component is safe to use outside a Ripple shell context with no side effects.

## Error and Helper State

The component has a derived `state` that drives both data attributes and styling:

```typescript
const state = $derived(
  error ? 'error' : disabled ? 'disabled' : readOnly ? 'readonly' : 'idle'
);
```

Error takes precedence. When `error` is set, the shell border turns `border-destructive` and the error message is rendered with `aria-invalid="true"` on the input and linked via `aria-describedby` to the error span. This provides both visual and screen reader feedback for validation failures.

When `helper` is set and `error` is not, the helper text renders in muted style. If both are provided, error wins — helper text is suppressed entirely.

## Prefix and Suffix Slots

The prefix and suffix `Snippet` props render inside the input shell container (not outside it), so they appear visually inside the input border. Each carries a `data-slot` attribute for test targeting.

## Known Gaps

- Only `'focus'` is registered with the WidgetRegistry — there is no `'clear'`, `'select-all'`, or `'set-value'` action support.
- The `readOnly` prop is passed as `readonly={readOnly}` with case conversion, which is correct for HTML but may confuse spec authors who expect `readOnly` to match the prop name.