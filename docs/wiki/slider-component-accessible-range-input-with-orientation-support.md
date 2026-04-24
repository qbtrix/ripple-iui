---
{
  "title": "Slider Component — Accessible Range Input with Orientation Support",
  "summary": "The Slider component wraps bits-ui's SliderPrimitive.Root to render an accessible, styled range input supporting horizontal and vertical orientations, multiple thumbs, and two-way value binding. It composes a track, a filled range bar, and dynamically generated thumb elements using Svelte 5 snippets.",
  "concepts": [
    "slider",
    "range input",
    "bits-ui",
    "multi-thumb",
    "SliderPrimitive",
    "orientation",
    "data-vertical",
    "bindable value",
    "Svelte snippets",
    "TypeScript discriminated union",
    "touch target",
    "ARIA slider"
  ],
  "categories": [
    "ui",
    "slider",
    "form",
    "interaction"
  ],
  "source_docs": [
    "4baa5b18e1624e5f"
  ],
  "backlinks": null,
  "word_count": 530,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Slider provides a familiar drag-to-set-value interface for numeric ranges — volume controls, price filters, progress scrubbers. It is built on top of bits-ui's `Slider` primitive, which handles all keyboard interactions (arrow keys, Home, End, Page Up/Down), ARIA `role="slider"` semantics, and multi-thumb coordination. Ripple's wrapper adds consistent visual styling and orientation-aware layout while keeping the full configurability of the primitive.

## Props

```svelte
let {
  ref = $bindable(null),
  value = $bindable(),
  orientation = "horizontal",
  class: className,
  ...restProps
}: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();
```

- **`ref`** — Bindable reference to the root DOM element, used for measurement or imperative focus.
- **`value`** — Bindable array of numbers, one entry per thumb. Supporting an array (rather than a single number) allows multi-range sliders (e.g., a min/max price range with two thumbs). Leaving it uninitialized (`$bindable()` with no default) lets bits-ui manage the initial value from its own defaultValue prop.
- **`orientation`** — Defaults to `"horizontal"`. Setting `"vertical"` flips the layout using Tailwind's `data-vertical:` variant classes without any conditional logic in the template.
- **`WithoutChildrenOrChild`** — A utility type that strips `children` and `child` from the props type. This component uses the Svelte snippet pattern to define its own internal children structure, so accepting external `children` would conflict.

## The TypeScript Workaround

The comment in the source is worth noting:

```svelte
<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root bind:value={value as never} ...>
```

bits-ui's `RootProps` defines `value` as a discriminated union (the exact type depends on whether the slider is single-value or multi-value). TypeScript cannot reconcile the destructured `$bindable()` binding with the union type at the call site. The `as never` cast is a deliberate escape hatch — it silences a type error that would otherwise block the build while the actual runtime behavior is correct. This is a known limitation of TypeScript's handling of discriminated unions in destructuring contexts, not a logic bug.

## Layout and Orientation

The component uses `data-orientation` attribute and Tailwind `data-*` variants to handle layout without JavaScript conditionals:

- **Horizontal**: `w-full h-1` track, thumbs translate along the X axis
- **Vertical**: `h-full w-1 min-h-40` track (minimum height prevents collapsing to zero), thumbs translate along the Y axis, root switches to `flex-col`

The `data-disabled:opacity-50` class handles the disabled visual state, keeping style logic in CSS rather than conditional rendering.

## Internal Rendering via Snippets

Bits-ui provides a `thumbItems` array through the `children` snippet, where each entry represents one thumb's index. The component iterates over these to render `<SliderPrimitive.Thumb>` elements:

```svelte
{#snippet children({ thumbItems })}
  <span data-slot="slider-track" ...>
    <SliderPrimitive.Range data-slot="slider-range" ... />
  </span>
  {#each thumbItems as thumb (thumb)}
    <SliderPrimitive.Thumb data-slot="slider-thumb" index={thumb.index} ... />
  {/each}
{/snippet}
```

Each thumb's extended click target is achieved via `after:absolute after:-inset-2` — a pseudo-element that expands the interactive area by 8px on each side without affecting layout. This prevents the "impossible to grab" problem for small thumb sizes on touch devices.

## Known Gaps

The `value` TypeScript cast (`as never`) is a workaround for a compiler limitation. If bits-ui refines its type definitions to avoid the discriminated union at the binding site, this cast should be removed.