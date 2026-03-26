# UniversalSpec Reference (v2.0)

The UniversalSpec is the high-level, intent-based specification format. Instead of specifying exact layouts, you declare *what* the UI should accomplish, and Ripple's layout engine picks the best rendering.

## Top-Level Structure

```typescript
interface UniversalSpec {
  id?: string;                                 // Unique identifier
  version: '2.0';                              // Schema version

  // High-level behavior
  intent: IntentType;                          // What the UI should do
  lifecycle?: LifecycleConfig;                 // How the UI persists

  // Content
  title?: string;                              // Display title
  description?: string;                        // Description text
  theme?: ThemeOverrides;                      // Color/appearance overrides

  // Data
  data?: Record<string, any> | DataFetcher;    // Inline data or remote fetcher
  fields?: Record<string, string>;             // Field mapping (semantic → data path)

  // Layout
  display?: DisplayHints;                      // Layout preferences

  // Escape hatch
  ui?: UINode;                                 // Raw widget tree (for intent='custom')

  // Interactions
  selection?: 'single' | 'multiple' | 'none';  // Selection mode

  // Actions
  on_select?: any;                             // Handler when item is selected
  on_complete?: any;                           // Handler when flow completes

  // Chaining
  chain?: UniversalSpec;                       // Next step in a multi-step flow
}
```

## Intent Types

| Intent | Description | Typical Layout |
|--------|-------------|----------------|
| `browse` | Grid/list of items for exploration | card-grid, image-grid, list |
| `select` | Pick one or more items | card-grid, list, scrollable-list |
| `detail` | View a single item's details | detail-hero, detail-split, detail-simple |
| `form` | Input/edit data | form-simple, form-sections |
| `confirm` | Review and submit | summary-card |
| `info` | Read-only information | info-hero, info-grid |
| `search` | Search interface | search-results |
| `action` | Trigger an action | action-buttons |
| `custom` | Raw UI control (escape hatch) | custom (renders UINode tree) |
| `workspace` | Tool-based interface | workspace |
| `dashboard` | Persistent dashboard | dashboard |

## Lifecycle Types

| Type | Behavior |
|------|----------|
| `ephemeral` | Inline, disappears after completion (default) |
| `tool` | Modal/panel, stays open until dismissed |
| `persistent` | Pinned to sidebar or dashboard |

```typescript
interface LifecycleConfig {
  type: 'ephemeral' | 'tool' | 'persistent';
  id?: string;       // Required for tool/persistent to track state
  icon?: string;     // Icon for sidebar/tool-panel
  label?: string;    // Label for sidebar/tool-panel
}
```

## Display Hints

Guide the layout engine without fully overriding it:

```typescript
interface DisplayHints {
  layout: 'auto' | 'grid' | 'list' | 'masonry' | 'carousel' | 'hero' | 'split';
  columns?: number;                            // Column count for grid layouts
  density: 'compact' | 'comfortable' | 'spacious';
  item_template?: UINode;                      // Custom template for list/grid items
}
```

## Field Mapping

Tell the layout engine which data fields map to semantic roles:

```json
{
  "fields": {
    "title": "name",
    "image": "thumbnail_url",
    "description": "summary",
    "price": "cost",
    "id": "product_id"
  }
}
```

The layout engine uses these to decide whether to show images (card-grid vs list), prices, etc.

## Intent Chaining

Multi-step flows are defined by nesting `chain` specs:

```json
{
  "intent": "select",
  "title": "Choose a category",
  "data": { "items": [{ "id": "food", "title": "Food" }, { "id": "tech", "title": "Tech" }] },
  "selection": "single",
  "chain": {
    "intent": "browse",
    "title": "Items in category",
    "data": { "items": [] }
  }
}
```

The `ChainExecutor` manages navigation between steps, maintaining history and state.

## Complete Example

```json
{
  "version": "2.0",
  "intent": "browse",
  "title": "Popular Recipes",
  "description": "Explore trending recipes this week",
  "data": {
    "items": [
      { "id": "1", "name": "Pasta Carbonara", "image": "/img/carbonara.jpg", "time": "25 min" },
      { "id": "2", "name": "Thai Green Curry", "image": "/img/curry.jpg", "time": "35 min" }
    ]
  },
  "fields": {
    "title": "name",
    "image": "image",
    "subtitle": "time"
  },
  "display": {
    "layout": "grid",
    "columns": 3,
    "density": "comfortable"
  },
  "selection": "single",
  "on_select": { "action": "emit", "target": "recipe_selected" },
  "chain": {
    "intent": "detail",
    "title": "Recipe Details",
    "fields": {
      "title": "name",
      "image": "image",
      "description": "instructions"
    }
  }
}
```

## Validation

```typescript
import { parseUniversalSpec, safeParseUniversalSpec } from '@ripple-ui/svelte';

const spec = parseUniversalSpec(jsonInput);

const result = safeParseUniversalSpec(jsonInput);
if (result.success) {
  // result.data is a valid UniversalSpec
}
```
