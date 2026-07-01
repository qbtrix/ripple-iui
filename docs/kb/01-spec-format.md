<!--
  docs/kb/01-spec-format.md — UISpec v1.0 JSON format reference (KB entry).
  Changes:
    - 2026-07-01: synced to the Zod source of truth. Added the source-of-truth
      banner; documented `sources` (RFC 04), node-level `motion` (RFC 12), the
      `slot` field, and the `fonts` + `logo` groups on `theme`.
-->

> **Source of truth:** the Zod schemas in `src/lib/schema/ui-spec.ts` and `src/lib/schema/universal-spec.ts` are canonical. This doc is a human-readable companion and may lag the code — when they disagree, the schema wins. Last verified against code: 2026-07-01.

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
**Optional fields:** `state` (initial state object), `theme`, `meta`, `data` (client-side data fetchers), `sources` (server-executed read bindings — see below).

### `sources` — server-executed read bindings (RFC 04)

`sources` holds read bindings that the **server** owns and runs; Ripple never executes them. It preserves the key verbatim as an opaque pass-through so a client round-trip can't drop it. Each entry's shape is defined by the consuming host, so the schema types it as `Record<string, any>`. Use `sources` for server-resolved reads (e.g. dynamic Paw Sites) and `data` for client-side fetches.

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
  "motion": { "enter": { "opacity": 0, "y": 12 }, "transition": { "preset": "smooth" } },
  "slot": "header",
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
- `motion` — Node-level declarative animation (RFC 12), a sibling of `class`/`style`, **not** inside `props`. Closed, GPU-safe channel set; full schema in `src/lib/schema/motion.ts`. Note: `transition.delay` is in seconds, `duration` in ms.
- `slot` — Named snippet slot to route this child into on its parent widget (e.g. `'header'`/`'footer'` on a `Card`). Ignored when the parent has no such slot.
- `on_click`, `on_change`, `on_input`, `on_submit`, `on_focus`, `on_blur` — Event handlers (single or array for chaining)

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

## Theme

The optional `theme` block overrides appearance. Alongside `colors` (the shadcn semantic-token family), `radius`, and `mode` (`'light' | 'dark' | 'system'`), it carries two white-label groups (RFC 12):

```json
{
  "theme": {
    "mode": "dark",
    "radius": "0.5rem",
    "colors": { "primary": "#3b82f6" },
    "fonts": { "sans": "Inter", "heading": "Fraunces", "mono": "JetBrains Mono" },
    "logo": { "src": "/logo.svg", "alt": "Acme", "darkSrc": "/logo-dark.svg" }
  }
}
```

`fonts` emits `--ripple-font-*` CSS variables; `logo` is surfaced to widgets such as `Navbar` and emitted as `--ripple-logo*`. Inside `logo`, only `src` is required.

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
