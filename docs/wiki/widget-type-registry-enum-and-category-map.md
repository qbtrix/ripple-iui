---
{
  "title": "Widget Type Registry — Enum and Category Map",
  "summary": "This module defines the `WidgetType` Zod enum (the complete set of string values the `type` field of a UINode may hold) and the `WIDGET_CATEGORIES` constant that organizes those types into named groups used by documentation, tooling, and the layout engine.",
  "concepts": [
    "WidgetType",
    "WIDGET_CATEGORIES",
    "widget registry",
    "control flow widgets",
    "if widget",
    "each widget",
    "c4 diagram",
    "workflow diagram",
    "research widgets",
    "layout widgets",
    "composite widgets",
    "widget categories"
  ],
  "categories": [
    "schema",
    "widget",
    "rendering"
  ],
  "source_docs": [
    "b3ab9d92d6a8f044"
  ],
  "backlinks": null,
  "word_count": 401,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/schema/widget-types.ts` is the authoritative list of every widget Ripple supports. It serves two consumers: the Zod `WidgetType` enum that validates specs at parse time, and the `WIDGET_CATEGORIES` map that groups widgets for programmatic discovery.

Notably, the `UINode.type` field in `ui-spec.ts` accepts `z.string()` rather than `z.enum(WidgetType)` — this is intentional for cross-project extensibility. The `WidgetType` enum is used directly when stricter validation is needed (e.g., tooling, documentation generators) or when a component needs to exhaustively switch on known types.

## WidgetType Enum

```typescript
export const WidgetType = z.enum([
  // Layout
  'container', 'flex', 'grid', 'card', 'tabs',
  // Display
  'text', 'heading', 'image', 'badge', 'progress', 'avatar', 'stat',
  // Input
  'button', 'input', 'select', 'checkbox', 'switch',
  // Data
  'table', 'chart',
  // Control
  'if', 'each',
  // Diagram
  'c4', 'workflow',
  // Research
  'source-card', 'citation', 'sources-bar', 'discover-card', 'follow-up',
  'company-header', 'ticker', 'kv-table', 'timeline', 'callout', 'news-card'
]);
```

The `'c4'` and `'workflow'` types were added on 2026-04-07 for the diagram category — C4 architecture diagrams and workflow/process diagrams. The research category covers domain-specific widgets for financial and research contexts (tickers, company headers, citations).

## WIDGET_CATEGORIES

```typescript
export const WIDGET_CATEGORIES = {
  layout:    ['container', 'flex', 'grid', 'card', 'tabs', 'dashboard', 'dashboard-slot', 'glass-card'],
  display:   ['text', 'heading', 'image', 'badge', 'progress', 'avatar', 'metric', 'stat', 'feed', 'soul-status'],
  input:     ['button', 'input', 'select', 'checkbox', 'switch'],
  data:      ['table', 'chart'],
  control:   ['if', 'each'],
  composite: ['terminal'],
  diagram:   ['c4', 'workflow'],
  research:  ['source-card', 'citation', 'sources-bar', 'discover-card', 'follow-up',
               'company-header', 'ticker', 'kv-table', 'timeline', 'callout', 'news-card',
               'analyst-bar', 'range-bar']
} as const;
```

The category map includes widgets beyond what `WidgetType` enumerates — `dashboard`, `dashboard-slot`, `glass-card`, `metric`, `feed`, `soul-status`, `terminal`, `analyst-bar`, `range-bar` appear in categories but not in the enum. These are typically composite or extension widgets implemented in specific host applications that extend the base registry. The mismatch is acceptable because category membership is advisory (for docs/tooling) while the enum is the strict validation boundary.

## Control Flow Widgets

`'if'` and `'each'` are structural meta-widgets rather than visual components. `'if'` evaluates a `condition` expression and renders `children` or `else_children`. `'each'` iterates an `items` data source, rendering its `children` template for each entry. They exist in the widget type system to allow the full component tree to be expressed in JSON without requiring separate schema constructs for control flow.

## Known Gaps

- The `WidgetType` enum and `WIDGET_CATEGORIES` are not kept in sync programmatically — several category entries (`dashboard`, `glass-card`, `analyst-bar`, etc.) are absent from the enum. A type-level check between the two collections would catch drift.