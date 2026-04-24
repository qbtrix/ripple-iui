---
{
  "title": "Test Suite for NodeRenderer Named Slot Routing",
  "summary": "This test suite verifies that `NodeRenderer` correctly routes child nodes to named slots (`header`, `footer`) or the default body slot based on each child's optional `slot` field. It covers default routing, named-slot placement, multi-child same-slot stacking, unknown slot silencing, and regression-guards for specs written before slots were introduced.",
  "concepts": [
    "NodeRenderer",
    "named slots",
    "child routing",
    "data-slot",
    "testing-library",
    "vitest",
    "Ripple",
    "UINode",
    "card widget",
    "childBuckets",
    "regression guard",
    "slot partitioning"
  ],
  "categories": [
    "testing",
    "widget",
    "layout",
    "test"
  ],
  "source_docs": [
    "42211beb1bdfe60b"
  ],
  "backlinks": null,
  "word_count": 429,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This is a test suite for the named-slot child routing feature of `NodeRenderer`. It uses `@testing-library/svelte` to render `Ripple` with small card specs and asserts DOM structure via `data-slot` attributes.

## Test Helper

```typescript
function renderSpec(ui: UINode) {
  return render(Ripple, { props: { spec: { ui } } });
}
```

The helper wraps the full `Ripple` entry point (rather than `NodeRenderer` directly) to exercise the complete rendering stack, ensuring context wiring, widget resolution, and slot partitioning all work end-to-end.

## Test Cases

### Default Slot Routing
**"children without slot go to the default body"** — Verifies that a child with no `slot` field renders inside `[data-slot="card-body"]`. This is the baseline for all pre-existing specs.

### Named Header Slot
**"child with slot='header' lands in card-header, not card-body"** — Verifies slot-aware partitioning: a `stat` widget with `slot: 'header'` renders in `[data-slot="card-header"]`, and an unslotted `text` widget stays in `[data-slot="card-body"]`. Critically, it also asserts the body does NOT contain the header content — confirming the partitioning is exclusive.

### Named Footer Slot
**"child with slot='footer' lands in card-footer"** — Mirrors the header test for the footer slot.

### Multi-Child Same Slot
**"multiple children with same slot all render in that slot"** — Asserts that more than one child can share a named slot (e.g., two `text` nodes both with `slot: 'header'`). This matters because slot contents are arrays in `NodeRenderer`'s `childBuckets` derived state.

### Unknown Slot Silencing
**"unknown slot on a widget that lacks that slot is dropped silently"** — A child with `slot: 'sidebar'` (not a known slot name) should not appear in the body or crash the renderer. This guards against spec errors causing visible artifacts. `NodeRenderer` emits a `console.warn` for unknown slots but does not throw.

### Regression Guard
**"existing no-slot specs render identically"** — A spec authored before the slot feature was introduced (children array with no `slot` fields) must render exactly as before. This is an explicit regression guard: the card title lands in `[data-slot="card-header"]` and the body text in `[data-slot="card-body"]` — matching the pre-slot rendering contract.

## Why This Test Suite Exists

The slot feature was added after the initial NodeRenderer implementation. Any change to `childBuckets` partitioning logic, snippet forwarding, or widget prop merging risks silently breaking existing specs. These tests lock down the behavioral contract so refactors in `NodeRenderer.svelte` surface immediately.

## Known Gaps

No tests cover slot behavior for non-card widgets (e.g., `table`, `tabs`). Slot names are currently hardcoded to `header`, `footer`, and `default` — tests for widgets that might define different slot names (e.g., `aside`, `toolbar`) do not exist yet.