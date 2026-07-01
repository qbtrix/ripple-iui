<!--
  docs/universal-spec.md — UniversalSpec v2.0 human-readable reference.
  Changes:
    - 2026-07-01: synced to the Zod source of truth. Added the source-of-truth
      banner; brought IntentType to the full 15-value enum and DisplayHints.layout
      to the full 14-value set; stated the designed-layouts-are-default render
      principle (with intent:'custom' as the load-bearing NodeRenderer escape
      hatch); documented the Chain Flow fields (flowId, chain, chain_map,
      onComplete) and the FlowAction kinds.
-->

> **Source of truth:** the Zod schemas in `src/lib/schema/ui-spec.ts` and `src/lib/schema/universal-spec.ts` are canonical. This doc is a human-readable companion and may lag the code — when they disagree, the schema wins. Last verified against code: 2026-07-01.

# UniversalSpec Reference (v2.0)

The UniversalSpec is the high-level, intent-based specification format. Instead of specifying exact layouts, you declare *what* the UI should accomplish, and Ripple's layout engine picks the best rendering.

## How rendering works (read this first)

The **designed layouts are the default render path**, not a fallback. `Ripple.svelte` derives a render mode from `intent`: `dashboard` renders the dashboard; any intent in the `DESIGNED_INTENTS` set (`form`, `confirm`, `quick_confirm`, `browse`, `select`, `detail`, `info`, `search`, `slides`) dispatches through **`IntentRenderer`**, which selects one of ~15 hand-built layouts based on the intent, the data shape, and the display hints. Only if the intent is not designed does Ripple fall back to rendering the raw `ui` tree with `NodeRenderer`.

`intent: 'custom'` is the **load-bearing escape hatch**: it (along with `action`, `workspace`, and any unmapped intent) bypasses the designed layouts and hands your raw `ui` UINode tree straight to `NodeRenderer`. This is how you get pixel-level control when the designed layouts don't fit — and it is deliberately never removed. So UniversalSpec is **not** merely a wrapper around UISpec; it is intent-first, with `custom` + raw `ui` as the always-available trapdoor back to full UISpec control.

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
  sources?: Record<string, any>;               // Server-executed read bindings (RFC 04), preserved verbatim
  fields?: Record<string, string>;             // Field mapping (semantic → data path)

  // Layout
  display?: DisplayHints;                      // Layout preferences

  // Escape hatch
  ui?: UINode;                                 // Raw widget tree (for intent='custom' or to override auto-layout)

  // Interactions
  selection?: 'single' | 'multiple' | 'none';  // Selection mode

  // Actions
  on_select?: any;                             // Handler when item is selected
  on_complete?: any;                           // Handler when flow completes

  // Chain Flow (RFC 13) — the whole decision tree is materialized up front
  flowId?: string;                             // Stable step id; namespaces this step's accumulated data
  chain?: UniversalSpec;                       // Linear next step (nested spec, pre-loaded)
  chain_map?: Record<string, UniversalSpec>;   // Branch: selected item's id → next step (resolved before `chain`)
  onComplete?: FlowAction;                     // Terminal action when no chain/chain_map remains
}
```

## Intent Types

The full `IntentType` enum, in the order defined in `universal-spec.ts`:

| Intent | Description | Rendering |
|--------|-------------|-----------|
| `browse` | Grid/list of items for exploration | designed (CardGrid / List) |
| `select` | Pick one or more items | designed (Select) |
| `detail` | View a single item's details | designed (Detail) |
| `form` | Input/edit data | designed (Form) |
| `confirm` | Review and submit | designed (Summary) |
| `quick_confirm` | Lightweight review/submit step | designed (summary-card) |
| `info` | Read-only information | designed (InfoHero) |
| `search` | Search interface | designed (Search) |
| `action` | Trigger an action | escape hatch → NodeRenderer |
| `custom` | Raw UI control (escape hatch) | escape hatch → NodeRenderer (renders `ui` tree) |
| `workspace` | Tool-based interface | escape hatch → NodeRenderer |
| `dashboard` | Persistent dashboard | dashboard renderer |
| `widget` | Single-widget display | designed (widget layout) |
| `itinerary` | Multi-day travel plan with timeline | designed (itinerary layout) |
| `slides` | Presentation deck — one slide per section | designed (SlidesLayout) |

The intents routed through `IntentRenderer` to a designed layout are `form`, `confirm`, `quick_confirm`, `browse`, `select`, `detail`, `info`, `search`, and `slides` (the `DESIGNED_INTENTS` set in `Ripple.svelte`). `dashboard` has its own renderer. `custom`, `action`, and `workspace` fall through to `NodeRenderer` and render the raw `ui` tree.

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
  layout:                                      // default: 'auto'
    | 'auto' | 'grid' | 'list' | 'masonry' | 'carousel' | 'hero' | 'split'
    // Composite / ported designed-layout hints — route an otherwise-generic
    // intent to a designed layout without inventing a new IntentType:
    | 'comparison' | 'checklist' | 'invoice' | 'report'
    | 'timeline' | 'table' | 'article';
  columns?: number;                            // Column count for grid layouts
  density: 'compact' | 'comfortable' | 'spacious';  // default: 'comfortable'
  item_template?: UINode;                      // Custom template for list/grid items
}
```

