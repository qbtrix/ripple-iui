# Intent System

The intent system powers UniversalSpec v2.0, providing intelligent layout selection, pattern detection, and multi-step flow management.

## Layout Engine

The layout engine (`src/lib/intent/layout-engine.ts`) automatically selects the best layout based on intent type, data shape, and display hints.

### How Layout is Determined

1. If `display.layout` is set to anything other than `'auto'`, that hint is used
2. Otherwise, the engine analyzes the intent and data:
   - **Intent type** — each intent has default layout strategies
   - **Data shape** — which fields are present (images, prices, icons)
   - **Item count** — few items vs many changes the layout

### Layout Types

| Layout | Used For |
|--------|----------|
| `card-grid` | Items with images in a grid |
| `image-grid` | Image-heavy content (10+ items) |
| `icon-grid` | Items with icons but no images |
| `media-grid` | Video/media content |
| `list` | Text-only items |
| `list-detail` | List with detail panel |
| `scrollable-list` | Horizontal scroll (8+ selectable items) |
| `detail-hero` | Single item with hero image |
| `detail-split` | Image left, info right |
| `detail-simple` | Text-focused detail |
| `form-simple` | Forms with 6 or fewer fields |
| `form-sections` | Forms with 7+ fields |
| `form-wizard` | Step-by-step forms |
| `search-results` | Search interface |
| `summary-card` | Confirmation/review |
| `info-hero` | Single info item |
| `info-grid` | Multiple info items |
| `action-buttons` | Action triggers |
| `table` | Tabular data |
| `workspace` | Tool interfaces |
| `dashboard` | Widget dashboard |
| `itinerary` | Timeline/travel plans |
| `custom` | Raw UINode tree |

### Field Mapping Influence

The layout engine uses `fields` mapping to understand data semantics:

```json
{
  "fields": {
    "title": "name",
    "image": "photo_url",
    "price": "cost"
  }
}
```

- Has `image` field → prefers grid/card layouts
- Has `price` field → prefers card-grid
- Has `icon` field → prefers icon-grid
- No visual fields → prefers list

### API

```typescript
import { determineLayout, analyzeData, getLayoutMetadata } from '@ripple-ui/svelte/intent';

const layout = determineLayout(spec);        // Returns LayoutType
const { itemCount, availableFields } = analyzeData(spec);
const metadata = getLayoutMetadata(spec);    // Full layout config
```

## Pattern Detection

The pattern detector (`src/lib/intent/pattern-detector.ts`) identifies semantic patterns from data structure.

### Quiz Pattern

Detected when:
- Intent is `select`
- Items have a `correct` field

```typescript
import { isQuizPattern, toQuizOptions } from '@ripple-ui/svelte/intent';

if (isQuizPattern(spec, items)) {
  const options = toQuizOptions(items, spec.fields);
  // options: [{ id, text, correct }]
}
```

### Results Pattern

Detected when:
- Intent is `info`
- Items have `label` and `value` fields

```typescript
import { isResultsPattern, toResultsItems } from '@ripple-ui/svelte/intent';

if (isResultsPattern(spec, items)) {
  const results = toResultsItems(items);
  // results: [{ label, value, icon?, highlight? }]
}
```

### Chart Pattern

Detected when:
- `display.chart_type` is explicitly set, OR
- Intent is `info` AND items have numeric values AND a label field

```typescript
import { isChartPattern, toChartData } from '@ripple-ui/svelte/intent';

if (isChartPattern(spec, items)) {
  const chartData = toChartData(items, spec.fields);
  // chartData: [{ label, value }]
}
```

## Chain Executor

The `ChainExecutor` (`src/lib/intent/chain-executor.svelte.ts`) manages multi-step intent flows with browser-like navigation.

### Creating a Chain

```typescript
import { ChainExecutor } from '@ripple-ui/svelte/intent';

const executor = new ChainExecutor(rootSpec);
```

### Navigation

```typescript
// Advance to next step
const nextSpec = executor.advance(selectedItem, formData, idField);

// Go back
const prev = executor.back();   // Returns { spec, state } or null

// Go forward (after going back)
const next = executor.forward(); // Returns { spec, state } or null
```

### Reactive Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentSpec` | `UniversalSpec \| null` | Current active spec |
| `currentState` | `ChainState \| null` | Current state snapshot |
| `canGoBack` | `boolean` | Whether back navigation is available |
| `canGoForward` | `boolean` | Whether forward navigation is available |
| `hasNextChain` | `boolean` | Whether there are more steps |
| `historyLength` | `number` | Total history entries |
| `estimatedTotalSteps` | `number \| undefined` | Total steps (undefined if dynamic) |

### Chain State

Each history entry stores a state snapshot:

```typescript
interface ChainState {
  selected: unknown;                 // Selected item
  formData: Record<string, unknown>; // Form data
  displayLabel?: string;             // For breadcrumbs
}
```

### Quiz Scoring

Built-in quiz score tracking for quiz-pattern flows:

```typescript
executor.recordQuizAnswer(true);   // Record correct answer
executor.recordQuizAnswer(false);  // Record wrong answer
executor.quizScore;                // { correct, wrong, answers[] }
executor.resetQuizScore();         // Reset for new quiz
```

### Chain Map (Selection-Based Routing)

For branching flows based on selection:

```json
{
  "intent": "select",
  "data": { "items": [{ "id": "a" }, { "id": "b" }] },
  "chain_map": {
    "a": { "intent": "detail", "title": "Option A details" },
    "b": { "intent": "form", "title": "Option B form" }
  }
}
```

The executor looks up the selected item's ID in `chain_map` before falling back to `chain`.
