# Agentic UI — closing the chat loop

A pattern for chat hosts where the LLM emits Ripple specs and the rendered UI sends user actions **back into the chat thread** as if the user had typed them. This turns every interactive widget into a free-form way to continue the conversation, with the LLM driving the next view.

---

## The flow

```
┌────────────┐  spec  ┌─────────┐         ┌─────────────┐  msg   ┌─────────┐
│ LLM (host) │───────▶│ Ripple  │ onEvent │  Chat host  │───────▶│ LLM     │
│            │        │ render  │────────▶│ (paw-app)   │        │         │
└────────────┘        └─────────┘         └─────────────┘        └─────────┘
       ▲                                                              │
       └──────────────── new spec for next turn ──────────────────────┘
```

1. User asks "show me some products"
2. LLM responds with a Ripple spec rendering product cards, each with a Buy button
3. Ripple renders the spec; user taps **Buy** on a card
4. Ripple emits a `RippleEvent` to the host's `onEvent` callback
5. Host posts the event payload as a new user message
6. LLM receives "I want to buy AeroPress" and responds with the next spec (cart, confirmation, payment, etc.)

No client-side branching, no hand-rolled "buy handler" per product type. The LLM stays in control of every turn, and the spec stays declarative.

---

## The contract

Use the existing **`emit`** action with a well-known target. Recommended channel names:

| Target | Meaning |
|---|---|
| `chat.send` | Post the value as a user message in the current thread |
| `chat.suggest` | Surface the value as a tappable quick-reply chip (host's call) |
| `tool.invoke` | Call a registered tool by name (`value` is `{name, args}`) |
| `nav.open` | Open a URL — also covered by the dedicated `navigate` action |

Hosts implement only the channels they care about; unknown targets are safe to ignore.

---

## Spec example — product list

```jsonc
{
  "version": "1.0",
  "state": {
    "products": [
      { "id": "ae", "name": "AeroPress", "price": "$39", "image": "..." },
      { "id": "v60", "name": "Hario V60", "price": "$25", "image": "..." }
    ]
  },
  "ui": {
    "type": "grid",
    "props": { "columns": 2, "gap": "12px" },
    "children": [
      {
        "type": "each",
        "items": "products",
        "item_as": "product",
        "children": [
          {
            "type": "card",
            "props": { "title": "{product.name}", "description": "{product.price}" },
            "children": [
              { "type": "image", "props": { "src": "{product.image}" } },
              {
                "type": "button",
                "props": { "label": "Buy" },
                "on_click": {
                  "action": "emit",
                  "target": "chat.send",
                  "value": "I want to buy the {product.name}"
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

When the user taps **Buy** on the AeroPress card:

- `{product.name}` resolves to `"AeroPress"` against the current loop context
- Ripple's `EventDispatcher` emits `{ action: 'emit', target: 'chat.send', value: 'I want to buy the AeroPress' }` to the host
- The host calls `chatStore.sendMessage(event.value)` — the LLM sees a new user message and replies with the next spec (cart, payment, etc.)

## Forwarding the click target with `{event}`

The same pattern works for any picker / list / menu that natively emits the chosen value. The `{event}` template resolves to the event payload (see `event-handling.md`):

```jsonc
{
  "type": "select",
  "props": { "options": ["Espresso", "Cappuccino", "Latte"] },
  "on_change": {
    "action": "emit",
    "target": "chat.send",
    "value": "I'd like a {event}"
  }
}
```

```jsonc
{
  "type": "command-palette",
  "props": { "commands": [{ "id": "refund", "label": "Issue refund" }] },
  "on_select": {
    "action": "emit",
    "target": "tool.invoke",
    "value": { "name": "{event}", "args": {} }
  }
}
```

---

## Host wiring

Pass an `onEvent` callback to `<Ripple>` and route by `event.target`:

```svelte
<script lang="ts">
  import { Ripple, type RippleEvent } from '@ripple-ui/svelte';
  import { chatStore } from '$lib/stores/chat.svelte';

  function handleEvent(event: RippleEvent) {
    if (event.type !== 'emit') return;

    switch (event.target) {
      case 'chat.send':
        if (typeof event.payload === 'string') {
          chatStore.sendMessage(event.payload);
        }
        break;
      case 'tool.invoke':
        // event.payload === { name, args }
        break;
      // Unknown targets: ignore — hosts only handle channels they care about.
    }
  }
</script>

<Ripple {spec} onEvent={handleEvent} />
```

That's it. No widget code touched, no per-spec branching — every interactive element in every spec the LLM emits can drive the next chat turn.

---

## When *not* to round-trip

The `emit → chat.send` loop is the right tool when the LLM should *decide* what happens next. It is **not** the right tool for purely client-side interactions:

| Action | Use |
|---|---|
| Toggle a panel, expand a row, change a tab | `set` / `toggle` actions on local state — no round-trip |
| Filter a list as the user types | `set` + bound state path — local |
| Submit a real form | `api` action (POST to your backend), or `flow` for multi-step |
| Continue the conversation | `emit` → `chat.send` — round-trip to LLM |

Mix freely within one spec. Most agent UIs end up combining all four.
