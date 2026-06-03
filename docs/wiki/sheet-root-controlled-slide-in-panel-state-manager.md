---
{
  "title": "Sheet Root — Controlled Slide-in Panel State Manager",
  "summary": "Sheet is the root context provider for the sheet component family, delegating to bits-ui's Dialog.Root while exposing `open` as a bindable Svelte 5 prop for two-way state control. It is the entry point that all other Sheet sub-components depend on for shared dialog state.",
  "concepts": [
    "sheet",
    "Dialog.Root",
    "bits-ui",
    "bindable open",
    "controlled state",
    "uncontrolled state",
    "dialog primitive",
    "Svelte context",
    "focus trap",
    "restProps",
    "SSR hydration"
  ],
  "categories": [
    "ui",
    "sheet",
    "state-management",
    "overlay"
  ],
  "source_docs": [
    "eed2a698206fc1fb"
  ],
  "backlinks": null,
  "word_count": 458,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The Sheet component implements a slide-in panel (sometimes called a "drawer" or "side panel") built on top of the ARIA dialog primitive. Unlike a modal dialog that centers on screen, a sheet slides in from an edge — but it shares the same accessibility semantics: it traps focus, is announced as a dialog, and must have a title and description.

`Sheet` (the root) is the orchestrator. It provides the context that `SheetTrigger`, `SheetPortal`, `SheetContent`, `SheetTitle`, and `SheetDescription` all consume to stay synchronized on open/close state.

## Component Design

```svelte
<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";

  let { open = $bindable(false), ...restProps }: SheetPrimitive.RootProps = $props();
</script>

<SheetPrimitive.Root bind:open {...restProps} />
```

## The `open` Binding

The `open = $bindable(false)` declaration is the critical design decision here. It allows the sheet to work in two modes:

**Uncontrolled mode** — the parent doesn't pass `open`, and the sheet manages its own open/close state internally through user interactions (clicking the trigger, pressing Escape, clicking the overlay). This is the default and covers most use cases.

**Controlled mode** — the parent passes `bind:open={myState}`, gaining full programmatic control:

```svelte
<Sheet bind:open={isSheetOpen}>
  <!-- content -->
</Sheet>

<button onclick={() => isSheetOpen = true}>Open from outside</button>
```

This pattern is essential for cases where the sheet is opened by external actions — navigating to a route, completing a form step, receiving a websocket event — not just by the in-tree trigger button.

Defaulting `open` to `false` prevents the sheet from flashing open during SSR hydration or on initial mount.

## Why Alias `Dialog` as `Sheet`?

At the primitive level, a sheet *is* a dialog — same focus trap, same ARIA role, same keyboard handling. bits-ui's `Dialog` handles all of that. What distinguishes a sheet is purely visual: the content slides in from an edge rather than appearing centered.

Aliasing `Dialog as SheetPrimitive` documents this architectural choice explicitly: the Sheet component family is a styled and named variant of Dialog, not an independent implementation. This means any improvements to bits-ui's Dialog (focus management, animation, ARIA updates) automatically benefit Sheet.

## `restProps` and Extension Points

All `Dialog.RootProps` pass through, including:
- `onOpenChange` — callback fired when open state changes (useful for analytics or side effects)
- `closeOnOutsideClick` — disable to prevent accidental sheet dismissal
- `closeOnEscape` — disable for sheets that require explicit confirmation before closing
- `preventScroll` — controls whether body scroll is locked when open (default: true)

## Data Flow

```
Sheet.Root (open state) ──context──▶ SheetTrigger (toggles open)
                        ──context──▶ SheetPortal (gates rendering)
                        ──context──▶ SheetContent (mounts/unmounts, animations)
                        ──context──▶ SheetOverlay (opacity, click-to-close)
```

No child needs to import or manage state — everything flows from this root via bits-ui's context mechanism.

## Known Gaps

None. The component is a complete delegation wrapper.