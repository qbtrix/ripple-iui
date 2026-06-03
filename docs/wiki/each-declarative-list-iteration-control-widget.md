---
{
  "title": "Each — Declarative List Iteration Control Widget",
  "summary": "A minimal control-flow wrapper that exposes Svelte's native `{#each}` iteration pattern as a named widget usable in Ripple's schema-driven UI. It accepts an `items` prop (used by the schema layer) and a `children` snippet that it unconditionally renders, delegating actual iteration to the caller.",
  "concepts": [
    "control flow",
    "list iteration",
    "Each widget",
    "Svelte snippet",
    "schema-driven UI",
    "declarative rendering",
    "widget registry",
    "passthrough component"
  ],
  "categories": [
    "control",
    "widget",
    "layout"
  ],
  "source_docs": [
    "6942d441f33cc373"
  ],
  "backlinks": null,
  "word_count": 368,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Ripple generates UIs from JSON specs. Those specs describe structure declaratively — including loops. The `Each` widget acts as the schema-level representation of a list iteration, giving spec authors and code generators a named component (`Each`) that signals intent without requiring them to write raw Svelte template syntax.

The design is intentionally thin: `Each` does not perform the loop itself. Instead, iteration happens one level up in Ripple's rendering engine, which reads the `items` prop from the spec, maps each item through the schema renderer, and passes the rendered result as the `children` snippet.

## Implementation

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { items?: any[]; children?: Snippet; }
  let { children }: Props = $props();
</script>
{@render children?.()}
```

The `items` prop is declared in the interface but intentionally not destructured from `$props()`. It exists solely as a schema annotation — a signal to Ripple's engine that this node should expand into multiple rendered children, one per item. The engine consumes `items` before invoking the component; by the time `Each.svelte` runs, the looping is already done.

This separation of concerns means `Each.svelte` remains a trivial passthrough. It avoids re-implementing iteration logic that Svelte's own `{#each}` handles correctly, and it avoids the complexity of managing keyed lists, index tracking, or reactive updates inside the component itself.

## Why Not Just Use `{#each}` Directly?

In a handwritten Svelte app, authors write `{#each items as item}` inline. Ripple's schema renderer cannot embed raw template syntax in JSON. It needs a component name it can look up in the widget registry. `Each` is that registry entry — the named alias that maps to the iteration intent in specs like:

```json
{ "type": "Each", "items": "$state.results", "children": [...] }
```

## Known Gaps

- **No key support**: The component has no mechanism to pass a key expression for optimized list reconciliation. The engine would need to handle keyed diffing externally.
- **items is silently ignored at runtime**: If someone instantiates `Each` directly in a Svelte template (outside the schema engine) and passes `items`, nothing will iterate — the prop is dropped. This could confuse developers who encounter the component in isolation without reading this context.