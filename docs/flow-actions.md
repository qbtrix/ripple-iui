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

## Server-binding actions

> [!NOTE]
> **Status (2026-05-25):** shipped — `run_source`, `call_binding`, and `invoke_tool` landed in PRs ripple#40, #41, #43. This doc was lagging; updated to match runtime.

`api` is the generic "fire an HTTP request the host owns" verb. Three
sibling verbs delegate to host-side primitives instead of a raw URL —
the spec names a server-side entity, the host resolves it, and the
dispatcher chains continuations the same way `api` does. The HTTP verb
and endpoint never appear in the spec; only the entity name does.

All three follow the same result protocol: the host's `onEvent` returns
a `RippleEventResult`; on `ok` the result data is handed to
`on_success`; on failure the error is written to `state._flow_error`
and `on_error` runs. Hosts returning `void` are treated as a silent
success (no `on_error` fires), same as `api`.

### `run_source`

Re-run a server-side read binding ("source") by name. The host
re-fetches the named source on demand. Use it to refresh a data-backed
widget after a mutation, on a "Refresh" button, or on an interval.

```json
{
  "action": "run_source",
  "source": "prs",
  "on_success": [
    { "action": "toast", "message": "Refreshed.", "variant": "success" }
  ],
  "on_error": [
    { "action": "toast", "message": "Could not refresh.", "variant": "error" }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `action` | `"run_source"` | yes | Discriminator. |
| `source` | `string` | yes | Name of the server-side source to re-run. |
| `on_success` | `EventHandler[]` | no | Runs with the refreshed data after a successful re-run. |
| `on_error` | `EventHandler[]` | no | Runs on host-reported failure. The error sits at `state._flow_error`. |

There is no `params` / `body` / `path` field on `run_source` — the
source is identified by name only; any params it needs live in the
binding definition on the server. If the host returns `ok: false`, the
error is written to `state._flow_error` with the shape
`{ message, status?, body? }` and `on_error` runs. A bad source name is
a host-side failure (typically `{ message: "source not found" }`) — the
dispatcher doesn't validate names client-side.

**When to use vs `api`.** Reach for `run_source` whenever the host
already has the read defined as a named binding — the spec stays
declarative and the URL / verb / auth all stay server-side. Use raw
`api` only for ad-hoc requests that haven't been promoted to a binding.

### `call_binding`

Invoke a named server-side write binding. The write-action twin of
`run_source`: the spec names the binding, the host performs the write.
The HTTP verb is read from the persisted spec on the server — the
client never names it.

```json
{
  "action": "call_binding",
  "binding": "toggle_task",
  "path": "{state.selectedId}",
  "params": { "done": true },
  "on_success": [
    { "action": "toast", "message": "Saved.", "variant": "success" }
  ],
  "on_error": [
    { "action": "toast", "message": "Could not save.", "variant": "error" }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `action` | `"call_binding"` | yes | Discriminator. |
| `binding` | `string` | yes | Name of the server-side write binding to invoke. |
| `path` | `string` | no | Path segment for the binding. Supports `{state.x}` / `{item.id}` interpolation. |
| `params` | `object` | no | Parameter map for the write. Values support `{state.x}` / `{item.id}` expressions (including nested objects / arrays). |
| `on_success` | `EventHandler[]` | no | Runs with the result data after a successful write. |
| `on_error` | `EventHandler[]` | no | Runs on host-reported failure. |

`path` and each value of `params` are resolved client-side before the
event leaves the browser — exactly like `api` resolves `url` and `body`
— so the server never sees a raw `{state.x}` expression. If the host
returns `ok: false` the error is written to `state._flow_error` and
`on_error` runs.

`method` is deliberately absent from this handler. The HTTP verb lives
in the persisted binding on the server and is the server's decision,
not the client's. If a spec needs to pick the verb, that's an `api`
call, not a `call_binding`.

**When to use vs `api`.** Use `call_binding` whenever the host has the
write declared as a named binding (RFC 05 — Pocket Write Actions).
That's the path that respects the spec's bound persona, the binding's
own auth + audit trail, and the server-side verb. Use raw `api` only
for one-off requests that aren't durable enough to live as a binding.

### `invoke_tool`

Invoke a named server-side tool (WebFetch, Composio integrations, etc.)
by tool id + resolved args. The click-driven sibling of `run_source` /
`call_binding`: where `run_source` re-runs a declared read and
`call_binding` runs a declared write, `invoke_tool` runs a tool that
isn't fronted by a binding at all. The host POSTs to
`/pockets/{id}/tools/run` with the tool name + args.

```json
{
  "action": "invoke_tool",
  "tool": "WebFetch",
  "args": { "url": "https://api.example.com/feed" },
  "on_success": [
    { "action": "set", "target": "feed" },
    { "action": "toast", "message": "Refreshed.", "variant": "success" }
  ],
  "on_error": [
    { "action": "toast", "message": "Could not refresh.", "variant": "error" }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `action` | `"invoke_tool"` | yes | Discriminator. |
| `tool` | `string` | yes | Id of the server-side tool to invoke (e.g. `"WebFetch"`, `"GMAIL_FETCH_EMAILS"`). |
| `args` | `object` | no | Argument map for the tool. Values support `{state.x}` / `{item.id}` expressions, including nested objects / arrays. |
| `on_success` | `EventHandler[]` | no | Runs with the result data after a successful invocation. |
| `on_error` | `EventHandler[]` | no | Runs on host-reported failure. |

Each value of `args` is resolved client-side before the event is
emitted — same contract as `call_binding.params`. The server never
sees a raw expression.

Tools are gated by an allowlist on the host. A spec asking for a tool
the pocket can't run gets back
`{ ok: false, error: { message: "tool not allowlisted", status: 403 } }`,
the error lands in `state._flow_error`, and `on_error` fires. The
dispatcher does not validate tool names client-side; the host is the
authority.

**When to use vs `call_binding`.** Use `call_binding` when the action
is a named write binding declared on the pocket (RFC 05). Use
`invoke_tool` when the data comes from a registered tool that doesn't
have a binding wrapper — typically a one-off integration call from a
Refresh button. If both routes exist, prefer `call_binding`: bindings
are durable, audited, and persona-aware.

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
