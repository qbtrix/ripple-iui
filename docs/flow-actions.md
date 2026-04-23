# Flow Actions

Ripple event handlers used to be a flat list of steps that ran fire-and-forget
in a for-loop. That works for a click that just sets some state or fires a
toast, but it falls apart once a spec needs:

- Sequential steps where step 2 depends on step 1 finishing.
- Conditional paths based on state.
- A confirmation prompt before a destructive action.
- Input validation that stops the rest of the chain.
- A timed pause.
- Calling a method on another widget by id.
- Running follow-up steps after an `api` call returns.

Phase B adds six new action types plus async continuations on the existing
`api` action. None of this breaks the old flat-array pattern — a handler
that was an array of `set` / `emit` / `toast` before still runs the same
way.

## Action reference

All actions live on an event handler object with a discriminator `action`
field. Handlers are still attached to widgets via `on_click`, `on_change`,
`on_submit`, `on_focus`, and `on_blur`.

### `flow`

Run a list of steps sequentially. Each step is awaited before the next one
starts. If any step throws a `FlowAbortError` (the `validate` action, for
example), the remaining steps are skipped and the optional `on_error`
branch runs.

```json
{
  "action": "flow",
  "steps": [
    { "action": "set", "target": "submitting", "value": true },
    { "action": "api", "url": "/api/save", "method": "POST", "body": { "name": "{state.name}" } },
    { "action": "set", "target": "submitting", "value": false }
  ],
  "on_error": [
    { "action": "set", "target": "submitting", "value": false },
    { "action": "toast", "message": "Save failed", "variant": "error" }
  ]
}
```

Flows may be nested up to `MAX_FLOW_DEPTH` (8) levels. Going deeper throws
— that's a spec bug, not a runtime error to swallow.

### `branch`

Evaluate a condition against state and run either `then` or `else`.

```json
{
  "action": "branch",
  "if": "state.count > 0",
  "then": [{ "action": "toast", "message": "You have items." }],
  "else": [{ "action": "toast", "message": "Cart is empty.", "variant": "warning" }]
}
```

`else` is optional. If omitted and the condition is falsy, the branch is a
no-op.

### `confirm`

Suspend the flow, show the built-in `ConfirmDialog`, and resume with
`on_confirm` or `on_cancel` once the user clicks a button. No wiring
needed — Ripple auto-mounts the dialog.

```json
{
  "action": "confirm",
  "title": "Delete note?",
  "message": "This cannot be undone.",
  "confirm_label": "Delete",
  "cancel_label": "Keep",
  "on_confirm": [
    { "action": "api", "url": "/api/notes/{state.selectedId}", "method": "DELETE" }
  ],
  "on_cancel": [
    { "action": "toast", "message": "Kept note.", "variant": "info" }
  ]
}
```

Dismissing the dialog via Esc or overlay click is treated as a cancel.

The dispatcher writes the pending request into the reserved state key
`state._ripple_confirm` while waiting. Treat that key as reserved — do not
bind widgets to it or set it from specs.

### `validate`

Assert a condition. On success it does nothing. On failure, it emits a
toast with `message` and then aborts the current flow so later steps are
skipped. The outer `flow.on_error` branch (if any) runs.

```json
{
  "action": "validate",
  "condition": "state.email",
  "message": "Email is required.",
  "variant": "error"
}
```

Only toast + abort is supported in v1. There is no `on_fail` continuation
— use `flow.on_error` if you need one.

### `delay`

Pause the current flow for `ms` milliseconds. Useful for debouncing
success messages or tests.

```json
{ "action": "delay", "ms": 500 }
```

### `invoke`

Call a named method on a widget that opted in to the widget registry by
its `id`. This is the mechanism for cross-widget imperative commands that
don't need their own state key.

```json
{ "action": "invoke", "target": "searchInput", "method": "focus" }
```

Built-ins that ship method support today:

- `modal` (also `dialog`) — `open`, `close`
- `input` — `focus`

Custom widgets can register their own by calling
`getContext('ui-widget-registry')` and returning the unregister function
from an `$effect`:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { WidgetRegistry } from '@ripple-ui/svelte';

  let { id }: { id?: string } = $props();
  const registry = getContext<WidgetRegistry | undefined>('ui-widget-registry');

  $effect(() => {
    if (!id || !registry) return;
    return registry.register(id, 'greet', (name: string) => {
      console.log(`hello ${name}`);
    });
  });
