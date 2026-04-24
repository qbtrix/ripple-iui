---
{
  "title": "Sheet Trigger — Open Control for Slide-in Panels",
  "summary": "SheetTrigger wraps the bits-ui Dialog.Trigger primitive to provide a typed, ref-aware open control for sheet components. It delegates all open/close state management to the bits-ui context and exposes `data-slot` for consistent component targeting.",
  "concepts": [
    "sheet",
    "trigger",
    "Dialog.Trigger",
    "bits-ui",
    "aria-expanded",
    "asChild",
    "focus management",
    "data-slot",
    "bindable ref",
    "Svelte context",
    "keyboard handling"
  ],
  "categories": [
    "ui",
    "sheet",
    "accessibility",
    "interaction"
  ],
  "source_docs": [
    "5e22ce7c04bbe478"
  ],
  "backlinks": null,
  "word_count": 450,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

A sheet panel needs a button or other interactive element to open it. Rather than wiring `onclick` handlers and managing state manually, `SheetTrigger` uses bits-ui's `Dialog.Trigger` primitive, which automatically communicates with the parent `Sheet.Root` via Svelte context. This keeps open/close logic centralized and removes the need for consumers to manage booleans directly in most scenarios.

## Component Design

```svelte
<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";

  let { ref = $bindable(null), ...restProps }: SheetPrimitive.TriggerProps = $props();
</script>

<SheetPrimitive.Trigger bind:ref data-slot="sheet-trigger" {...restProps} />
```

The component is intentionally minimal — it holds no local state, performs no logic transformations, and adds only two things over the raw primitive: a bindable `ref` and a `data-slot` attribute.

## Props and Bindings

- **`ref`** (`$bindable(null)`) — Gives parent components direct access to the trigger's DOM element. This is useful for returning focus to the trigger after the sheet closes (a required accessibility pattern for dialogs), or for measuring trigger position to animate the sheet from that point. Defaulting to `null` prevents null-reference errors before the component mounts.
- **`...restProps`** — The full `TriggerProps` type from bits-ui includes `children`, event handlers, ARIA overrides, `asChild` (for rendering as a different element), and standard HTML button attributes. Everything passes through unmodified.

## Why Not Just Use `<button onclick={() => open = true}`?

The context-based approach has several advantages over manual event wiring:

1. **Automatic ARIA state**: bits-ui's trigger sets `aria-expanded` based on the sheet's open state and `aria-haspopup="dialog"` automatically. Manual buttons require these to be maintained by hand.
2. **Keyboard handling**: The `Dialog.Trigger` primitive handles `Enter` and `Space` keys correctly, including preventing default scroll-on-space behavior.
3. **`asChild` flexibility**: Consumers can pass `asChild` to render the trigger as any element (a link, a div, a custom component) while keeping the ARIA semantics.
4. **Focus management**: bits-ui's dialog system tracks the trigger element to return focus when the sheet closes, which is required for WCAG 2.1 success criterion 2.4.3.

## The `data-slot` Pattern

`data-slot="sheet-trigger"` follows ripple's universal sub-part identification convention. It enables:
- CSS targeting: `[data-slot="sheet-trigger"] { ... }` in global stylesheets
- Test selection: `page.getByTestId` equivalents without adding separate `data-testid` attributes
- Parent-level style injection: a parent `Sheet` wrapper can style `[data-slot="sheet-trigger"]` as a child selector

## Data Flow

```
User click → SheetTrigger → Dialog.Trigger (bits-ui) → context signal → Sheet.Root → open = true → Sheet.Portal renders content
```

The trigger itself never holds open state — it fires an event consumed by the bits-ui dialog root via Svelte context, keeping state ownership at the root level.

## Known Gaps

None. The component is complete. The `asChild` prop is available through restProps for consumers who need to render a non-button trigger.