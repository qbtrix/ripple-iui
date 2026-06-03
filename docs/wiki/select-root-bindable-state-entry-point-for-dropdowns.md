---
{
  "title": "Select Root — Bindable State Entry Point for Dropdowns",
  "summary": "The top-level select component that owns `open` and `value` state as bindable props, enabling two-way data binding with parent components. It delegates all behavior to bits-ui's `Select.Root` while providing Svelte 5-idiomatic state management.",
  "concepts": [
    "$bindable rune",
    "two-way binding",
    "bind:value",
    "bind:open",
    "SelectPrimitive.Root",
    "value as never",
    "controlled component",
    "uncontrolled state",
    "form library integration",
    "Svelte 5 runes"
  ],
  "categories": [
    "widget",
    "select",
    "state-management",
    "form"
  ],
  "source_docs": [
    "4a7062d01d4cd23e"
  ],
  "backlinks": null,
  "word_count": 608,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `Select` root component is the state container for the entire select widget. It owns two bindable pieces of state — `open` (whether the dropdown is visible) and `value` (the currently selected option) — and wires them into bits-ui's headless primitive. Every other select sub-component (trigger, portal, content, items) is a descendant of this root and reads context from it.

## Implementation

```svelte
<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";

  let {
    open = $bindable(false),
    value = $bindable(),
    ...restProps
  }: SelectPrimitive.RootProps = $props();
</script>

<SelectPrimitive.Root bind:open bind:value={value as never} {...restProps} />
```

## Svelte 5 Bindable Props

Both `open` and `value` use Svelte 5's `$bindable()` rune with default values:

- `open = $bindable(false)` — the dropdown starts closed. The `false` default means the initial state is always collapsed, which is the expected behavior for a select field.
- `value = $bindable()` — no default value is set intentionally. An unset `value` allows bits-ui to treat the select as uncontrolled initially and transition to controlled once a value is bound or selected.

The `$bindable()` pattern means parent components can write:

```svelte
<Select bind:value={myVariable} bind:open={isOpen}>
```

Parent state stays in sync with the select's internal state without manual event handlers.

## The `value as never` Cast

The `bind:value={value as never}` cast deserves explanation. TypeScript infers `value` as `SelectPrimitive.RootProps['value']` which is a specific union type. However, `$bindable()` without an initial value creates a type of `T | undefined`. The `as never` cast suppresses the TypeScript mismatch at the binding site.

This is a common pragmatic workaround in Svelte 5 components where the primitive's type system is stricter than the component's declared prop type. It is safe at runtime because bits-ui handles `undefined` gracefully as an uncontrolled starting state.

## State Architecture

The select's state flows in a single controlled pattern:

```
Parent (bind:value) ↔ Select Root ↔ SelectPrimitive.Root (bits-ui context)
                                        ↓
                              SelectTrigger (reads state)
                              SelectContent (reads state)
                              SelectItem (writes state on select)
```

The bits-ui context provides `open`/`close` methods and the current value to all descendants via Svelte context. No prop drilling is required.

## Relationship to Form Libraries

The `value` binding is the integration point for form libraries. A library like `sveltekit-superforms` or a custom form store can bind `value` to a form field's state:

```svelte
<Select bind:value={$formData.category}>
  <SelectTrigger />
  <SelectContent>...</SelectContent>
</Select>
```

Changes to the select propagate back to the form store automatically via the binding.

## `restProps` Forwarding

All unrecognized props are forwarded to `SelectPrimitive.Root`. This includes:

- `onValueChange` — callback fired when the user selects a new item
- `onOpenChange` — callback fired when open state changes
- `name` — form field name for native form submission
- `required` — marks the field as required for constraint validation
- `disabled` — disables the entire select widget

## Minimal Surface Area by Design

This component has no template markup, no styling, and no event handling. Its entire purpose is to establish type-safe bindable entry points. Keeping it small means the component is easy to understand, easy to test, and unlikely to need changes when bits-ui updates its API — only the type import needs updating.

## Known Gaps

- The `as never` cast is a type suppression that could mask future API mismatches between bits-ui's `RootProps.value` type and the bindable inferred type. A more robust solution would be an explicit generic parameter, but Svelte 5 does not yet support generic component props cleanly.

## Summary

`Select` is the minimal, bindable root for the select system. It exposes `open` and `value` as two-way bindable props, handles the TypeScript friction with a narrow cast, and delegates all behavior to bits-ui. The simplicity is the point.