---
{
  "title": "Ripple Control Flow — Conditional Rendering and Loops",
  "summary": "Control flow widgets in Ripple manage conditional rendering and list iteration. Use `if` for conditional blocks, `show` for inline visibility, and `each` for rendering arrays with context variables.",
  "concepts": [
    "if widget",
    "conditional rendering",
    "show field",
    "each widget",
    "list rendering",
    "loops",
    "context variables",
    "item_as",
    "index_as",
    "nested conditions",
    "UINode",
    "state expressions",
    "template rendering"
  ],
  "categories": [
    "Control Flow",
    "UI Components",
    "Ripple Framework",
    "Conditional Logic",
    "List Management"
  ],
  "source_docs": [
    "36f8c79638611d9c"
  ],
  "backlinks": null,
  "word_count": 483,
  "compiled_at": "2026-04-11T12:37:13Z",
  "compiled_with": "claude-haiku-4-5-20251001",
  "version": 1
}
---

# Ripple Control Flow — if, each, conditional rendering, loops

Control widgets manage what renders based on state. Use these for conditional content and list rendering.

## if — Conditional Rendering

Renders children only when a condition is true. Optionally renders else_children when false.

**UINode fields:**
- `condition`: expression string that evaluates to boolean
- `children`: rendered when condition is true
- `else_children`: rendered when condition is false (optional)

**Example — show/hide content:**
```json
{
  "type": "if",
  "condition": "{state.isLoggedIn}",
  "children": [
    { "type": "text", "props": { "text": "Welcome back, {state.username}!" } }
  ],
  "else_children": [
    { "type": "button", "props": { "label": "Log In" }, "on_click": { "action": "navigate", "url": "/login" } }
  ]
}
```

**Example — conditional error message:**
```json
{
  "type": "if",
  "condition": "{state.error}",
  "children": [
    { "type": "text", "props": { "text": "{state.error}", "color": "#ef4444" } }
  ]
}
```

## show — Inline Conditional Visibility

Any widget can use the `show` field to conditionally hide/show itself without wrapping in an `if` node.

**Example:**
```json
{
  "type": "text",
  "props": { "text": "Loading...", "size": "sm" },
  "show": "{state.loading}"
}
```

## each — List Rendering / Loops

Iterates over an array and renders children for each item. Creates `item` and `index` context variables.

**UINode fields:**
- `items`: state path to array — `"{state.taskList}"`
- `item_as`: variable name for current element (default: "item")
- `index_as`: variable name for index (default: "index")
- `children`: template rendered for each item

**Example — task list:**
```json
{
  "version": "1.0",
  "state": {
    "tasks": [
      { "id": 1, "title": "Write docs", "done": false },
      { "id": 2, "title": "Fix bug", "done": true },
      { "id": 3, "title": "Deploy v2", "done": false }
    ]
  },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "8px" },
    "children": [
      { "type": "heading", "props": { "text": "Task List", "level": 2 } },
      {
        "type": "each",
        "items": "{state.tasks}",
        "item_as": "task",
        "children": [
          {
            "type": "flex",
            "props": { "direction": "row", "gap": "8px", "align": "center" },
            "children": [
              { "type": "checkbox", "props": { "checked": "{task.done}" } },
              { "type": "text", "props": { "text": "{task.title}" } },
              { "type": "badge", "props": { "text": "{task.done ? 'Done' : 'Pending'}", "variant": "{task.done ? 'success' : 'default'}" } }
            ]
          }
        ]
      }
    ]
  }
}
```

**Example — numbered list with index:**
```json
{
  "type": "each",
  "items": "{state.steps}",
  "item_as": "step",
  "index_as": "i",
  "children": [
    { "type": "text", "props": { "text": "{i + 1}. {step.name}" } }
  ]
}
```

## Combining Conditions and Loops

You can nest `if` inside `each` to filter visible items, or use `show` on children within a loop:

```json
{
  "type": "each",
  "items": "{state.notifications}",
  "item_as": "notif",
  "children": [
    {
      "type": "flex",
      "props": { "direction": "row", "gap": "8px" },
      "show": "{!notif.dismissed}",
      "children": [
        { "type": "badge", "props": { "text": "{notif.type}", "variant": "{notif.type == 'error' ? 'destructive' : 'default'}" } },
        { "type": "text", "props": { "text": "{notif.message}" } }
      ]
    }
  ]
}
```