</script>
```

An `invoke` targeting a widget that hasn't registered the method warns
and continues — the rest of the flow runs.

## Extended `api`

The `api` action still emits a `RippleEvent` to the host's `onEvent`
callback so the host performs the actual HTTP request. What changed is
that `onEvent` may now return a `RippleEventResult`:

```ts
type RippleEventResult = {
  ok: boolean;
  data?: unknown;
  error?: { message: string; status?: number; body?: unknown };
};
```

The dispatcher awaits the result and chains three optional fields:

- `response_key` — state path to write `result.data` into on success.
- `on_success` — additional handlers that run after a 2xx response.
- `on_error` — additional handlers that run on a non-ok response, a
  network failure, or a host-thrown error. The error payload is written
  into the reserved state key `state._flow_error`.

Existing hosts returning `void` continue to work unchanged. The
dispatcher treats `void` as a silent success — no error branch fires,
no `response_key` is populated (since there is no data), and any
`on_success` still runs. That keeps the old "fire the request and move
on" behavior for specs that never opted into chaining.

```json
{
  "action": "api",
  "url": "/api/notes",
  "method": "POST",
  "body": { "text": "{state.draft}" },
  "response_key": "latestNote",
  "on_success": [
    { "action": "set", "target": "draft", "value": "" },
    { "action": "toast", "message": "Saved.", "variant": "success" }
  ],
  "on_error": [
    { "action": "toast", "message": "Could not save: {state._flow_error.message}", "variant": "error" }
  ]
}
```

## Reserved state keys

Phase B introduces two reserved top-level state keys. Don't bind widgets
to them or write to them from specs — the dispatcher owns these:

- `state._ripple_confirm` — holds the currently-pending `confirm`
  request while the `ConfirmDialog` is open.
- `state._flow_error` — holds the last error that aborted a flow or
  failed an `api` call. Consumers typically read this from within an
  `on_error` branch.

## End-to-end examples

### Form submit with confirmation and validation

```json
{
  "action": "flow",
  "steps": [
    { "action": "validate", "condition": "state.name", "message": "Name is required." },
    { "action": "validate", "condition": "state.email", "message": "Email is required." },
    {
      "action": "confirm",
      "title": "Submit?",
      "message": "We will email {state.email} with the receipt.",
      "on_confirm": [
        { "action": "set", "target": "submitting", "value": true },
        {
          "action": "api",
          "url": "/api/orders",
          "method": "POST",
          "body": { "name": "{state.name}", "email": "{state.email}" },
          "response_key": "lastOrder",
          "on_success": [
            { "action": "set", "target": "submitting", "value": false },
            { "action": "toast", "message": "Order placed.", "variant": "success" }
          ],
          "on_error": [
            { "action": "set", "target": "submitting", "value": false },
            { "action": "toast", "message": "Order failed.", "variant": "error" }
          ]
        }
      ]
    }
  ]
}
```

### Branching on API response

```json
{
  "action": "flow",
  "steps": [
    {
      "action": "api",
      "url": "/api/session",
      "response_key": "session"
    },
    {
      "action": "branch",
      "if": "state.session.isAdmin",
      "then": [{ "action": "navigate", "url": "/admin" }],
      "else": [{ "action": "navigate", "url": "/dashboard" }]
    }
  ]
}
```

### Confirm-then-delete with focus follow-through

```json
{
  "action": "confirm",
  "title": "Remove filter",
  "message": "Clear the active filter and reset the list?",
  "confirm_label": "Clear",
  "on_confirm": [
    { "action": "set", "target": "filter", "value": "" },
    { "action": "invoke", "target": "searchBox", "method": "focus" },
    { "action": "toast", "message": "Filter cleared.", "variant": "info" }
  ]
}
```

## Backwards compatibility

Specs written for the old flat-action dispatcher still work. A
`[{ action: 'set' }, { action: 'emit' }, { action: 'toast' }]` array
still runs the three steps in order, exactly as before. All new action
types are additive — the discriminated union widens rather than
replacing the old shape.
