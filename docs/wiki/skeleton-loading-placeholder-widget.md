---
{
  "title": "Skeleton Loading Placeholder Widget",
  "summary": "A lightweight shimmer placeholder shown by Ripple while a streaming spec has not yet produced a valid first parse. Provides four layout variants — card, dashboard, text, and none — so the UI can match the shape of the content it is waiting for.",
  "concepts": [
    "skeleton loader",
    "streaming spec",
    "loading placeholder",
    "animate-pulse",
    "layout variants",
    "shimmer",
    "Ripple runtime",
    "blank screen prevention",
    "CSS animation",
    "stateless widget"
  ],
  "categories": [
    "widget",
    "display",
    "streaming",
    "loading-state"
  ],
  "source_docs": [
    "79c4fb300ca87bf5"
  ],
  "backlinks": null,
  "word_count": 480,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Skeleton.svelte` is Ripple's answer to the blank-screen problem during streaming. When the runtime is parsing a JSON spec over a streaming connection, there is a window before the first complete widget tree is available. Without a placeholder, users see a jarring empty space. The Skeleton widget fills that gap with an animated shimmer that matches the expected layout shape.

## Why a Dedicated Component?

Streaming specs arrive as partial JSON. The Ripple runtime's parser cannot render anything until it has a valid top-level object. During that window — which can be hundreds of milliseconds on slow connections — the viewport is blank. Skeleton exists specifically for this use case: callers render it while awaiting the first successful parse, then swap it out once the real widget tree is ready.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'card' \| 'dashboard' \| 'text' \| 'none'` | `'card'` | Shape preset |
| `class` | `string` | `''` | Extra classes |

## Variants

Each variant produces a different shimmer layout:

**`card` (default):** A bordered card with a title-width line, followed by two content lines.

```svelte
<div class="rskeleton rskeleton--card animate-pulse rounded-lg border border-border p-4 space-y-3">
  <div class="h-5 bg-muted rounded w-1/3"></div>
  <div class="h-4 bg-muted rounded w-full"></div>
  <div class="h-4 bg-muted rounded w-5/6"></div>
</div>
```

**`dashboard`:** A 3-column, 6-cell grid that mimics a stat dashboard layout.

**`text`:** Two lines of varying width for prose or label content.

**`none`:** Renders absolutely nothing. This variant exists for callers who implement their own loading UI — they still pass `variant="none"` rather than conditionally rendering the Skeleton, so the parent component does not need an `{#if}` guard.

## CSS Namespacing

Every rendered element carries a `rskeleton` base class plus a variant modifier (`rskeleton--card`, `rskeleton--dashboard`, `rskeleton--text`). This namespacing lets application-level CSS target skeletons specifically without clashing with other animated elements, and it makes it easy to globally disable the pulse animation in reduced-motion contexts.

## Animation

All visible variants use Tailwind's `animate-pulse` class, which applies a CSS `opacity` pulse via a keyframe animation. This is deliberately CSS-only — no JavaScript timers or interval-based updates — so the animation continues even if the JavaScript thread is blocked waiting for the network response.

## Data Flow

The Skeleton is typically rendered by a parent Ripple shell component that owns the streaming parse state. Once `parseResult` transitions from `null` to a valid spec, the parent replaces `<Skeleton>` with the rendered widget tree. The Skeleton itself is entirely stateless and props-only.

## Known Gaps

- The `dashboard` variant hardcodes 6 cells (`Array(6)`). There is no prop to match the actual column or cell count of the incoming spec, so on dashboards with fewer or more widgets the skeleton proportions will not match the final layout.
- No `duration` prop to control animation speed; callers who want a faster or slower shimmer must override via CSS.