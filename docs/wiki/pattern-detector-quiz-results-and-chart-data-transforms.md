---
{
  "title": "Pattern Detector — Quiz, Results, and Chart Data Transforms",
  "summary": "The pattern detector identifies specialized data shapes — quizzes, results summaries, and chart data — from generic intent specs and normalizes them into typed structures that their respective renderer components expect. It was extracted from IntentRenderer to keep detection logic modular and independently testable.",
  "concepts": [
    "QuizOption",
    "ResultsItem",
    "ChartDataPoint",
    "isQuizPattern",
    "isResultsPattern",
    "isChartPattern",
    "toQuizOptions",
    "toResultsItems",
    "toChartData",
    "pattern detection",
    "data transform",
    "field mapping",
    "intent select",
    "intent info"
  ],
  "categories": [
    "intent-engine",
    "data-transform",
    "widget",
    "rendering"
  ],
  "source_docs": [
    "3cd06baa71148eab"
  ],
  "backlinks": null,
  "word_count": 566,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/intent/pattern-detector.ts` is a focused utility that sits between the raw `UniversalSpec` data and the specialized widget renderers. When a spec's intent alone is not enough to determine how to present data — for example, both quiz questions and a standard item picker share the `'select'` intent — this module inspects the actual data shape to make the final call.

The extraction from `IntentRenderer` into its own module was a deliberate modularity decision: intent rendering logic was growing large and these detection/transform functions are independently testable without a Svelte environment.

## Pattern Detection

### Quiz Pattern

```typescript
export function isQuizPattern(
  spec: { intent: string },
  items: Record<string, unknown>[]
): boolean
```

Triggers only when `intent === 'select'` AND at least one item has a `correct` field. The `correct` field is the unique marker that distinguishes quiz options from ordinary select lists. Without this guard, any `select` spec with boolean fields could be misidentified as a quiz.

### Results Pattern

```typescript
export function isResultsPattern(
  spec: { intent: string },
  items: Record<string, unknown>[]
): boolean
```

Targets `intent === 'info'` data where items carry both `label` and `value` keys — the shape of a summary scorecard or stats list. Pure info specs without these fields (e.g., a single block of body text) will not be misrouted to the results component.

### Chart Pattern

```typescript
export function isChartPattern(
  spec: { intent: string; display?: { chart_type?: string } },
  items: Record<string, unknown>[]
): boolean
```

Two entry paths: an explicit `display.chart_type` property overrides all auto-detection; otherwise the function looks for `intent === 'info'` data that has at least one numeric value AND a label-like field (`label`, `name`, `category`, or `title`). The dual-path design lets AI models be explicit when they know chart rendering is needed and still get automatic detection when they omit the hint.

## Data Transformers

### `toQuizOptions`

```typescript
export function toQuizOptions(
  items: Record<string, unknown>[],
  fields?: FieldMapping
): QuizOption[]
```

Respects the spec's `FieldMapping` to resolve which key holds `id` and `title`, with fallback chains for common alternatives (`item.option`, `item.text`). All values are coerced via `String()` / `Boolean()` — raw items from an LLM may have numeric ids or string booleans, and the renderer contract expects typed `QuizOption` values.

### `toResultsItems`

A simple lift with optional `icon` and `highlight` fields. The lack of a `FieldMapping` parameter is intentional: results items follow a fixed contract (`label`, `value`, `icon`, `highlight`) rather than a flexible mapping.

### `toChartData`

```typescript
export function toChartData(
  items: Record<string, unknown>[],
  fields?: FieldMapping
): ChartDataPoint[]
```

Maps `fields.title` → label and `fields.value` or `fields.price` → numeric value, with fallbacks. The spread of the original item (`...item`) preserves any extra keys, allowing chart components to access raw data for tooltips without re-fetching.

## Data Flow

1. IntentRenderer receives a spec and items array
2. Calls `isQuizPattern` / `isResultsPattern` / `isChartPattern` in order (chart checked last because it is the most expensive heuristic)
3. If a pattern matches, calls the corresponding `to*` transformer
4. Passes the typed result to the specialized sub-renderer

## Known Gaps

- The `isChartPattern` numeric detection looks at only the first item (`items[0]`); a heterogeneous dataset where the first item lacks numeric fields would miss the pattern even if subsequent items qualify.
- Field mapping inference in `toChartData` chains `fields.value || fields.price` — this implicit fallback could choose the wrong numeric field in specs that have both a price and a distinct numeric value.