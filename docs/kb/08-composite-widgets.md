# Ripple Composite Widgets — terminal, workflow, c4 diagram

Advanced widgets for specialized use cases: CLI output, visual workflows, and architecture diagrams.

## terminal

CLI-style output display with optional interactive command input. Use for showing logs, build output, or command results.

**Props:**
- `lines`: array of TermLine (default: [])
  - `text`: string (required)
  - `type`: "stdout" | "stderr" | "info" | "command" (default: "stdout")
  - `timestamp`: string (optional)
- `interactive`: boolean — shows command input at bottom
- `maxHeight`: string (default: "300px")
- `title`: string (shown in title bar)

**Events:** `oncommand` (when user types a command in interactive mode)

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

## workflow

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

## c4 — C4 Architecture Diagram

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
