# Ripple Event System — actions, chaining, API calls, navigation, toasts

Events are how widgets trigger behavior. Attach event handlers to `on_click`, `on_change`, `on_submit`, `on_focus`, `on_blur`.

## Event Actions

### set — Update state

Directly mutate a state value. The most common action.

```json
{ "action": "set", "target": "count", "value": "{state.count + 1}" }
```

- `target`: state path (dot notation for nested: "user.name")
- `value`: literal value or expression. If omitted, uses the event value (useful for on_change).

**Example — toggle boolean:**
```json
{ "action": "set", "target": "showPanel", "value": "{!state.showPanel}" }
```

### api — HTTP request

Make an API call. The host application handles the actual fetch.

```json
{
  "action": "api",
  "url": "/api/tickets",
  "method": "POST",
  "body": { "title": "{state.title}", "priority": "{state.priority}" },
  "headers": { "X-Custom": "value" }
}
```

- `url`: endpoint path (expressions supported)
- `method`: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" (default: "GET")
- `body`: request body object (expressions resolved)
- `headers`: additional headers

### navigate — URL navigation

Navigate to a URL. The host handles the actual routing.

```json
{ "action": "navigate", "url": "/dashboard/settings" }
```

### toast — Show notification

Display a temporary toast message.

```json
{ "action": "toast", "message": "Saved successfully!", "variant": "success" }
```

- `message`: notification text
- `variant`: "default" | "success" | "error" | "warning" | "info"

### emit — Custom event

Emit a named event to the host application.

```json
{ "action": "emit", "target": "pocket-refresh", "value": { "id": "{state.pocketId}" } }
```

### open — Shorthand for set target=true

```json
{ "action": "open", "target": "showModal" }
```
Equivalent to `{ "action": "set", "target": "showModal", "value": true }`.

### pin / unpin — Sidebar persistence

```json
{ "action": "pin", "target": "widget-id" }
{ "action": "unpin", "target": "widget-id" }
```

## Event Chaining

Pass an array of actions to execute them in sequence:

```json
{
  "type": "button",
  "props": { "label": "Submit Order" },
  "on_click": [
    { "action": "set", "target": "loading", "value": true },
    {
      "action": "api",
      "url": "/api/orders",
      "method": "POST",
      "body": { "items": "{state.cart}", "total": "{state.total}" }
    },
    { "action": "set", "target": "loading", "value": false },
    { "action": "toast", "message": "Order placed!", "variant": "success" },
    { "action": "set", "target": "cart", "value": [] }
  ]
}
```

## Event Handlers by Widget

| Widget | on_click | on_change | on_submit | on_focus | on_blur |
|--------|----------|-----------|-----------|----------|---------|
| button | Yes | - | - | - | - |
| input | - | Yes (value) | Yes | Yes | Yes |
| select | - | Yes (value) | - | - | - |
| checkbox | - | Yes (boolean) | - | - | - |
| switch | - | Yes (boolean) | - | - | - |
| table | Yes (row) | - | - | - | - |
| card | Yes | - | - | - | - |
| container | Yes | - | - | - | - |
| tabs | - | Yes (tab value) | - | - | - |

## Common Patterns

**Search with debounce-like feel:**
```json
{
  "type": "input",
  "props": { "placeholder": "Search articles..." },
  "bind": "{state.query}",
  "on_change": { "action": "api", "url": "/api/search?q={state.query}", "method": "GET" }
}
```

**Toggle visibility:**
```json
{
  "type": "button",
  "props": { "label": "{state.showDetails ? 'Hide' : 'Show'} Details", "variant": "ghost" },
  "on_click": { "action": "set", "target": "showDetails", "value": "{!state.showDetails}" }
}
```

**Delete with confirmation pattern (using state flag):**
```json
[
  {
    "type": "button",
    "props": { "label": "Delete", "variant": "destructive" },
    "on_click": { "action": "set", "target": "confirmDelete", "value": true }
  },
  {
    "type": "flex",
    "show": "{state.confirmDelete}",
    "props": { "gap": "8px" },
    "children": [
      { "type": "text", "props": { "text": "Are you sure?" } },
      {
        "type": "button",
        "props": { "label": "Yes, delete", "variant": "destructive", "size": "sm" },
        "on_click": [
          { "action": "api", "url": "/api/items/{state.selectedId}", "method": "DELETE" },
          { "action": "set", "target": "confirmDelete", "value": false },
          { "action": "toast", "message": "Deleted", "variant": "success" }
        ]
      },
      {
        "type": "button",
        "props": { "label": "Cancel", "variant": "ghost", "size": "sm" },
        "on_click": { "action": "set", "target": "confirmDelete", "value": false }
      }
    ]
  }
]
```
