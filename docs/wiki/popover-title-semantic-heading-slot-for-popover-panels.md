---
{
  "title": "Popover Title — Semantic Heading Slot for Popover Panels",
  "summary": "A styled `div` that renders as the title section inside a popover panel, applying medium font weight and exposing a bindable element reference for programmatic access. It uses the standard `cn` utility for class merging and the `WithElementRef` pattern to support imperative DOM operations.",
  "concepts": [
    "popover title",
    "cn utility",
    "WithElementRef",
    "bindable ref",
    "data-slot",
    "Svelte 5 snippets",
    "HTMLAttributes",
    "font-medium",
    "ARIA labelledby",
    "presentational component"
  ],
  "categories": [
    "widget",
    "overlay",
    "typography"
  ],
  "source_docs": [
    "bdf383a530391864"
  ],
  "backlinks": null,
  "word_count": 420,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`popover-title.svelte` provides a consistently styled title region within popover panels. It is a purely presentational component — there is no headless primitive backing it, unlike the popover root or trigger. The title is rendered as a `div` rather than a heading element (`h1`–`h6`) because popovers appear in contextual overlays where the correct heading level depends on the surrounding document outline, which is unknown at the component level.

## Why a Dedicated Title Component

Without a shared title component, each consumer would duplicate the font weight class and potentially diverge in styling over time. By centralizing it here, the design system guarantees visual consistency: all popover titles carry `font-medium` weight by default. Consumers can still override via the `class` prop, which is merged through `cn` rather than replaced.

The `data-slot="popover-title"` attribute enables CSS and test selectors to target this element predictably without relying on structural selectors like `:first-child`, which break when layout changes.

## Component Structure

```svelte
<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="popover-title"
  class={cn("font-medium", className)}
  {...restProps}
>
  {@render children?.()}
</div>
```

## Props

- **`ref`** (`HTMLDivElement | null`, bindable): Exposes the underlying DOM node. Useful for measuring the title height when building animated or dynamic popovers, or for managing focus in complex ARIA scenarios.
- **`class`** (`string`, optional): Merged with the default `font-medium` class via `cn`. Allows consumers to add, remove, or override styles without breaking the base appearance.
- **`children`** (snippet, optional): The title text or rich content. Optional to allow empty-title popovers without throwing.
- **`...restProps`**: Any valid `HTMLDivElement` attribute — `id`, `aria-*`, `data-*`, event handlers — is forwarded.

## Data Flow

This is a leaf component with no internal state. Props flow in, the element renders, and the optional `ref` binding flows back out. Children are rendered using `{@render children?.()}`, the Svelte 5 snippet pattern. The optional chaining (`?.()`) prevents errors when no children are provided.

## Accessibility Notes

Consumers should pair this with an `aria-labelledby` attribute on the popover content container pointing to the title element's `id`. The component does not enforce this automatically — it is the responsibility of the consuming layout to wire up ARIA relationships correctly.

## Known Gaps

No explicit `aria-level` or semantic heading element is used. For accessibility-critical applications, consumers may need to render an actual `<h2>` or `<h3>` inside the children slot rather than relying on this div as the heading.