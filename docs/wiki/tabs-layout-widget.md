---
{
  "title": "Tabs Layout Widget",
  "summary": "A tabbed panel widget wrapping shadcn Tabs that accepts tabs as either plain strings or `{value, label}` objects, normalizes them into a consistent shape, and manages active tab state with support for both internal control and external value binding. Each tab panel only renders its content when active, preventing hidden panels from running their child effects.",
  "concepts": [
    "tabs",
    "tab normalization",
    "active tab state",
    "shadcn Tabs",
    "conditional rendering",
    "external value binding",
    "defaultValue",
    "auto-select",
    "CSS grid tab list",
    "Snippet",
    "keyed each block"
  ],
  "categories": [
    "layout",
    "widget",
    "navigation"
  ],
  "source_docs": [
    "96240a4395697fad"
  ],
  "backlinks": null,
  "word_count": 490,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Tabs` provides a multi-panel navigation surface in Ripple. It wraps shadcn's `Tabs.Root`, `Tabs.List`, `Tabs.Trigger`, and `Tabs.Content` with a simplified API that accepts tabs as raw strings or structured objects — matching the range of formats that AI-generated node schemas may produce.

## Tab Normalization

```typescript
const tabs: Tab[] = $derived(
  rawTabs.map((t, i) =>
    typeof t === 'string'
      ? { value: t, label: t }
      : { value: t.value ?? t.label ?? `tab-${i}`, label: t.label ?? t.value ?? `Tab ${i + 1}` }
  )
);
```

The normalization handles three input forms:
- Plain string `"Revenue"` → `{ value: "Revenue", label: "Revenue" }`
- Object with both fields `{ value: "rev", label: "Revenue" }` → unchanged
- Partial object `{ label: "Revenue" }` (missing value) → value falls back to label

The index-based fallbacks (`tab-${i}`, `Tab ${i + 1}`) prevent keying collisions when both `value` and `label` are undefined, which would otherwise cause Svelte's `{#each}` keyed block to throw.

## Active Tab State

```svelte
let activeTab = $state(externalValue ?? defaultValue ?? '');

$effect(() => {
  if (!activeTab && tabs.length > 0) {
    activeTab = tabs[0].value;
  }
});

$effect(() => {
  if (externalValue !== undefined) {
    activeTab = externalValue;
  }
});
```

Two effects govern active tab initialization:

1. **Auto-select first tab**: If `activeTab` is empty and tabs are available, the first tab is selected. This handles the common case where `defaultValue` is omitted — the first tab should always be visible rather than showing an empty panel.

2. **External value sync**: When `externalValue` changes (flow engine updates the state), `activeTab` mirrors it. The `!== undefined` guard prevents the external sync from running when no external value is provided, avoiding a conflict with `defaultValue`.

## Conditional Panel Rendering

```svelte
{#each tabs as tab (tab.value)}
  <Tabs.Content value={tab.value}>
    {#if activeTab === tab.value}
      {@render children?.()}
    {/if}
  </Tabs.Content>
{/each}
```

The `{#if activeTab === tab.value}` guard inside each `Tabs.Content` is critical. Without it, all tab panels would mount simultaneously, causing all children (including charts, data-fetching widgets, and `$effect` blocks) to run at once. Rendering only the active tab prevents wasted work and side effects from inactive panels.

**Note**: All tabs currently share the same `children` snippet. This means the same content renders regardless of which tab is active. This is intentional for use cases where a data binding (e.g., a filter widget) changes based on `activeTab` — but it means `Tabs` does not support distinct per-tab content natively.

## Column-Spanning Tab List

```svelte
<Tabs.List class="grid w-full" style="grid-template-columns: repeat({tabs.length || 1}, 1fr)">
```

The tab list uses CSS grid with equal-width columns rather than flex, ensuring all tab triggers share the same width regardless of label length. `|| 1` prevents `repeat(0, 1fr)` when the tab array is empty.

## Known Gaps

- All tabs share one `children` snippet. Per-tab distinct content is not supported — a significant limitation for real tabbed UIs.
- No `lazy` prop to defer mounting inactive tab content until first activation.