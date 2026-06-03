---
{
  "title": "Modal Dialog Widget",
  "summary": "A controlled modal dialog widget wrapping the shadcn Dialog primitive, with support for both prop-bound state and flow `invoke` actions via the `WidgetRegistry`. It synchronizes open state bidirectionally — accepting `value` from the outside and emitting `onchange(false)` when dismissed — so the UI state manager stays consistent regardless of how the modal is closed.",
  "concepts": [
    "modal",
    "dialog",
    "shadcn Dialog",
    "WidgetRegistry",
    "invoke action",
    "controlled state",
    "onchange",
    "dismissal sync",
    "cleanup",
    "$effect",
    "flow actions",
    "overlay"
  ],
  "categories": [
    "layout",
    "widget",
    "overlay"
  ],
  "source_docs": [
    "6206fbc46aef1d78"
  ],
  "backlinks": null,
  "word_count": 436,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Modal` renders a dialog overlay in Ripple dashboards. It was introduced alongside the Phase B flow-actions feature and designed for two control modes: direct prop binding (the `value` prop drives open state from the node schema) and remote invocation (a flow node calls `invoke('modal-id', 'open')` to open it programmatically).

## Controlled State with Local Sync

```svelte
let isOpen = $state(value ?? false);

$effect(() => {
  isOpen = value ?? false;
});
```

The local `isOpen` state mirrors the incoming `value` prop. The effect re-syncs on every prop change, handling the case where the node schema's state is reset externally (e.g., a flow node sets `modal.value = false` to close it). Without this sync, the modal could remain open after the backing state was cleared.

## WidgetRegistry Integration

The modal opts into the `WidgetRegistry` context when an `id` is provided:

```svelte
const offOpen = widgetRegistry.register(id, 'open', () => {
  isOpen = true;
  onchange?.(true);
});
const offClose = widgetRegistry.register(id, 'close', () => {
  isOpen = false;
  onchange?.(false);
});
return () => {
  offOpen();
  offClose();
};
```

The registry returns deregistration functions, which the `$effect` cleanup calls when the component unmounts or the `id` changes. Without cleanup, stale registry entries would continue firing after the component is destroyed, causing state mutations on unmounted components.

This pattern enables the `invoke` flow action to open or close the modal by id without needing a direct reactive binding to the modal's state — critical for flow nodes that operate on widgets they cannot reference by component variable.

## Dismissal State Sync

```svelte
function handleOpenChange(open: boolean) {
  isOpen = open;
  if (!open) {
    onchange?.(false);
  }
}
```

When the user dismisses the modal (overlay click or Escape key), the shadcn Dialog calls `onOpenChange(false)`. The modal re-emits `onchange(false)` so the flow engine can update the backing state. Without this, the modal state and UI would desync — the dialog would close visually but the state path would still read `true`.

## Size Variants

```typescript
const sizeClass = $derived({
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg'
}[size ?? 'md']);
```

Size is mapped to Tailwind max-width classes. The `sm:` prefix means these limits only apply on small screens and above — on mobile the dialog takes full width regardless.

## Known Gaps

- `onchange` only emits `false` (on close), never `true` (on open). Flow bindings that need to react to the modal opening must rely on the `invoke` path instead.
- No `onclose` or `onopen` events are exposed separately — a single `onchange` handles both directions unevenly.
- Full-screen mode and custom width overrides are not supported without using the `class` or `style` prop.