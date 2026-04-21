# Ripple UISpec v1.0 — JSON Format Reference

## Overview

Ripple renders interactive UIs from JSON specs. The top-level structure is UISpec v1.0.

## Top-Level Structure

```json
{
  "version": "1.0",
  "state": { "count": 0, "filter": "all", "items": [] },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "16px" },
    "children": []
  },
  "theme": {
    "mode": "dark",
    "radius": "0.5rem"
  },
  "meta": {
    "title": "My Dashboard",
    "description": "Sales overview"
  }
}
```

**Required fields:** `version` (always "1.0"), `ui` (root UINode).
**Optional fields:** `state` (initial state object), `theme`, `meta`, `data` (data fetchers).

## UINode Structure

Every widget in the tree is a UINode:

```json
{
  "type": "widget-name",
  "id": "optional-id",
  "props": {},
  "children": [],
  "bind": "{state.fieldName}",
  "show": "{state.isVisible}",
  "class": "extra-css-classes",
  "style": { "margin-top": "8px" },
  "on_click": { "action": "set", "target": "count", "value": "{state.count + 1}" },
  "on_change": { "action": "set", "target": "query", "value": "{event}" },
  "on_submit": { "action": "api", "url": "/api/submit", "method": "POST" },
  "items": "{state.list}",
  "item_as": "item",
  "index_as": "i",
  "condition": "{state.showPanel}",
  "else_children": []
}
```

**Common fields:**
- `type` — Widget type identifier (required)
- `props` — Widget-specific configuration
- `children` — Nested UINode array for composition
- `bind` — Two-way state binding using `{state.path}` syntax
- `show` — Conditional visibility expression (hides the node when false)
- `on_click`, `on_change`, `on_submit`, `on_focus`, `on_blur` — Event handlers (single or array for chaining)

**Loop fields (for `each` pattern):**
- `items` — Data path to iterate: `"{state.list}"`
- `item_as` — Variable name for current item (default: "item")
- `index_as` — Variable name for index (default: "index")

**Conditional fields (for `if` pattern):**
- `condition` — Expression that determines visibility
- `else_children` — Rendered when condition is false

## State Binding

Declare initial state at the top level:
```json
{ "state": { "name": "", "email": "", "submitted": false } }
```

Reference state in any text prop:
```json
{ "type": "text", "props": { "text": "Hello, {state.name}!" } }
```

Two-way bind input widgets:
```json
{ "type": "input", "props": { "label": "Name" }, "bind": "{state.name}" }
```

## Expressions

Supported in any string value using `{expression}` syntax:
- State access: `{state.count}`, `{state.user.name}`
- Math: `{state.count + 1}`, `{state.price * state.quantity}`
- Comparisons: `{state.count > 0}`, `{state.status == "active"}`
- Ternary: `{state.count > 0 ? "Has items" : "Empty"}`
- Logical: `{state.a && state.b}`, `{!state.loading}`
- Optional chaining: `{state.user?.profile?.name}`
- Template: `"Total: {state.items.length} items"`

## Complete Example: Interactive Counter

```json
{
  "version": "1.0",
  "state": { "count": 0 },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "8px", "align": "center" },
    "children": [
      { "type": "heading", "props": { "text": "Counter", "level": 2 } },
      { "type": "text", "props": { "text": "Count: {state.count}", "size": "xl" } },
      {
        "type": "flex",
        "props": { "direction": "row", "gap": "8px" },
        "children": [
          {
            "type": "button",
            "props": { "label": "-1", "variant": "outline" },
            "on_click": { "action": "set", "target": "count", "value": "{state.count - 1}" }
          },
          {
            "type": "button",
            "props": { "label": "+1" },
            "on_click": { "action": "set", "target": "count", "value": "{state.count + 1}" }
          }
        ]
      }
    ]
  }
}
```
