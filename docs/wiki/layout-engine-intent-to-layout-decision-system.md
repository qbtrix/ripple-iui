---
{
  "title": "Layout Engine — Intent-to-Layout Decision System",
  "summary": "The layout engine translates a UniversalSpec's intent, data shape, and display hints into a concrete LayoutType string that drives which Svelte component renders. It acts as the 'smart' middle layer so AI-generated specs don't need to hard-code visual layouts — instead they declare intent and the engine picks the best fit.",
  "concepts": [
    "LayoutType",
    "determineLayout",
    "getLayoutMetadata",
    "analyzeData",
    "LayoutMetadata",
    "LayoutContext",
    "intent-to-layout mapping",
    "display hints",
    "field mapping",
    "card-grid",
    "form-sections",
    "auto layout",
    "browse intent",
    "detail intent"
  ],
  "categories": [
    "layout",
    "intent-engine",
    "rendering",
    "schema"
  ],
  "source_docs": [
    "71ec270ba22f75f9"
  ],
  "backlinks": null,
  "word_count": 543,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The layout engine lives at `lib/intent/layout-engine.ts` and answers a single question: **given this spec, which layout should render?** It is the only place in Ripple that converts a semantic `intent` (browse, detail, form, etc.) into a concrete presentation strategy (card-grid, list-detail, form-wizard, etc.).

The design deliberately separates concern: LLMs declare _what_ data is being presented; the engine decides _how_ to present it. This prevents layout thrashing when specs are regenerated and keeps the AI prompt surface small.

## Key Exports

```typescript
export type LayoutType =
  | 'card-grid' | 'image-grid' | 'icon-grid' | 'media-grid'
  | 'list' | 'list-detail' | 'scrollable-list'
  | 'detail-hero' | 'detail-split' | 'detail-simple' | 'detail'
  | 'article' | 'workout-player'
  | 'form-simple' | 'form-sections' | 'form-wizard'
  | 'search-results' | 'search'
  | 'summary-card' | 'info-hero' | 'info-grid' | 'action-buttons'
  | 'table' | 'workspace' | 'dashboard' | 'widget'
  | 'itinerary' | 'custom';

export function determineLayout(spec: IntentSpec): LayoutType
export function getLayoutMetadata(spec: IntentSpec): LayoutMetadata
export function analyzeData(spec: IntentSpec): { itemCount: number; availableFields: Set<string> }
```

`LayoutMetadata` enriches the decision with rendering config: column count, whether to show images or prices, and compact mode — all derived from the same spec so render components don't need to re-derive them.

## Decision Flow

`determineLayout` first checks for an explicit `display.layout` hint. If it is set and not `'auto'`, it hands off to `mapHintToLayout` which converts user-facing hint strings (`'cards'`, `'grid'`, `'carousel'`) into concrete layout types, taking image availability into account — e.g., `'grid'` becomes `'image-grid'` only when an image field mapping exists.

For the `'auto'` path, the function branches on `intent`:

- **browse** — calls `determineBrowseLayout`, which compares item count and field presence. More than 10 items with images triggers `'image-grid'` (Pinterest style); images plus prices gives `'card-grid'` (e-commerce); icon-only data lands on `'icon-grid'`; text-only falls back to `'list'`.
- **select** — few items with visuals get cards; many items get a scrollable list to avoid overwhelming choices.
- **detail** — image presence drives `'detail-hero'`; text-heavy content uses `'detail-simple'`.
- **form** — field count decides between `'form-simple'` (≤6 fields) and `'form-sections'` (more than 6).
- **confirm / quick_confirm** — returns `'form-simple'` when editable fields are present (allowing corrections before submit), otherwise `'summary-card'` for read-only review.
- **info** — single-item data gets the large `'info-hero'` display; multiple items get `'info-grid'`.
- Special intents (`workspace`, `dashboard`, `widget`, `itinerary`, `custom`) map directly 1:1.

## Data Analysis

`analyzeData` scans `spec.data.items` to build `itemCount` and `availableFields`. The `hasField` helper checks both that a semantic field name has a mapping _and_ that the mapped key actually exists in the data — preventing false positives where a spec declares a field mapping for data that never arrived.

## LayoutMetadata

`getLayoutMetadata` combines the layout decision with display overrides. Column count defaults to `spec.display.columns ?? 2` but overrides to 1 for lists and 3 for image grids. `showImages` and `showPrices` can be suppressed by the spec's display hints even if the data contains those fields.

## Known Gaps

- The `LayoutContext.device` field (`'mobile' | 'tablet' | 'desktop'`) is defined but never consumed — responsive layout selection is future work.
- `'form-wizard'` is defined in the LayoutType union but `determineFormLayout` never returns it; the step-by-step form mode has no trigger condition yet.
- `'detail-split'` (image-left, info-right) is defined but `determineDetailLayout` only chooses between `'detail-hero'` and `'detail-simple'`.