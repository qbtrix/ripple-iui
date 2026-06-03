# Ripple — Interactive Inputs, Tabs, and Handlers

**Date:** 2026-04-30
**Status:** Approved — ready for implementation plan.

## Problem

End users interacting with Ripple-rendered UI (in pockets, inline-rendered specs, or the playground) cannot get values out of any input. Tabs do not behave as switches that drive other content. Spec-level event handlers exist but only fire on the wrong events.

Three concrete defects, found in 2026-04-30 audit:

1. **`bind` is read-only.** `NodeRenderer.svelte` reads bound state into `value` but never writes user changes back. Typing into `<input bind="{state.x}">` shows whatever was in `state.x` initially and never updates it. Every input widget therefore appears dead unless the spec author manually adds `on_change: { action: 'set', target: ..., value: ... }` to every field.
2. **No `on_input` event.** The schema only exposes `on_click / on_change / on_submit / on_focus / on_blur`. Native `change` on `<input type=text>` fires only on blur or Enter, so even a fully-wired `on_change` handler does not deliver keystrokes.
3. **Playground demo is wrong.** The example in `src/routes/playground/+page.svelte` uses `on: { click: [...] }`, which is not in the schema (correct key: `on_click`). The button never toasts, reinforcing the impression "nothing works".

## Goals

Make Ripple-rendered specs interactive end-to-end with zero per-input boilerplate from spec authors (LLM or human). The host application (paw-enterprise pockets, inline renderer) can read user input either by reading Ripple state or by subscribing to a single state-change stream.

Out of scope: new widgets (slider, radio-group, combobox, multi-select, date-picker, file-upload, form), validation framework, keyboard-event hooks beyond `on_input`.

## Design

### 1. Two-way `bind` in `NodeRenderer`

When a node has a `bind` field, `NodeRenderer.svelte` automatically writes the new value back to the bound state path on `onchange`. Implementation lives in one place — generic over widget type. Any widget whose contract is `onchange(value: unknown)` participates without per-widget code.

Combined behavior with user-supplied `on_change`:

1. Write-back to the bound state path runs first.
2. Then any `on_change` handler runs. Because `EventDispatcher.freshContext` re-snapshots `stateManager.state` on each step, the user's handler sees the just-written value.

Path resolution reuses the existing read-side logic in `boundValue`:

- Strip `{...}` wrapper.
- Strip leading `state.` if present.
- Pass to `stateManager.set(path, value)`.

Checkbox and switch already receive `boundValue` as `checked` (NodeRenderer line 265). The same auto-write-back applies — the value passed to `onchange` is already the boolean, so no special-casing is needed.

### 2. `on_input` event

Add `on_input?: EventHandlerOrArray` to `UINodeBase` in `src/lib/schema/ui-spec.ts`.

In `NodeRenderer.svelte`, mirror the existing `createEventHandler` pattern to produce an `oninput` prop and spread it onto the widget. Widgets that do not expose `oninput` simply ignore it (Svelte tolerates extra props).

`Input.svelte` already accepts `oninput`. `Textarea.svelte` already calls its `onchange` from the native `oninput` event — extend it to also call an `oninput` callback when present. `Select / Checkbox / Switch / Tabs` have no native input-vs-change distinction, so `on_input` simply does not fire for them — that matches DOM semantics and is fine.

### 3. Live updates for text inputs

`Input.svelte` currently:
- `oninput` → calls user `oninput` callback.
- `onchange` → calls user `onchange` callback (only on blur/Enter for text inputs).

Change so that `oninput` *also* calls `onchange(value)`. This makes the spec-level `on_change` handler fire on every keystroke for text inputs — matching `Textarea` behavior, and matching what an LLM almost always wants. Spec authors who need commit-only semantics use `on_blur` instead.

This change preserves the contract Tabs/Select/Checkbox/Switch already follow (`onchange` is the canonical "value changed" event).

### 4. Host stream — `onStateChange` on `<Ripple>`

Add a single optional callback prop to `<Ripple>`:

```ts
onStateChange?: (path: string, value: unknown, state: Record<string, unknown>) => void;
```

Implementation:

- Add a tiny pub/sub to `StateManager`: `subscribe(fn)` returns an unsubscribe.
- `StateManager.set` notifies subscribers after the proxy write.
- `Ripple.svelte` subscribes when `onStateChange` is provided; unsubscribes on destroy.

Hosts that already use the existing `onEvent` callback for `emit / api / navigate / toast / pin / unpin` see no change. Hosts that want a continuous stream of every form field add one prop and stop writing per-input handlers.

### 5. Playground demo fix

`src/routes/playground/+page.svelte`: change `on: { click: [...] }` to `on_click: [...]` so the example button toasts. Add a small interactive section to the example spec that exercises the new behavior — one input bound to state and a `text` widget that reads `{state.username}` — so the playground demonstrates the round-trip on first load.

### 6. Tests

`vitest` is the test runner. Place new test files alongside existing ones (`src/lib/components/`, `src/lib/widgets/input/`).

Test cases:

- `NodeRenderer.bind.test.ts`
  - `input` with `bind`: typing updates state.
  - `checkbox` with `bind`: toggling updates state to a boolean.
  - `tabs` with `bind`: selecting a tab updates state.
  - `bind + on_change`: write-back precedes user handler; handler observes new state.
  - `on_input` fires on text inputs and is wired to a `set` action.
- `Input.test.ts` (extend existing)
  - `oninput` fires `onchange(value)` for live updates.
- `Ripple.onStateChange.test.ts`
  - Subscriber receives `(path, value, state)` after every `set`.
  - Subscriber unsubscribes on component destroy.

## Architecture impact

All changes are additive to existing files:

- `src/lib/schema/ui-spec.ts` — one new optional field.
- `src/lib/components/NodeRenderer.svelte` — generalised event-handler block plus a `bind` write-back wrapper.
- `src/lib/core/state-manager.svelte.ts` — subscriber list and notification.
- `src/lib/Ripple.svelte` — accept `onStateChange` and subscribe.
- `src/lib/widgets/input/Input.svelte` — call `onchange` from `oninput`.
- `src/lib/widgets/input/Textarea.svelte` — call `oninput` callback when present.
- `src/routes/playground/+page.svelte` — fix syntax and demonstrate two-way bind.

No public API removals. The default behavior of `bind` becomes two-way, which is a behavior change for any spec that relied on `bind` being read-only — none currently do (the audit shows every interactive spec already pairs `bind` with `on_change: set`, which becomes redundant but harmless).

## Risks

- **Double-write redundancy.** Existing specs with `bind` + `on_change: set` to the same path will write twice. Both writes set the same value, so this is harmless; the second is a no-op for primitives. We do not detect or warn — call sites can be cleaned up incrementally.
- **`onchange` semantics change for text inputs.** A spec that explicitly relied on `Input.onchange` firing only on blur loses that. Unlikely in practice — the existing widget behavior is undocumented, and host code that needs commit semantics has `on_blur`.
- **Subscriber storms.** `onStateChange` fires per `set`. A long flow that writes ten state keys fires ten times. Acceptable — hosts that want batching can debounce.

## Verification

After implementation:

1. `bun run check` passes.
2. `bun run test` passes including new tests.
3. Playground (`bun run dev`, `/playground`) loads with the updated example: typing in the input updates the visible text below it, and the toast button toasts.
4. Manual smoke in pocket renderer host (paw-enterprise) — inline-rendered form spec with `bind` produces values readable from host state.
