---
{
  "title": "Test Suite: Layout Engine — determineLayout and analyzeData",
  "summary": "Unit tests for the layout engine's two public functions: `determineLayout` (maps a UniversalSpec intent and data shape to a layout string) and `analyzeData` (extracts item count and field names from a spec's data object). Tests cover all intent types, display hint overrides, browse sub-layouts, and data analysis edge cases.",
  "concepts": [
    "layout engine",
    "determineLayout",
    "analyzeData",
    "intent mapping",
    "browse sub-layouts",
    "display hint",
    "form-simple",
    "form-sections",
    "card-grid",
    "image-grid",
    "UniversalSpec",
    "availableFields"
  ],
  "categories": [
    "testing",
    "layout",
    "intent-engine",
    "test"
  ],
  "source_docs": [
    "c7c28816f7c96c21"
  ],
  "backlinks": null,
  "word_count": 602,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This test suite specifies the behavior of the Ripple layout engine, which is responsible for choosing the correct visual layout type from a `UniversalSpec` before rendering begins. The engine powers the automatic layout selection that makes Ripple specs self-describing — an AI can emit an intent like `'browse'` and the engine determines whether that renders as a card grid, image grid, list, or table based on the data shape.

## Test Helpers

```typescript
function spec(overrides: Record<string, any> = {}) {
  return { version: '2' as const, intent: 'browse', title: 'Test', ...overrides } as any;
}
```

The minimal spec factory provides sensible defaults (version, intent, title) so individual tests only need to specify the fields relevant to the case being tested.

## determineLayout — Intent Mapping

### Direct Intent → Layout Mappings

Several intents map 1:1 to a layout type:

| Intent | Expected layout |
|---|---|
| `dashboard` | `dashboard` |
| `custom` | `custom` |
| `search` | `search-results` |
| `action` | `action-buttons` |
| `workspace` | `workspace` |
| `widget` | `widget` |
| `itinerary` | `itinerary` |
| unknown | `list` (fallback) |

The `unknown` fallback test is important: it verifies that unrecognized intents degrade gracefully to a `list` rather than throwing or returning `undefined`.

### Browse Sub-Layouts (Data-Driven)

`browse` intent selects between five layouts based on data shape:

- **No images, few items** → `list`
- **Has image field, few items** → `card-grid`
- **Has image field, 12+ items** → `image-grid`
- **Has icon field but no image** → `icon-grid`

The image-count threshold (`image-grid` for 12+ items) reflects a UX decision: small image sets look better as cards with titles, while large sets benefit from a denser grid layout.

### Form Sub-Layouts

```typescript
it('returns "form-simple" for form intent with few fields', () => {
  const s = spec({ intent: 'form', form_fields: [{ name: 'name' }, { name: 'email' }] });
  expect(determineLayout(s)).toBe('form-simple');
});
it('returns "form-sections" for form intent with many fields', () => {
  const fields = Array.from({ length: 8 }, (_, i) => ({ name: `field${i}` }));
  expect(determineLayout(s)).toBe('form-sections');
});
```

The threshold between `form-simple` and `form-sections` is tested with 2 fields (simple) and 8 fields (sections). The exact threshold (likely 5-6 fields) is verified by implication.

### Confirm Variants

- No form fields → `summary-card`
- With form fields → `form-simple`

### Display Hint Overrides

`display.layout` provides an explicit override:

- `display.layout = 'table'` → `table` (exact passthrough)
- `display.layout = 'auto'` → ignored, auto-determination proceeds
- `display.layout = 'carousel'` → `scrollable-list`
- `display.layout = 'hero'` → `info-hero`
- `display.layout = 'cards'` with images → `card-grid`

The `'auto'` test ensures that the sentinel value does not accidentally override auto-detection.

## analyzeData

Tests for `analyzeData` cover edge cases in how specs provide data:

- No `data` field → `itemCount: 0`, empty `availableFields`
- `data: null` → same
- `data: 'hello'` (non-object) → same
- `data: { other: 'stuff' }` (no `items` array) → same
- `data: { items: [a, b, c] }` → `itemCount: 3`
- Heterogeneous items → union of all keys in `availableFields`
- Non-object items (null, string) in the array → counted but don't contribute fields

The heterogeneous fields test verifies that `availableFields` is built as a union across all items — this is used by `determineLayout` to check if an `image` or `icon` field exists anywhere in the dataset.

## Known Gaps

No TODO or FIXME markers. Tests do not cover specs where `data` is a direct array (without the `{ items: [...] }` wrapper), which may or may not be a supported format depending on the full layout engine implementation.
