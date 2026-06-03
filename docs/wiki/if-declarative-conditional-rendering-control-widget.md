---
{
  "title": "If — Declarative Conditional Rendering Control Widget",
  "summary": "A minimal control-flow widget that wraps Svelte's `{#if}` block as a named, schema-addressable component, enabling conditional rendering in Ripple's JSON spec format. When `condition` is false (or a spec expression resolves falsy), the children snippet is suppressed entirely.",
  "concepts": [
    "conditional rendering",
    "control flow",
    "If widget",
    "Svelte snippet",
    "schema-driven UI",
    "boolean condition",
    "declarative branching",
    "widget registry"
  ],
  "categories": [
    "control",
    "widget",
    "layout"
  ],
  "source_docs": [
    "6691c25331196b85"
  ],
  "backlinks": null,
  "word_count": 397,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Ripple specs are JSON — they cannot contain raw Svelte template syntax. When a spec needs to conditionally show a section of UI (e.g., show an error panel only when an error is present, show a loading spinner only while fetching), the schema engine needs a named component to represent that condition. `If` is that component.

Like `Each`, `If` is a thin bridge between JSON-expressible spec intent and Svelte's native rendering primitives. The spec declares:

```json
{ "type": "If", "condition": "$state.isLoggedIn", "children": [...] }
```

The schema engine evaluates `$state.isLoggedIn` against current runtime state, resolves it to a boolean, and passes it as the `condition` prop.

## Implementation

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { condition?: boolean; children?: Snippet; }
  let { condition = true, children }: Props = $props();
</script>
{#if condition}{@render children?.()}{/if}
```

The default value of `condition` is `true`, which means an `If` node with no resolved condition passes through (renders its children). This is a safe default: failing open ensures specs don't silently hide content due to an unresolved expression, making bugs visible rather than invisible.

## Why Not Inline `{#if}` in the Parent Renderer?

The schema renderer walks a tree of widget nodes. Each node is resolved to a component by type name. Conditional branching needs to be representable as a node type in that tree — otherwise the renderer would need special-case logic to detect conditional structures. Wrapping it in a named component keeps the renderer uniform: every node in the spec tree maps to a widget, including flow-control nodes.

## Interaction with Svelte's Reactivity

Because `{#if condition}` is native Svelte syntax inside the component, Svelte's compiler handles the conditional DOM mounting and unmounting automatically. When `condition` changes (e.g., state updates), Svelte destroys or creates the children subtree. Components inside the children snippet will have their `onMount`/`onDestroy` lifecycle hooks fired correctly — something that a manual `display:none` approach would break.

## Known Gaps

- **No else branch**: The component has no `else` or `elseif` snippet. A spec author needing `else` must use two `If` nodes with inverted conditions, which is verbose and risks desync if the inversion is not maintained.
- **Boolean-only condition**: The prop is typed as `boolean`. The schema engine must coerce any expression result to boolean before passing it — there is no implicit truthy/falsy coercion at the component boundary.