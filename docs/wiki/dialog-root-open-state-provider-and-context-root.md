---
{
  "title": "Dialog Root — Open State Provider and Context Root",
  "summary": "The root component of the Ripple dialog system. It wraps bits-ui's `DialogPrimitive.Root` and provides a bindable `open` prop that allows parent components to externally control dialog visibility. All other dialog components must be rendered as descendants of this root.",
  "concepts": [
    "dialog root",
    "$bindable",
    "open state",
    "two-way binding",
    "bits-ui Root",
    "dialog context",
    "Svelte 5 runes",
    "controlled component",
    "DialogPrimitive.Root",
    "modal orchestration"
  ],
  "categories": [
    "dialog",
    "state-management",
    "ui-component"
  ],
  "source_docs": [
    "cc60100e895410b9"
  ],
  "backlinks": null,
  "word_count": 282,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Dialog` (also exported as `DialogRoot`) is the orchestration layer for the dialog system. It owns the `open` boolean that controls whether the dialog panel is visible, and it provides the context that all sibling sub-components — `DialogTrigger`, `DialogContent`, `DialogOverlay`, etc. — rely on.

## Bindable `open` Prop

```svelte
let { open = $bindable(false), ...restProps }: DialogPrimitive.RootProps = $props();
```

Using `$bindable(false)` here is critical. Svelte 5's `$bindable` allows the parent component to two-way-bind to the `open` state:

```svelte
<Dialog bind:open={myOpenState}>
  ...
</Dialog>
```

Without `$bindable`, the parent could pass `open` as a read-only prop but could not react to internal state changes — the dialog close button would update `open` internally, but the parent's variable would remain stale. This would cause bugs in any flow where the parent needs to know when the user dismissed the dialog (e.g., to reset a form, log an analytics event, or update URL state).

The default of `false` means dialogs are closed by default, which is the correct starting state — you never want a dialog to render open on mount unless explicitly told to.

## Role in the Component Tree

`Dialog.Root` must be an ancestor of all other dialog sub-components. bits-ui uses Svelte context internally to wire up the open state, ARIA relationships, and close handlers. Rendering a `DialogContent` or `DialogTrigger` outside a `Dialog.Root` would result in a runtime error or silently broken behavior (no open/close functionality).

## Usage Pattern

```svelte
<Dialog bind:open>
  <DialogTrigger>Open</DialogTrigger>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogDescription>This cannot be undone.</DialogDescription>
      </DialogHeader>
      <DialogFooter showCloseButton />
    </DialogContent>
  </DialogPortal>
</Dialog>
```

## Known Gaps

None. The component is a pure delegation wrapper with one purposeful addition: the `$bindable` default on `open`.