---
{
  "title": "Ripple UniversalSpec v2.0 — Intent-Based UI Generation",
  "summary": "UniversalSpec is a higher-level UI format where developers declare intent (what the UI should do) rather than exact layout, allowing Ripple to automatically generate appropriate layouts. It supports 11 intent types including browse, form, dashboard, and search, with optional multi-step flow chaining for wizard-like interactions.",
  "concepts": [
    "intent-based UI",
    "auto layout generation",
    "UniversalSpec v2.0",
    "dashboard",
    "form generation",
    "multi-step flows",
    "widget composition",
    "lifecycle management",
    "display hints",
    "spec chaining",
    "branching flows"
  ],
  "categories": [
    "UI Generation",
    "Specification Format",
    "Ripple Framework",
    "Layout Automation",
    "Intent Declarations"
  ],
  "source_docs": [
    "6a83a36c5d92b303"
  ],
  "backlinks": null,
  "word_count": 500,
  "compiled_at": "2026-04-11T12:37:45Z",
  "compiled_with": "claude-haiku-4-5-20251001",
  "version": 1
}
---

# Ripple UniversalSpec v2.0 — Intent-Based UI Generation

UniversalSpec is a higher-level format where you declare the intent (what the UI should do) and Ripple picks the layout automatically. Use for quick generation when exact layout control isn't needed.

## Intent Types

| Intent | Use For | Auto Layout |
|--------|---------|-------------|
| `browse` | Lists of items to scroll through | List or card grid |
| `select` | Pick one item from a set | Selectable list/grid |
| `detail` | Show details of a single item | Hero + fields |
| `form` | Collect user input | Vertical field stack |
| `confirm` | Yes/no decision | Centered prompt |
| `info` | Display information | Read-only layout |
| `search` | Search with results | Search bar + results |
| `action` | Trigger an operation | Action card |
| `dashboard` | Overview with multiple widgets | Grid layout |
| `workspace` | Split layout (content + sidebar) | Two-pane |
| `custom` | Full UISpec v1.0 control | No auto layout |

## Structure

```json
{
  "version": "2.0",
  "intent": "dashboard",
  "title": "Sales Overview",
  "description": "Real-time sales metrics",
  "lifecycle": "persistent",
  "display_hints": {
    "layout": "grid",
    "columns": 3,
    "density": "comfortable"
  },
  "widgets": [
    { "type": "metric", "props": { "label": "Revenue", "value": "$45K" } },
    { "type": "chart", "props": { "type": "line", "data": [...] } },
    { "type": "table", "props": { "rows": [...] } }
  ]
}
```

## Key Fields

- `intent`: what the UI should do (required)
- `title`: display title
- `description`: subtitle or context
- `lifecycle`: "ephemeral" (inline, temporary) | "tool" (modal/panel) | "persistent" (pinned)
- `display_hints`: layout preferences
  - `layout`: "auto" | "grid" | "list" | "masonry" | "carousel" | "hero" | "split"
  - `columns`: number (for grid)
  - `density`: "compact" | "comfortable" | "spacious"
- `widgets`: flat array of UINodes (for dashboard intent)
- `ui`: UINode tree (for custom intent — same as UISpec v1.0)

## Multi-Step Flows (Chaining)

Specs can link to next steps for wizard-like flows:

```json
{
  "version": "2.0",
  "intent": "form",
  "title": "Step 1: Basic Info",
  "chain": "step2-spec-id",
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "12px" },
    "children": [
      { "type": "input", "props": { "label": "Name" }, "bind": "{state.name}" },
      { "type": "button", "props": { "label": "Next" } }
    ]
  }
}
```

For branching flows, use `chain_map`:
```json
{
  "chain_map": {
    "option-a": "spec-for-option-a",
    "option-b": "spec-for-option-b"
  }
}
```

## When to Use UISpec v1.0 vs UniversalSpec v2.0

**Use UISpec v1.0 when:**
- You need precise layout control (exact nesting, specific flex/grid config)
- Complex state interactions (bind, conditional rendering, loops)
- Multi-section layouts with mixed widget types

**Use UniversalSpec v2.0 when:**
- Quick dashboard with a flat list of widgets
- Intent is clear (browse a list, fill a form, show a detail)
- Layout can be auto-determined from the content

**You can mix them:** Use v2.0 with `intent: "custom"` and a full `ui` tree — this is how UISpec v1.0 specs are internally normalized.