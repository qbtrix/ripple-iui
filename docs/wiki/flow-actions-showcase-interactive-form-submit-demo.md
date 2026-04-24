---
{
  "title": "Flow Actions Showcase — Interactive Form Submit Demo",
  "summary": "A live showcase page that exercises Ripple's flow action system through a form-submit scenario, demonstrating validate, branch, confirm, api, toast, delay, invoke, and on_success/on_error chaining against a simulated host with a side-panel event log.",
  "concepts": [
    "flow actions",
    "validate",
    "api action",
    "on_success",
    "on_error",
    "toast action",
    "invoke action",
    "delay action",
    "RippleEvent",
    "RippleEventResult",
    "mocked host",
    "event log",
    "form submit"
  ],
  "categories": [
    "showcase",
    "flow-actions",
    "interactivity"
  ],
  "source_docs": [
    "9f213387b4113d4d"
  ],
  "backlinks": null,
  "word_count": 394,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`routes/showcase/flow/+page.svelte` is a runnable proof-of-concept for Ripple's declarative flow action system. Rather than testing widget appearance, it verifies that a multi-step orchestrated interaction — form validation, API call, success/error branching, toast feedback, and focus management — works correctly end-to-end against a simulated host.

## Scenario

The spec renders an order form with two inputs (Name, Email) and two buttons. On submit, the following flow fires:

```
1. validate — name is required
2. validate — email is required
3. set submitting = true
4. api POST /orders — simulated 400ms call
5. on_success:
   - set lastOrder
   - set submitting = false
   - toast "Order placed."
   - delay 200ms
   - invoke nameInput.focus()
6. on_error:
   - set submitting = false
   - toast "Could not place order."
```

This sequence exercises every major flow action type in a single scenario.

## Mocked Host

```typescript
async function handleEvent(e: RippleEvent): Promise<RippleEventResult | void> {
  if (e.type === 'api') {
    await new Promise((r) => setTimeout(r, 400));
    const email = (e.body as { email?: string })?.email ?? '';
    if (email.endsWith('@fail.test')) {
      return { ok: false, error: { message: 'Email rejected by server', status: 400 } };
    }
    return { ok: true, data: { id: `ord_${Math.floor(Math.random() * 1e6)}`, email } };
  }
  // toast and navigate are side-effects — just log them
}
```

The `@fail.test` trick lets testers trigger the error branch without a real backend — submit `user@fail.test` and the `on_error` chain fires; submit any other email and `on_success` fires. This is a deliberate testing affordance, not production logic.

## Event Log

Every event emitted by Ripple is appended to a reactive `log` array and rendered in a side panel:

```typescript
let log = $state<string[]>([]);
function push(msg: string) {
  log = [...log, `${new Date().toLocaleTimeString()}  ${msg}`];
}
```

The log makes the flow's execution sequence visible without a debugger — developers can see exactly which actions fired and in what order.

## Layout

The page uses a two-column grid: the Ripple-rendered form on the left, the event log on the right. This side-by-side layout lets developers observe the event sequence in real time as they interact with the form.

## Known Gaps

The `confirm` action from the flow-actions spec is listed in the page description but not exercised in the current demo spec. The `navigate` action is stubbed with a log message rather than a real SvelteKit navigation call.