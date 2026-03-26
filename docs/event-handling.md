# Event Handling

Ripple uses a declarative event system where handlers are defined as JSON objects on nodes.

## Event Handler Schema

```typescript
interface EventHandler {
  action: 'set' | 'api' | 'navigate' | 'toast' | 'emit' | 'open' | 'pin' | 'unpin';
  target?: string;     // State path (for set/open), event name (for emit)
  value?: any;         // Value to set or pass
  url?: string;        // URL (for api/navigate)
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';  // HTTP method (for api)
  body?: Record<string, any>;       // Request body (for api)
  headers?: Record<string, string>; // Request headers (for api)
  message?: string;    // Toast message
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';  // Toast variant
}
```

## Supported Events

Nodes can define handlers for these events:

| Event | Triggered When |
|-------|---------------|
| `on_click` | Widget is clicked |
| `on_change` | Value changes (inputs, selects, checkboxes, switches, tabs) |
| `on_submit` | Form is submitted |
| `on_focus` | Widget gains focus |
| `on_blur` | Widget loses focus |

## Actions

### `set` — Update State

```json
{
  "on_click": { "action": "set", "target": "count", "value": 0 }
}
```

- `target`: Dot-notation state path
- `value`: The value to set (optional — falls back to event value)
- Expressions in `value` are resolved: `"value": "{item.id}"`

### `open` — Open Dialog/Modal

```json
{
  "on_click": { "action": "open", "target": "showModal" }
}
```

Shorthand for `{ action: 'set', target: 'showModal', value: true }`.

### `api` — Make HTTP Request

```json
{
  "on_click": {
    "action": "api",
    "url": "/api/items/{state.selectedId}",
    "method": "POST",
    "body": { "name": "{state.itemName}" },
    "headers": { "Authorization": "Bearer {state.token}" }
  }
}
```

Emitted to the parent app via `onEvent`. Expressions in `url`, `body`, and `headers` are resolved.

### `navigate` — Navigate to URL

```json
{
  "on_click": {
    "action": "navigate",
    "url": "/items/{item.id}"
  }
}
```

Emitted to the parent app via `onEvent`.

### `toast` — Show Notification

```json
{
  "on_click": {
    "action": "toast",
    "message": "Item {item.name} saved!",
    "variant": "success"
  }
}
```

Emitted to the parent app via `onEvent`.

### `emit` — Custom Event

```json
{
  "on_click": {
    "action": "emit",
    "target": "item_selected",
    "value": "{item}"
  }
}
```

Emitted to the parent app via `onEvent` with `name` and `payload` fields.

### `pin` / `unpin` — Sidebar Persistence

```json
{
  "on_click": { "action": "pin", "target": "widget_id" }
}
```

Emitted to the parent app via `onEvent`.

## Handler Chaining

Multiple handlers execute sequentially:

```json
{
  "on_click": [
    { "action": "set", "target": "loading", "value": true },
    { "action": "api", "url": "/api/save", "method": "POST" },
    { "action": "toast", "message": "Saved!", "variant": "success" }
  ]
}
```

## Internal vs External Actions

| Action | Handled By | Description |
|--------|-----------|-------------|
| `set` | EventDispatcher (internal) | Directly mutates StateManager |
| `open` | EventDispatcher (internal) | Sets state to `true` |
| `api` | Parent app (external) | Emitted via `onEvent` callback |
| `navigate` | Parent app (external) | Emitted via `onEvent` callback |
| `toast` | Parent app (external) | Emitted via `onEvent` callback |
| `emit` | Parent app (external) | Emitted via `onEvent` callback |
| `pin` | Parent app (external) | Emitted via `onEvent` callback |
| `unpin` | Parent app (external) | Emitted via `onEvent` callback |

## Handling External Events

```svelte
<script>
  import { Ripple } from '@ripple-ui/svelte';
  import type { RippleEvent } from '@ripple-ui/svelte';

  function handleEvent(event: RippleEvent) {
    switch (event.type) {
      case 'api':
        fetch(event.url!, { method: event.method, body: JSON.stringify(event.body) });
        break;
      case 'navigate':
        window.location.href = event.url!;
        break;
      case 'toast':
        showToast(event.message!, event.variant);
        break;
      case 'emit':
        console.log('Custom event:', event.name, event.payload);
        break;
    }
  }
</script>

<Ripple spec={mySpec} onEvent={handleEvent} />
```

## RippleEvent Type

```typescript
interface RippleEvent {
  type: 'api' | 'navigate' | 'toast' | 'emit' | 'pin' | 'unpin';
  url?: string;
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  target?: string;
  message?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  name?: string;       // For emit events
  payload?: unknown;   // For emit events
}
```
