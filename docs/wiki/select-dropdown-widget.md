---
{
  "title": "Select Dropdown Widget",
  "summary": "A single-select dropdown widget that wraps shadcn/ui's Select primitive and normalizes a flexible options format — accepting either plain strings or `{value, label}` objects — into a consistent internal structure. Renders an optional label and surfaces the selected label text in the trigger button.",
  "concepts": [
    "select dropdown",
    "options normalization",
    "controlled select",
    "shadcn/ui",
    "selected label derivation",
    "placeholder",
    "onValueChange guard",
    "string options",
    "single-select",
    "form input"
  ],
  "categories": [
    "widget",
    "input",
    "form"
  ],
  "source_docs": [
    "9a3c3feec9e4ab0e"
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

`Select.svelte` is Ripple's dropdown selection widget. It bridges the gap between the spec-friendly options format (which may be simple string arrays) and shadcn/ui's `Select` component, which requires structured `{value, label}` objects.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | Currently selected value |
| `options` | `(string \| {value: string; label: string})[]` | `[]` | Option list |
| `placeholder` | `string` | `'Select...'` | Shown when no value is selected |
| `label` | `string` | — | Optional label above the trigger |
| `disabled` | `boolean` | `false` | Disabled state |
| `onchange` | `(value?: unknown) => void` | — | Selection callback |
| `id` | `string` | — | ID for the trigger element |
| `class` | `string` | — | Extra classes |
| `style` | `Record<string,string>` | — | Inline style map |

## Options Normalization

The core defensive pattern is the options normalizer:

```typescript
const normalizedOptions = $derived(
  options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
);
```

Spec authors writing JSON can express options two ways: `["red", "green", "blue"]` (concise string array) or `[{"value": "red", "label": "Red"}]` (labeled objects). The normalizer collapses both into the `{value, label}` format that shadcn/ui requires. Without this, spec authors would need to always write the verbose object form.

When a string option is normalized, both `value` and `label` are set to the same string. This is intentional: for simple options, the display value and the submitted value are the same.

## Selected Label Derivation

```typescript
const selectedLabel = $derived(
  normalizedOptions.find(o => o.value === value)?.label ?? placeholder
);
```

The trigger button displays this derived label rather than the raw `value`. This matters when options have different display labels than their values (e.g., `{value: 'USD', label: 'US Dollar'}`). The `?? placeholder` fallback means the placeholder text is shown whenever `value` is empty or does not match any option — including the initial empty-string default.

## Change Handler Guard

```typescript
function handleChange(newValue: string | undefined) {
  if (newValue !== undefined) {
    onchange?.(newValue);
  }
}
```

The `shadcn/ui` Select's `onValueChange` callback can fire with `undefined` when the selection is cleared programmatically. The guard prevents passing `undefined` to the parent's `onchange`, maintaining a cleaner string-only contract for spec event handlers.

## Rendering Structure

```svelte
<div class="space-y-2">
  {#if label}<span class="text-sm font-medium">...</span>{/if}
  <Select.Root type="single" {value} onValueChange={handleChange} {disabled}>
    <Select.Trigger {id} class={cn('w-full', className)}>
      {selectedLabel}
    </Select.Trigger>
    <Select.Content>
      {#each normalizedOptions as option}
        <Select.Item value={option.value}>{option.label}</Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
</div>
```

The trigger is full-width by default (`w-full`), which suits form layouts where selects fill their container. The `type="single"` on `Select.Root` is explicit, preventing accidental multi-select if the underlying component's default changes.

## Known Gaps

- No option groups support — all options render as a flat list.
- No `searchable` prop for filtering long option lists.
- The `label` element is a `<span>` rather than a `<label>`, so it is not programmatically associated with the select trigger for accessibility tools.