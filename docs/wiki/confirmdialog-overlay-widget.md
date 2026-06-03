---
{
  "title": "ConfirmDialog Overlay Widget",
  "summary": "An auto-mounted confirmation dialog that renders when the event dispatcher writes a `PendingConfirm` object to `state._ripple_confirm`. On user decision, it calls `resolveConfirm` to resume the suspended flow, with a fallback that directly clears state if the resolver is stale — preventing flows from hanging indefinitely.",
  "concepts": [
    "confirm dialog",
    "flow actions",
    "PendingConfirm",
    "resolveConfirm",
    "state-driven mount",
    "CONFIRM_STATE_KEY",
    "EventDispatcher",
    "StateManager",
    "HMR fallback",
    "overlay dismissal",
    "suspended flow",
    "WidgetRegistry"
  ],
  "categories": [
    "overlay",
    "widget",
    "flow-actions"
  ],
  "source_docs": [
    "16c5aa3fd9236f16"
  ],
  "backlinks": null,
  "word_count": 504,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`ConfirmDialog` is not a manually placed widget — it mounts automatically as part of the Ripple runtime overlay layer. Its visibility is entirely state-driven: when a flow action needs user confirmation before proceeding, it writes to `state._ripple_confirm`, this component renders the dialog, and the user's button click resumes or cancels the suspended flow.

## State-Driven Mount

```svelte
const pending = $derived.by<PendingConfirm | null>(() => {
  if (!stateManager) return null;
  const raw = stateManager.state[CONFIRM_STATE_KEY] as unknown;
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as PendingConfirm;
  if (!candidate.pending_id || !candidate.message) return null;
  return candidate;
});
```

The `$derived.by` validator guards against malformed state: the component only renders if the state value is a non-null object with both `pending_id` and `message`. This prevents the dialog from appearing with empty or partial content if a flow bug writes incomplete data to the confirm state key.

## The PendingConfirm Shape

A `PendingConfirm` contains:
- `pending_id` — unique ID to look up the suspended promise in the dispatcher
- `title` — optional dialog heading
- `message` — required descriptive text
- `confirm_label` / `cancel_label` — button text

## Resuming Suspended Flows

```svelte
function handleDecision(decision: 'confirm' | 'cancel') {
  if (!eventDispatcher || !pending) return;
  const resolved = eventDispatcher.resolveConfirm(pending.pending_id, decision);
  if (!resolved && stateManager) {
    stateManager.set(CONFIRM_STATE_KEY, null);
  }
}
```

`resolveConfirm` looks up the pending promise by `pending_id` and settles it with the user's decision, unblocking the flow. The boolean return value is critical: if `resolveConfirm` returns `false`, the pending ID was not found — this can happen during hot module replacement (HMR) when the dispatcher is recreated but stale state remains. In that case, the component falls back to directly clearing the state key so the dialog disappears and the UI is no longer blocked.

Without this fallback, a stale confirm dialog could persist indefinitely after HMR, making the entire UI unresponsive.

## Overlay and Escape Dismissal = Cancel

```svelte
function handleOpenChange(open: boolean) {
  if (!open && pending) {
    handleDecision('cancel');
  }
}
```

Clicking the overlay backdrop or pressing Escape closes the dialog via shadcn's `onOpenChange(false)`. The component treats this as a `cancel` decision. Without this handler, backdrop/Esc dismissal would close the dialog visually but leave the flow suspended, since `resolveConfirm` would never be called.

## Context Dependencies

The component retrieves two contexts:
- `ui-state` (`StateManager`) — reads `_ripple_confirm` reactively
- `ui-events` (`EventDispatcher`) — calls `resolveConfirm`

Both are optional-chained; if either is missing (e.g., in a test without full context setup), the dialog simply never renders.

## Data Attributes for Testing

```svelte
data-ripple-confirm-dialog
data-ripple-confirm-cancel
data-ripple-confirm-ok
```

Three stable `data-` attributes are added to the dialog container and buttons. These are test hooks that remain stable even if button labels or class names change.

## Known Gaps

- Only one confirm dialog can be pending at a time. If two flow branches simultaneously request confirmation, the second write overwrites the first, silently canceling it.
- The dialog does not expose a loading/disabled state for the confirm button while the flow is processing after resolution.