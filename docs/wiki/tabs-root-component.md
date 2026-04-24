---
{
  "title": "Tabs Root Component",
  "summary": "The root orchestrator for the tabs system, wrapping `bits-ui`'s `Tabs.Root` primitive with a bindable `value` prop and orientation-aware flex layout. Serves as the context provider for all child tab components.",
  "concepts": [
    "tabs root",
    "bindable value",
    "active tab",
    "flex layout",
    "orientation",
    "group/tabs",
    "context provider",
    "bits-ui",
    "data-orientation",
    "flex-col",
    "two-way binding",
    "Svelte 5 runes"
  ],
  "categories": [
    "tabs",
    "navigation",
    "state-management"
  ],
  "source_docs": [
    "d09516180a1527e2"
  ],
  "backlinks": null,
  "word_count": 426,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Tabs` (exported as `Root`) is the top-level container that all other tab components must be nested within. It delegates all state management and accessibility wiring to `bits-ui`'s `Tabs.Root`, adding only layout classes and a default provider wrapper.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ref` | `HTMLElement \| null` | `null` | Bindable DOM reference to the root element |
| `value` | `string` | `""` | Bindable active tab value — two-way bindable |
| `class` | `string` | — | Extra classes merged with layout defaults |
| `...restProps` | `TabsPrimitive.RootProps` | — | All bits-ui Root props |

## The `value` Binding

`value = $bindable("")` is the key behavioral prop. It holds the `value` string of the currently active tab. Marking it `$bindable` means parents can do:

```svelte
<Tabs bind:value={activeTab}>
```

and the parent's `activeTab` variable will stay synchronized with the user's tab selection. This is important for use cases where the active tab needs to drive other parts of the UI — for example, showing different action buttons based on the selected tab, or persisting the selected tab to a URL parameter.

The empty string default (`""`) means no tab is pre-selected out of the box. Consumers must either bind a pre-populated value or set a `defaultValue` via `restProps` if they want an initial active tab.

## Layout Classes

The root element receives `gap-2 group/tabs flex data-[orientation=horizontal]:flex-col`:

- **`flex`** — Establishes a flex container so the list and content panels line up.
- **`data-[orientation=horizontal]:flex-col`** — When `bits-ui` sets `data-orientation="horizontal"` (the default), the flex direction becomes column, stacking the tab list above the content panels. This is counterintuitive at first — "horizontal" means the tabs are arranged horizontally in a row, but the list-then-content stack is vertical.
- **`gap-2`** — Adds spacing between the tab list row and the content panel below it.
- **`group/tabs`** — Establishes a named Tailwind group that child components (`TabsList`, `TabsTrigger`) reference via `group-data-*/tabs:` selectors to inherit orientation and variant context without prop drilling.

## Provider Wrapping

The component wraps the primitive in a `TooltipProvider`-style implicit provider. In the current implementation, `bits-ui`'s `Tabs.Root` itself is the context provider for tab state. Child components access the active value and orientation through Svelte context automatically.

## Known Gaps

No TODO or FIXME markers. The `value` default of `""` may cause subtle bugs if a tab's `value` prop is accidentally set to an empty string — it would appear selected on initial render. Consumers should use non-empty, unique strings for all tab values.