The seven composite hints (`comparison` … `article`) are **display hints, not intents**: a spec with e.g. `intent: 'info'` and `display.layout: 'invoice'` is routed to the designed invoice layout by `IntentRenderer` before the raw-`ui` check, so you get a designed composite layout without adding an `IntentType` value.

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

## Chain Flow (RFC 13)

A multi-step decision flow is materialized **up front as one nested spec** — the entire tree of steps ships in a single spec, so the `ChainExecutor` walks it client-side with zero round-trips. Four fields drive it:

- `chain` — the linear next step, a **nested `UniversalSpec`** (not a string id).
- `chain_map` — a branch map from the selected item's `id` to the next `UniversalSpec`. Resolved **before** `chain`, so a branch wins over the linear step when the selection matches.
- `flowId` — a stable step id that namespaces this step's accumulated data (e.g. `<flowId>_selection`, `<flowId>_formData`), so later steps can read earlier answers.
- `onComplete` — a `FlowAction` fired when `advance` reaches a step with no `chain`/`chain_map` left (the terminal step).

Linear next step:

```json
{
  "intent": "select",
  "flowId": "category",
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

Branch on the selected id with `chain_map` (each value is a full nested spec):

```json
{
  "intent": "select",
  "flowId": "category",
  "selection": "single",
  "chain_map": {
    "food": { "intent": "browse", "title": "Food items", "data": { "items": [] } },
    "tech": { "intent": "browse", "title": "Tech items", "data": { "items": [] } }
  }
}
```

The `ChainExecutor` manages navigation between steps, maintaining history, a forward stack, and the accumulated per-step data.

### `onComplete` — terminal FlowAction (Chain Flow v2)

When the flow reaches a terminal step, `onComplete` runs a single `FlowAction`. The discriminated union (keyed on `kind`) has six kinds — the original three plus three "real mini-app" write terminals added in Chain Flow v2:

| `kind` | Fields | Effect |
|--------|--------|--------|
| `emit` | `event`, `payload?` | Emit an event to the host |
| `navigate` | `url` | Navigate to a URL |
| `chat` | `message` | Send a chat message |
| `invoke_tool` | `tool`, `args?`, `then?` | Run a tool with the collected answers |
| `call_binding` | `binding`, `path`, `params?`, `then?` | Server-side write via a binding |
| `create_pocket` | `name`, `template?`, `spec?`, `seed_from_flow?`, `then?` | Materialize a permanent pocket from the answers |

The three write terminals (`invoke_tool`, `call_binding`, `create_pocket`) each accept an optional **`then`** — a single follow-up `FlowAction` run after the write succeeds (typically a `navigate` to the freshly created pocket). `then` is itself a `FlowAction`, so it nests.

```json
{
  "intent": "form",
  "flowId": "signup",
  "onComplete": {
    "kind": "create_pocket",
    "name": "New signup",
    "seed_from_flow": true,
    "then": { "kind": "navigate", "url": "/pockets/{id}" }
  }
}
```

Note: `onComplete` (a `FlowAction`, the terminal hand-off of a step *sequence*) is distinct from `on_complete` (the free-form legacy handler field) and from the action-VM's `flow` verb, which sequences actions *within* a single step.

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
