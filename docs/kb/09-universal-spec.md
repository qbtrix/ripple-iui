<!--
  docs/kb/09-universal-spec.md — UniversalSpec v2.0 intent-based generation (KB entry).
  Changes:
    - 2026-07-01: synced to the Zod source of truth. Added the source-of-truth
      banner; brought IntentType to the full 15-value enum; documented `display`
      (renamed from the doc's old `display_hints`) with the full layout set;
      corrected `chain`/`chain_map` to nested specs and `lifecycle` to a config
      object; marked the old `{widgets, lifecycle}` / `display_hints` / string-id
      `chain` shape as the DEPRECATED Gen-1 contract.
-->

> **Source of truth:** the Zod schemas in `src/lib/schema/ui-spec.ts` and `src/lib/schema/universal-spec.ts` are canonical. This doc is a human-readable companion and may lag the code — when they disagree, the schema wins. Last verified against code: 2026-07-01.

# Ripple UniversalSpec v2.0 — Intent-Based UI Generation

UniversalSpec is a higher-level format where you declare the intent (what the UI should do) and Ripple picks the layout automatically. Use for quick generation when exact layout control isn't needed.

The **designed layouts are the default render path**: `Ripple.svelte` routes most intents through `IntentRenderer`, which selects one of ~15 hand-built layouts. `intent: 'custom'` (with `action` and `workspace`) is the load-bearing escape hatch that hands your raw `ui` tree to `NodeRenderer` for full UISpec-level control. See `docs/universal-spec.md` for the full reference.

## Intent Types

The full `IntentType` enum, in code order:

| Intent | Use For | Rendering |
|--------|---------|-----------|
| `browse` | Lists of items to scroll through | designed (List / card grid) |
| `select` | Pick one item from a set | designed (selectable list/grid) |
| `detail` | Show details of a single item | designed (hero + fields) |
| `form` | Collect user input | designed (field stack) |
| `confirm` | Review and submit | designed (summary card) |
| `quick_confirm` | Lightweight review/submit step | designed (summary card) |
| `info` | Display information | designed (read-only layout) |
| `search` | Search with results | designed (search bar + results) |
| `action` | Trigger an operation | escape hatch → NodeRenderer |
| `custom` | Full UISpec v1.0 control | escape hatch → NodeRenderer (renders `ui` tree) |
| `workspace` | Split layout (content + sidebar) | escape hatch → NodeRenderer |
| `dashboard` | Overview with multiple widgets | dashboard renderer |
| `widget` | Single-widget display | designed (widget layout) |
| `itinerary` | Multi-day travel plan with timeline | designed (itinerary layout) |
| `slides` | Presentation deck — one slide per section | designed (SlidesLayout) |

## Structure

```json
{
  "version": "2.0",
  "intent": "detail",
  "title": "Sales Overview",
  "description": "Real-time sales metrics",
  "lifecycle": { "type": "persistent", "id": "sales-overview" },
  "data": { "revenue": "$45K", "orders": 128 },
  "display": {
    "layout": "grid",
    "columns": 3,
    "density": "comfortable"
  },
  "fields": { "title": "name", "value": "revenue" }
}
```

## Key Fields

- `intent`: what the UI should do (required) — one of the `IntentType` values above
- `title`: display title
- `description`: subtitle or context
- `lifecycle`: a **config object** `{ type, id?, icon?, label? }` where `type` is `"ephemeral"` (inline, temporary, default) | `"tool"` (modal/panel) | `"persistent"` (pinned). It is **not** a bare string — `"lifecycle": "persistent"` is the deprecated Gen-1 form.
- `data`: inline data (`Record<string, any>`), rendered directly — remote data goes through `sources`
- `sources`: server-executed read bindings (RFC 04), preserved verbatim
- `fields`: field mapping (semantic role → data path), e.g. `{ "title": "name" }`
- `display`: layout preferences (the current field name — the old doc called this `display_hints`)
  - `layout`: `"auto" | "grid" | "list" | "masonry" | "carousel" | "hero" | "split"` plus the composite hints `"comparison" | "checklist" | "invoice" | "report" | "timeline" | "table" | "article"`
  - `columns`: number (for grid)
  - `density`: `"compact" | "comfortable" | "spacious"`
- `ui`: UINode tree (for `intent: 'custom'`, or to override auto-layout — same shape as UISpec v1.0)
- `selection`: `"single" | "multiple" | "none"`
- Chain Flow: `flowId`, `chain` (nested spec), `chain_map` (id → nested spec), `onComplete` (a `FlowAction`) — see below

> **DEPRECATED — Gen-1 contract.** Earlier drafts of this doc described a `{ widgets, lifecycle, display_hints }` shape: a flat `widgets` array of UINodes, a bare-string `lifecycle`, `display_hints` (now `display`), and `chain`/`chain_map` holding **string spec ids**. That was the removed Gen-1 shim. The live `UniversalSpec` in `universal-spec.ts` has **no `widgets` key** (a dashboard's content comes from `data` + the dashboard renderer, or from a raw `ui` tree), `lifecycle` is a config object, and `chain`/`chain_map` hold **nested `UniversalSpec` objects**, not ids. Do not author the Gen-1 shape.

## Chain Flow (Multi-Step) — RFC 13

The whole decision tree is materialized up front as one nested spec; the `ChainExecutor` walks it client-side. `chain` and `chain_map` hold **nested `UniversalSpec` objects**, not string ids (the string-id form was the Gen-1 shim — see the deprecation note above).

Linear next step:

```json
{
  "version": "2.0",
  "intent": "form",
  "flowId": "basic-info",
  "title": "Step 1: Basic Info",
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "12px" },
    "children": [
      { "type": "input", "props": { "label": "Name" }, "bind": "{state.name}" },
      { "type": "button", "props": { "label": "Next" } }
    ]
  },
  "chain": {
    "version": "2.0",
    "intent": "confirm",
    "title": "Step 2: Review"
  }
}
```

Branch on the selected item's id with `chain_map` (each value is a full nested spec):

```json
{
  "chain_map": {
    "option-a": { "version": "2.0", "intent": "browse", "title": "Path A" },
    "option-b": { "version": "2.0", "intent": "browse", "title": "Path B" }
  }
}
```

- `flowId` — stable step id; namespaces the step's accumulated data (`<flowId>_selection`, `<flowId>_formData`).
- `onComplete` — a `FlowAction` fired at a terminal step (no `chain`/`chain_map` left). Kinds: `emit`, `navigate`, `chat`, and the Chain Flow v2 write terminals `invoke_tool`, `call_binding`, `create_pocket` (each with an optional `then` follow-up action). Full field list in `docs/universal-spec.md`.

## When to Use UISpec v1.0 vs UniversalSpec v2.0

**Use UISpec v1.0 when:**
- You need precise layout control (exact nesting, specific flex/grid config)
- Complex state interactions (bind, conditional rendering, loops)
- Multi-section layouts with mixed widget types

**Use UniversalSpec v2.0 when:**
- Intent is clear (browse a list, fill a form, show a detail, a dashboard)
- You want one of the ~15 designed layouts rather than hand-building the tree
- Layout can be auto-determined from the content

**The escape hatch:** set `intent: "custom"` and provide a full `ui` tree — this bypasses the designed layouts and renders your raw UINode tree through `NodeRenderer`, giving you full UISpec v1.0 control. Separately, `normalizeSpec()` accepts a **legacy** UISpec (a bare `{ ui, ... }` with no `intent`) and wraps it as `intent: 'custom'` for backward compatibility; a native v2 spec is used as-is and is not wrapped.
