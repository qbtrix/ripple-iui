---
{
  "title": "NodeRenderer — Recursive UI Tree Renderer",
  "summary": "NodeRenderer.svelte is the recursive engine at the heart of Ripple's render pipeline, responsible for taking a single `UINode` and producing the correct widget component with resolved props, live bindings, event handlers, loop context, and named-slot children. It handles all control-flow node types (`if`, `each`) and falls back to a visible error for unknown widget types.",
  "concepts": [
    "NodeRenderer",
    "recursive rendering",
    "UINode",
    "expression resolver",
    "Svelte 5",
    "$derived",
    "control flow",
    "if node",
    "each node",
    "named slots",
    "childBuckets",
    "event handlers",
    "loop context",
    "widget resolver",
    "StateManager"
  ],
  "categories": [
    "runtime",
    "widget",
    "state-management"
  ],
  "source_docs": [
    "d7a60d7f9edc7e5b"
  ],
  "backlinks": null,
  "word_count": 584,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`NodeRenderer` consumes a single `UINode` and dispatches rendering to one of four paths: control-flow (`if`, `each`), registered widget, or unknown-widget error. It uses Svelte 5's `$derived` / `$effect` primitives throughout for fine-grained reactivity.

## Context Dependencies

NodeRenderer reads four Svelte contexts set by `Ripple.svelte`:

| Key | Type | Purpose |
|-----|------|----------|
| `ui-state` | `StateManager` | Reactive key-value store; props and conditions are evaluated against it |
| `ui-events` | `EventDispatcher` | Processes `on_click`, `on_change`, etc. |
| `ui-data` | `Record<string, unknown>` | External data injected by data sources |
| `ui-widget-resolver` | `(type: string) => any` | Looks up the Svelte component for a given widget type |

## Props Resolution

All prop values pass through `resolveValue(props, ctx)` which substitutes `{expression}` templates against the current state and loop context. The resolver is called inside a `$derived.by()` block so resolved props update whenever referenced state keys change.

A subtle optimization: `nodeHasExpressions` is computed once at component initialization. For static nodes (no expressions in props, no `bind`, no `show`), the `$derived` blocks skip the `stateManager.state` access entirely, preventing unnecessary reactive subscriptions.

The `children` and `class` keys are stripped from `resolvedProps` before spreading onto the widget. This prevents conflicts with the explicit `children` snippet and the separately resolved `resolvedClass`.

For `checkbox` and `switch` nodes with a `bind` path, the `checked` prop is also stripped from `resolvedProps` — the bound value is supplied as `checked` through a separate code path. Without this, the spec-provided initial `checked` value would win over the live bound state after user interaction.

## Bindings

The `boundValue` derived reads the state manager directly for top-level keys (e.g., `{name}` resolves as `stateManager.state["name"]`), which registers a fine-grained reactive dependency. Nested paths (e.g., `{form.address.city}`) fall through to `stateManager.get()`, which is less reactive but correct for reads.

## Event Handlers

`createEventHandler` wraps each `on_*` field into an async closure that calls `eventDispatcher.dispatch()` with a **fresh** `getResolverContext()` call at invocation time — not at setup time. This is critical: if the handler captured context at render time, event handlers in loop items would always reference the context from the first render rather than the current loop iteration state.

## Control Flow

- **`if` nodes** — Evaluate `node.condition` via `evaluateCondition`. Render `node.children` if true, `node.else_children` if false.
- **`each` nodes** — Resolve `node.items` from either `dataStore` or `stateManager`. Inject `item`, `index`, and aliased names (`item_as`, `index_as`) into `loopContext` for child expressions.

## Named Slot Partitioning

`childBuckets` partitions `node.children` by the optional `slot` field into `default`, `header`, and `footer` buckets. Unrecognized slot names emit a `console.warn` and are silently dropped. The three buckets are forwarded as Svelte 5 snippets to the widget component:

```svelte
<WidgetComponent
  {...widgetProps}
  header={headerKids.length > 0 ? headerSnippet : undefined}
  footer={footerKids.length > 0 ? footerSnippet : undefined}
>
  {#snippet children()} ... {/snippet}
</WidgetComponent>
```

Passing `undefined` instead of an empty snippet lets widgets conditionally render slot wrappers (e.g., skip the card footer `<div>` when no footer content is present).

## Self-Recursion

Svelte 5 deprecated `<svelte:self>` in favor of a named self-import. NodeRenderer imports itself as `Self` and uses `<Self node={child} {loopContext} />` for recursion. This is transparent to the runtime but required by the Svelte 5 component model.

## Known Gaps

- The `dataStore` reference in `getResolverContext()` returns a snapshot, not a live proxy — changes to `dataStore` after initial render may not trigger reactive updates in `each` items that read from it.
- `stateManager.get()` for nested paths is less reactive than direct property access; deeply nested bindings may not update on partial mutations.