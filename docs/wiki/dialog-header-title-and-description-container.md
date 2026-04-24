---
{
  "title": "Dialog Header — Title and Description Container",
  "summary": "A minimal layout wrapper that vertically stacks title and description elements at the top of a dialog panel. It provides consistent vertical spacing and a `data-slot` marker for structural targeting.",
  "concepts": [
    "dialog header",
    "flex layout",
    "data-slot",
    "WithElementRef",
    "Svelte 5 runes",
    "cn utility",
    "bindable ref",
    "compositional UI",
    "bits-ui integration"
  ],
  "categories": [
    "dialog",
    "layout",
    "ui-component"
  ],
  "source_docs": [
    "24ec071256705e00"
  ],
  "backlinks": null,
  "word_count": 358,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`DialogHeader` is a thin structural shell that establishes the top region of a dialog. Its job is purely compositional: it groups the `DialogTitle` and `DialogDescription` siblings into a single block with controlled spacing, so callers never have to recreate that layout by hand.

## Layout

The component renders a `<div>` with `flex flex-col gap-2`:

- **`flex-col`** stacks children vertically in DOM order — title first, then description.
- **`gap-2`** (0.5rem) provides consistent internal spacing between those children without relying on margin on individual elements, which would break if either the title or description is absent.

This gap-based approach is intentional: when only a title is present (no description), the gap has no visible effect, so the component degrades cleanly.

## Role as a Slot Boundary

The `data-slot="dialog-header"` attribute is not decorative. It acts as a stable CSS hook and a selector target for automated testing and design-token theming:

```svelte
<div
  bind:this={ref}
  data-slot="dialog-header"
  class={cn("gap-2 flex flex-col", className)}
  {...restProps}
>
  {@render children?.()}
</div>
```

This lets consumers write selectors like `[data-slot="dialog-header"]` in theme overrides or test queries without coupling to class names that may change during restyling.

## Bindable Ref

The `ref` prop (`$bindable(null)`) exposes the underlying DOM node. This is a standard Ripple convention applied to every structural component to support:

- Programmatic focus management inside the dialog sequence
- Third-party animation libraries that need direct DOM access
- Integration tests that need to assert on the node directly

## Props

| Prop | Type | Notes |
|------|------|-------|
| `ref` | `HTMLDivElement \| null` | Bindable DOM reference |
| `class` | `string` | Merged with base classes via `cn()` |
| `children` | snippet | Rendered inside the div |
| `...restProps` | `HTMLAttributes<HTMLDivElement>` | Forwarded to root div |

## Comparison with DialogFooter

Unlike `DialogFooter`, this component has no conditional rendering logic — there is no equivalent of `showCloseButton`. The header is always a passive container. Behavioral wiring (e.g., a close `X` icon in the header) lives in `DialogContent`, which composes the header and manages the close icon separately.

## Known Gaps

None. The component is intentionally minimal — its scope is layout only.