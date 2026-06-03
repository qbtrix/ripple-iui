# Ripple Composite Widgets

Composite widgets are full-pane typed layouts. Emit ONE node and the whole pattern (header + body + actions) renders — don't rebuild these out of `flex` + `card` + inputs. Two flavors:

1. **Composite layouts** (`comparison-layout`, `entity-detail`, `form-layout`, `wizard-layout`, `checklist-layout`, `report-layout`, `invoice-layout`, `order-status`, the dashboard variants) — pre-composed business surfaces.
2. **Specialized canvases** (`terminal`, `workflow`, `c4`) — niche widgets for CLI output, flow diagrams, and architecture diagrams.

Refer to `dist/manifest.json` (or `get_widget_spec` from an agent) for the exact prop schema of each — this page covers shape and intended use.

## Composite layouts

### comparison-layout

Side-by-side comparison of 2–6 items with hero cards, a section-tab feature grid, and a Card/Table view toggle. Per-item `actions` and `learn_more` accept event handlers, so each row can fire a chat.send / navigate / api action.

Use when the user asks "compare X vs Y" or "what's the difference between …" — NOT when they need a feature matrix (that's `comparison-table`).

### entity-detail

Record / profile / entity page. Header (avatar + title + subtitle + status), property strip, optional tabs, optional related-records section. Use for customer detail, ticket detail, asset profile.

Picks this over a flex of metric tiles, which always reads worse for a single-record surface.

### form-layout

Multi-section form. Groups fields into sections with optional headings, validates on submit, renders a primary + cancel action row at the bottom. Use for signup, contact, multi-field intake.

The internal fields are still standard input widgets (`input`, `textarea`, `select`, etc.) so binding follows the normal Mutation Triangle (`bind` + on_change to state).

### wizard-layout

Multi-step setup or onboarding flow. Renders a stepper, the current step body, and Back/Next/Submit actions. Each step has its own children and validation.

Always pick this over a manual stepper + form rebuild.

### checklist-layout

Launch checklist / pre-flight / runbook. Grouped items with completion progress, per-item details, optional owners and due dates. Great for kickoffs, audits, deploy gates.

Always pick this over a flex of `checkbox` + `text` rows.

### report-layout

Long-form report — quarterly review, status report, write-up. Sections with headings, embedded data widgets (chart, table, metric), inline callouts, citations. Use when the deliverable is a *document* with structure, not an interactive surface.

### invoice-layout

Invoice / quote / receipt. Header (issuer, recipient, dates), line items table, computed totals (subtotal/tax/total), download/print actions.

The widget computes totals from the line items — don't pre-sum and pass a number; pass the items.

### order-status

Multi-step shipment status. Stepper for placed → confirmed → preparing → in-transit → out-for-delivery → delivered. Optional embedded `map` widget (composes the data-category `map` widget under the hood) when origin/destination/tracker are supplied. Optional event timeline beneath the map.

Use for delivery tracking, courier dispatch, inbound logistics.

### Dashboard variants

`exec-dashboard`, `ops-dashboard`, `analytics-dashboard`, `pipeline-dashboard`, `project-dashboard` are pre-composed dashboard surfaces. Each picks an opinionated layout for that domain (KPIs + chart + table for exec, status + alerts + load for ops, funnel + retention + cohorts for analytics, etc.). Refer to the manifest for each.

## Specialized canvases

### terminal

CLI-style output display with optional interactive command input. Use for showing logs, build output, or command results.

**Props:**
- `lines`: array of TermLine (default: [])
  - `text`: string (required)
  - `type`: "stdout" | "stderr" | "info" | "command" (default: "stdout")
  - `timestamp`: string (optional)
- `interactive`: boolean — shows command input at bottom
- `maxHeight`: string (default: "300px")
- `title`: string (shown in title bar)

**Events:** none wired for specs. Interactive mode's command callback is a Svelte-only prop and cannot be set from JSON.

**Example:**
```json
{
  "type": "terminal",
  "props": {
    "title": "Build Output",
    "maxHeight": "250px",
    "lines": [
      { "text": "npm run build", "type": "command" },
      { "text": "Building project...", "type": "info" },
      { "text": "✓ Compiled 42 files", "type": "stdout" },
      { "text": "✓ Bundle size: 128kb", "type": "stdout" },
      { "text": "Warning: unused import in utils.ts", "type": "stderr" },
      { "text": "Build complete in 2.3s", "type": "info" }
    ]
  }
}
```

### workflow

Visual node-based workflow diagram. Renders interactive flowcharts with SvelteFlow. Use for process flows, automation pipelines, approval chains.

**Props:**
- `nodes`: array of WorkflowNodeData
  - `id`: string (required)
  - `type`: "trigger" | "action" | "condition" | "approval" | "connector" | "output"
  - `label`: string (displayed text)
  - `icon`: string (optional icon name)
  - `tool`: string (optional tool identifier)
  - `status`: string (optional status indicator)
  - `position`: { x, y } (optional — auto-laid out if omitted)
- `edges`: array of WorkflowEdgeData
  - `from`: string (source node id)
  - `to`: string (target node id)
  - `label`: string (optional edge label, useful for "yes"/"no" on conditions)
  - `animated`: boolean
- `title`: string
- `interactive`: boolean (default: true — enables pan/zoom)
- `minimap`: boolean
- `fitView`: boolean (default: true)

**Example — approval workflow:**
```json
{
  "type": "workflow",
  "props": {
    "title": "Expense Approval",
    "nodes": [
      { "id": "start", "type": "trigger", "label": "Expense Submitted" },
      { "id": "check", "type": "condition", "label": "Amount > $500?" },
      { "id": "auto", "type": "action", "label": "Auto-Approve" },
      { "id": "review", "type": "approval", "label": "Manager Review" },
      { "id": "done", "type": "output", "label": "Processed" }
    ],
    "edges": [
      { "from": "start", "to": "check" },
      { "from": "check", "to": "auto", "label": "No" },
      { "from": "check", "to": "review", "label": "Yes" },
      { "from": "auto", "to": "done" },
      { "from": "review", "to": "done" }
    ]
  }
}
```

### c4 — C4 Architecture Diagram

Renders C4 model system architecture diagrams. Supports all 4 C4 levels (Context, Container, Component, Code) with auto-layout via ELK.js.

**Props:**
- `diagram`: C4Diagram object
  - `level`: "context" | "container" | "component" | "code"
  - `title`: string
  - `description`: string
  - `elements`: array of C4Element
    - `id`: string
    - `type`: "Person" | "System" | "Container" | "Database" | "Queue" | "Component"
    - `name`: string
    - `description`: string
    - `technology`: string (e.g. "Python, FastAPI")
    - `external`: boolean (grayed out for external systems)
    - `children`: nested C4Element array (for container/component grouping)
  - `relationships`: array
    - `from`: string (element id)
    - `to`: string (element id)
    - `label`: string (e.g. "Sends requests to")
    - `technology`: string (e.g. "HTTPS/JSON")
    - `animated`: boolean

**Example — system context diagram:**
```json
{
  "type": "c4",
  "props": {
    "diagram": {
      "level": "context",
      "title": "E-Commerce System",
      "description": "System context view",
      "elements": [
        { "id": "user", "type": "Person", "name": "Customer", "description": "Buys products online" },
        { "id": "ecom", "type": "System", "name": "E-Commerce Platform", "description": "Handles orders, payments, inventory" },
        { "id": "payment", "type": "System", "name": "Payment Gateway", "description": "Processes payments", "external": true },
        { "id": "shipping", "type": "System", "name": "Shipping API", "description": "Tracks deliveries", "external": true }
      ],
      "relationships": [
        { "from": "user", "to": "ecom", "label": "Browses and purchases" },
        { "from": "ecom", "to": "payment", "label": "Processes payments", "technology": "HTTPS" },
        { "from": "ecom", "to": "shipping", "label": "Creates shipments", "technology": "REST API" }
      ]
    }
  }
}
```
