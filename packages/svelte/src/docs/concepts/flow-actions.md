---
title: Flow actions
description: Sequence, branch, confirm, validate and wait inside one handler, and chain follow-up steps onto calls your app answers.
order: 4
---

A handler array runs its steps in order, and that covers simple clicks. Flow actions add what a real form or a delete button needs: an error branch for the whole sequence, branches on state, a confirmation dialog, validation that stops the chain, a pause, and follow-up steps once your app answers a request.

They are ordinary actions, so they go anywhere a handler goes, and they nest.

## flow

Runs `steps` one after another, waiting for each. If a step aborts the flow (a failed `validate`), the remaining steps are skipped and `on_error` runs.

```json
{
  "action": "flow",
  "steps": [
    { "action": "validate", "condition": "state.name", "message": "Name is required." },
    { "action": "set", "target": "submitting", "value": true },
    { "action": "api", "url": "/api/save", "method": "POST", "body": { "name": "{state.name}" } },
    { "action": "set", "target": "submitting", "value": false }
  ],
  "on_error": [{ "action": "set", "target": "nameMissing", "value": true }]
}
```

A failed request doesn't abort the flow. It runs the request's own `on_error` (see [Requests with follow-up steps](#requests-with-follow-up-steps)) and the flow carries on with the next step.

Flows nest up to 8 levels (`MAX_FLOW_DEPTH`). Deeper than that throws, because it is a bug in the spec.

## branch

Evaluates `if` against state and runs `then` or `else`. `else` is optional.

```ripple
{
  "version": "1.0",
  "state": { "count": 0, "message": "" },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "12px" },
    "children": [
      { "type": "text", "props": { "text": "In cart: {state.count}" } },
      {
        "type": "flex",
        "props": { "gap": "8px" },
        "children": [
          {
            "type": "button",
            "props": { "label": "Add one", "variant": "outline" },
            "on_click": { "action": "set", "target": "count", "value": "{state.count + 1}" }
          },
          {
            "type": "button",
            "props": { "label": "Check out" },
            "on_click": {
              "action": "branch",
              "if": "state.count > 0",
              "then": [{ "action": "set", "target": "message", "value": "Checking out {state.count} items." }],
              "else": [{ "action": "set", "target": "message", "value": "Your cart is empty." }]
            }
          }
        ]
      },
      { "type": "text", "show": "state.message", "props": { "text": "{state.message}" } }
    ]
  }
}
```

## confirm

Pauses the handler, shows a confirmation dialog, and continues with `on_confirm` or `on_cancel`. Ripple mounts the dialog itself; there is nothing to wire. Pressing Escape or clicking outside counts as cancel.

```json
{
  "action": "confirm",
  "title": "Delete note?",
  "message": "This can't be undone.",
  "confirm_label": "Delete",
  "cancel_label": "Keep",
  "on_confirm": [{ "action": "api", "url": "/api/notes/{state.selectedId}", "method": "DELETE" }],
  "on_cancel": [{ "action": "toast", "message": "Kept the note.", "variant": "info" }]
}
```

## validate

Checks `condition`. If it is truthy, nothing happens. If not, Ripple sends a toast with `message` (variant `error` unless you set one) and aborts the current flow, so the steps after it don't run and the flow's `on_error` does.

```json
{ "action": "validate", "condition": "state.email", "message": "Email is required." }
```

## delay

Waits `ms` milliseconds before the next step.

```json
{ "action": "delay", "ms": 500 }
```

## invoke

Calls a method on another widget by its `id`, for commands that don't need a state key:

```json
{ "action": "invoke", "target": "search", "method": "focus" }
```

Built-in methods: `focus` on `input`; `open` and `close` on `modal` and `command-palette`; `start` and `stop` on `coachmark`. A custom widget can register its own (see [Custom widgets](/docs/guides/custom-widgets#methods-for-invoke)). Invoking a method nobody registered logs a warning and the rest of the flow continues.

## Requests with follow-up steps

`api` hands a request to your `onEvent` handler. If the handler returns a `RippleEventResult`, the spec can act on the answer:

- `response_key`: a state path where `data` is written on success.
- `on_success`: steps that run after success. The returned `data` is the event value, so a `set` with no `value` writes it, and `{event}` reads it.
- `on_error`: steps that run when the result has `ok: false` or the handler throws. The error is written to `state._flow_error` as `{ message, status?, body? }`.

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
    { "action": "toast", "message": "Couldn't save: {state._flow_error.message}", "variant": "error" }
  ]
}
```

A handler that returns nothing counts as success with no data: `on_success` runs and `response_key` stays unset.

## Named server calls

Three more actions follow the same result protocol, but name something your server defines instead of carrying a URL. The spec never sees the endpoint, the HTTP method or the credentials; your handler looks the name up and runs it.

| Action | Fields | Use it for |
|---|---|---|
| `run_source` | `source` | Re-running a named read, for a Refresh button or after a write. |
| `call_binding` | `binding`, `path?`, `params?` | A named write. The HTTP method lives with the binding on your server, so the spec can't pick it. |
| `invoke_tool` | `tool`, `args?` | A named tool that isn't wrapped in a binding. |

All three take `on_success` and `on_error`. `path`, `params` and `args` are resolved before the event reaches you, so your server never receives a raw `{state.x}`.

```json
{
  "action": "call_binding",
  "binding": "toggle_task",
  "path": "{item.id}",
  "params": { "done": true },
  "on_success": [{ "action": "run_source", "source": "tasks" }],
  "on_error": [{ "action": "toast", "message": "Couldn't save.", "variant": "error" }]
}
```

Ripple doesn't check these names in the browser. Your server is the authority: reject unknown names and tools the user isn't allowed to run, and return `{ ok: false, error: { message, status } }` so the spec's `on_error` runs.

Prefer a named call over a raw `api` when the operation is a fixed part of your app. The endpoint, method and auth stay on the server, and a model can't rewrite them.

## Reserved state keys

The dispatcher owns two top-level keys. Don't bind widgets to them or set them from a spec:

- `_ripple_confirm`: the pending `confirm` request while its dialog is open.
- `_flow_error`: the last error from a failed request (`{ message, status?, body? }`) or an aborted flow (`{ message: 'validation_failed', details }`). Read it inside `on_error`.

## A full example

Validate two fields, confirm, submit, and handle both outcomes:

```json
{
  "action": "flow",
  "steps": [
    { "action": "validate", "condition": "state.name", "message": "Name is required." },
    { "action": "validate", "condition": "state.email", "message": "Email is required." },
    {
      "action": "confirm",
      "title": "Place order?",
      "message": "We'll send the receipt to {state.email}.",
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
