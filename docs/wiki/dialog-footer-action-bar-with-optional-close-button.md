---
{
  "title": "Dialog Footer — Action Bar with Optional Close Button",
  "summary": "Renders the bottom action area of a dialog, laying out child elements (typically buttons) in a responsive row. Optionally injects a Close button wired to the bits-ui dialog primitive for zero-configuration dismiss behavior.",
  "concepts": [
    "dialog footer",
    "action bar",
    "bits-ui",
    "DialogPrimitive.Close",
    "child snippet",
    "Svelte 5 props",
    "responsive layout",
    "flex-col-reverse",
    "cn utility",
    "WithElementRef",
    "showCloseButton",
    "dismiss pattern"
  ],
  "categories": [
    "dialog",
    "layout",
    "ui-component"
  ],
  "source_docs": [
    "b4d6f0dc51aa1de4"
  ],
  "backlinks": null,
  "word_count": 417,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `DialogFooter` component is the canonical location for a dialog's primary and secondary action buttons. It wraps an HTML `<div>` styled as a muted, bordered strip along the dialog's bottom edge, handling layout concerns so individual usage sites never have to.

## Layout Strategy

The component uses a mobile-first stacking pattern:

```svelte
class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
```

- **Mobile (`flex-col-reverse`)** — Actions stack vertically, with the primary action at the bottom of the visual stack because `col-reverse` reverses DOM order. This keeps the most-important button near the thumb on small screens.
- **Desktop (`sm:flex-row sm:justify-end`)** — Buttons align in a right-anchored horizontal row, the standard OS dialog convention.

The `-mx-4 -mb-4` negative margins bleed the footer to the edges of the dialog content area, and `rounded-b-xl` matches the bottom-corner radius of the parent dialog shell — together these ensure the footer's `bg-muted/50` background fills the bottom without a visible gap.

## Optional Close Button

The `showCloseButton` prop (default `false`) is the key behavioral extension over a plain `<div>`:

```svelte
{#if showCloseButton}
  <DialogPrimitive.Close>
    {#snippet child({ props })}
      <Button variant="outline" {...props}>Close</Button>
    {/snippet}
  </DialogPrimitive.Close>
{/if}
```

This pattern uses bits-ui's `child` snippet slot to thread the Close primitive's internal props (including the click handler that sets the dialog open state to `false`) into the Ripple `Button` component. Without this, you would have to wire the dismiss logic manually at every usage site — a source of bugs where close buttons silently do nothing because they lack the necessary context connection.

The button is intentionally appended after `{@render children?.()}`, so any buttons the caller provides remain before the Close button in the DOM. Because `sm:flex-row sm:justify-end` is used, Close ends up visually rightmost — matching the conventional dismiss-button placement.

## Props and Extensibility

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `ref` | `HTMLDivElement \| null` | `null` | Bindable DOM reference |
| `class` | `string` | — | Merged via `cn()` |
| `children` | snippet | — | Caller-provided buttons |
| `showCloseButton` | `boolean` | `false` | Injects wired Close button |
| `...restProps` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to root div |

The `data-slot="dialog-footer"` attribute enables CSS and automated test selectors to target this structural zone without relying on class names.

## Known Gaps

None identified. The `showCloseButton` prop covers the common case. For dialogs needing more complex dismiss flows (e.g., confirmation before closing), callers should omit `showCloseButton` and provide a custom button connected to the dialog's open binding.