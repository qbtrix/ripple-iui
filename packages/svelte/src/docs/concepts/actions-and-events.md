---
title: Actions and events
description: How a spec reacts to clicks and input, which actions run inside the render, and which ones are handed to your app.
order: 3
---

A spec never calls your code. It attaches actions to widget events, and each action either changes the spec's own state or asks your app to do something through the `onEvent` callback. Your handler decides what actually happens.

## Events

Put a handler on a node under one of these keys:

| Key | Fires when |
|---|---|
| `on_click` | The widget is clicked |
| `on_change` | The value changes (inputs, selects, checkboxes, switches, tabs) |
| `on_input` | The user types |
| `on_submit` | A form is submitted |
| `on_focus` | The widget gains focus |
| `on_blur` | The widget loses focus |

A widget can also define its own events, such as `on_complete` on a timer or `on_select` on a calendar. Each widget's page in the [widget reference](/docs/widgets) lists them.

A handler is one action object or an array of them. An array runs in order:

```json
{
  "on_click": [
    { "action": "set", "target": "saving", "value": true },
    { "action": "api", "url": "/api/save", "method": "POST" },
    { "action": "toast", "message": "Saved", "variant": "success" }
  ]
}
```

## Actions that change state

These run inside the render and never reach your app:

| Action | Fields | What it does |
|---|---|---|
| `set` | `target`, `value?` | Writes `value` to the state path `target`. With no `value`, it writes the value the event carried (the new text of an input, for example). |
| `toggle` | `target`, `value?` | On a boolean, flips it. On an array, adds `value` if it is missing and removes it if present. |
| `push` | `target`, `value?` | Appends `value` to the array at `target`, creating the array if needed. |
| `remove` | `target`, `index?`, `value?` | Removes an item from the array at `target`, by `index` (a number literal) or by matching `value`. Objects match by content. Inside a loop, remove by `"value": "{item}"`. |
| `open` | `target` | Sets `target` to `true`. Handy for dialogs. |

```ripple
{
  "version": "1.0",
  "state": { "draft": "", "items": ["Milk", "Bread"] },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "12px" },
    "children": [
      {
        "type": "flex",
        "props": { "gap": "8px", "align": "end" },
        "children": [
          { "type": "input", "bind": "draft", "props": { "label": "Add an item", "placeholder": "Eggs" } },
          {
            "type": "button",
            "props": { "label": "Add" },
            "on_click": [
              { "action": "push", "target": "items", "value": "{state.draft}" },
              { "action": "set", "target": "draft", "value": "" }
            ]
          }
        ]
      },
      {
        "type": "each",
        "items": "{state.items}",
        "children": [
          {
            "type": "flex",
            "props": { "gap": "8px", "align": "center" },
            "children": [
              { "type": "text", "props": { "text": "{item}" } },
              {
                "type": "button",
                "props": { "label": "Remove", "variant": "ghost", "size": "sm" },
                "on_click": { "action": "remove", "target": "items", "value": "{item}" }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

`target` can hold an expression too, so `"target": "issues.{index}.status"` writes to the current row of a loop.

## Actions your app handles

These arrive at `onEvent` as a `RippleEvent`:

| Action | Fields | Event your app receives |
|---|---|---|
| `navigate` | `url` | `{ type: 'navigate', url }` |
| `toast` | `message`, `variant?` | `{ type: 'toast', message, variant }` |
| `emit` | `target?`, `value?` | `{ type: 'emit', name, payload }`, where `name` is `target` and `payload` is the resolved `value` |
| `pin`, `unpin` | `target?`, `value?` | `{ type: 'pin', target, payload }` |
| `api` | `url`, `method?`, `body?`, `headers?` | `{ type: 'api', url, method, body, headers }` |
| `run_source`, `call_binding`, `invoke_tool` | see [Flow actions](/docs/concepts/flow-actions) | the named source, binding or tool |
| `animate` | `target`, `motion` | `{ type: 'animate', target, motion }`; Ripple also plays the animation itself |

`toast` also feeds Ripple's own toast queue, so a spec that includes a `toast` widget shows the message without any host code.

Expressions in `url`, `body`, `headers` and `message` are resolved before the event leaves the render. A `navigate` URL is also checked: anything other than a relative path, `http`, `https`, `mailto` or `tel` reaches your handler as an empty string, even when an expression built it.

## Handling events

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Ripple, type RippleEvent } from '@ripple-ui/svelte';

  let { spec } = $props();

  async function onEvent(event: RippleEvent) {
    switch (event.type) {
      case 'navigate':
        if (event.url) goto(event.url);
        return;
      case 'emit':
        console.log(event.name, event.payload);
        return;
      case 'api': {
        const res = await fetch(event.url!, {
          method: event.method ?? 'GET',
          headers: { 'content-type': 'application/json', ...event.headers },
          body: event.body ? JSON.stringify(event.body) : undefined
        });
        if (!res.ok) return { ok: false, error: { message: res.statusText, status: res.status } };
        return { ok: true, data: await res.json() };
      }
    }
  }
</script>

<Ripple {spec} {onEvent} />
```

For `api`, `run_source`, `call_binding` and `invoke_tool`, the value you return goes back into the spec: `data` can be written to state and the spec's `on_success` or `on_error` steps run. Returning nothing counts as success with no data. Throwing counts as a failure. The details are in [Flow actions](/docs/concepts/flow-actions).

The spec decides what to ask for; your handler decides whether to do it. Treat every event as a request from model output: check the URL before you fetch it, and don't forward credentials the spec put in `headers` without checking where they go.

## The event type

```ts
type RippleEvent = {
  type: 'api' | 'run_source' | 'call_binding' | 'invoke_tool'
      | 'navigate' | 'toast' | 'emit' | 'pin' | 'unpin' | 'animate';
  url?: string;
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  source?: string;                   // run_source
  binding?: string;                  // call_binding
  path?: string;                     // call_binding
  params?: Record<string, unknown>;  // call_binding
  tool?: string;                     // invoke_tool
  args?: Record<string, unknown>;    // invoke_tool
  target?: string;
  motion?: unknown;                  // animate
  message?: string;                  // toast
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  name?: string;                     // emit
  payload?: unknown;                 // emit, pin, unpin
};

type RippleEventResult = {
  ok: boolean;
  data?: unknown;
  error?: { message: string; status?: number; body?: unknown };
};

type OnEventCallback = (event: RippleEvent) => void | Promise<RippleEventResult | void>;
```

## Multi-step logic

Sequencing, branches, confirmation dialogs, validation and delays are actions too. They are covered in [Flow actions](/docs/concepts/flow-actions).
