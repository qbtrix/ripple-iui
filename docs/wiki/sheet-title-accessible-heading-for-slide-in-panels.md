---
{
  "title": "Sheet Title — Accessible Heading for Slide-in Panels",
  "summary": "SheetTitle wraps the bits-ui Dialog.Title primitive to provide a consistently styled, accessible heading element for sheet panels. It merges design-system typography tokens with an optional `className` override and exposes a bindable `ref` for imperative DOM access.",
  "concepts": [
    "sheet",
    "title",
    "accessibility",
    "aria-labelledby",
    "Dialog.Title",
    "bits-ui",
    "cn utility",
    "bindable ref",
    "data-slot",
    "typography tokens",
    "Svelte 5 runes"
  ],
  "categories": [
    "ui",
    "sheet",
    "accessibility",
    "typography"
  ],
  "source_docs": [
    "805d6146ddb9e5ee"
  ],
  "backlinks": null,
  "word_count": 465,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

Every ARIA dialog (including sheets, which use the `role="dialog"` established by bits-ui) should have a visible, associated label — typically a heading element. Without a title, screen readers announce the dialog with no name, degrading the experience for assistive technology users. `SheetTitle` fills this role: it renders the accessible `<DialogTitle>` element with ripple's standard heading typography already applied.

## Component Design

```svelte
<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SheetPrimitive.TitleProps = $props();
</script>

<SheetPrimitive.Title
  bind:ref
  data-slot="sheet-title"
  class={cn("text-foreground text-base font-medium", className)}
  {...restProps}
/>
```

## Props and Bindings

- **`ref`** (`$bindable(null)`) — Exposes the underlying DOM element reference to the parent. This is used for programmatic focus management or when a parent needs to measure the title height. Defaulting to `null` ensures safe pre-mount access.
- **`class` / `className`** — Renamed from `class` to avoid JavaScript reserved-word collisions in destructuring. Merged with base styles using `cn()` (a clsx/tailwind-merge utility), so consumers can extend without overriding core typography.
- **`...restProps`** — All other TitleProps (e.g., `id`, ARIA attributes, event handlers) pass through to the primitive unchanged.

## Styling

The default classes `text-foreground text-base font-medium` encode three design decisions:

- `text-foreground`: uses the semantic foreground color token rather than a raw `text-gray-900`, ensuring the title adapts correctly to dark mode or any custom theme.
- `text-base`: keeps the title at the body font size rather than an oversized heading, consistent with the compact sheet panel aesthetic.
- `font-medium`: provides visual weight without the heavy `font-bold` that would compete with the sheet's content.

These defaults are intentionally modest — sheets are secondary surfaces and the title shouldn't dominate. Consuming code can escalate the style by passing `className="text-lg font-semibold"` or similar.

## The `data-slot` Pattern

The `data-slot="sheet-title"` attribute is a ripple-wide convention for identifying component sub-parts without relying on fragile CSS class selectors. Parent components (or integration tests) can query `[data-slot="sheet-title"]` to target this element reliably regardless of DOM structure changes.

## Data Flow

SheetTitle is a leaf node — it renders nothing inside itself beyond what consumers provide via slots/children. The bits-ui Dialog.Title primitive renders an `<h2>` by default (configurable via the `as` prop), and associates it with the parent Dialog via `aria-labelledby`, which bits-ui manages automatically through context.

## Accessibility Implications

Using `Dialog.Title` rather than a plain `<h2>` matters because bits-ui wires the title's generated `id` into the dialog's `aria-labelledby` attribute automatically. A plain heading would require manual `id` and `aria-labelledby` synchronization, which is error-prone. This component eliminates that manual wiring.

## Known Gaps

None. The component is complete. One potential enhancement — supporting `as` prop forwarding to let consumers render as `<h3>` or other heading levels — is available through `restProps` already if bits-ui's TitleProps includes it.