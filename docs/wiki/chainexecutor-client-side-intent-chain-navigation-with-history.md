---
{
  "title": "ChainExecutor — Client-Side Intent Chain Navigation with History",
  "summary": "ChainExecutor manages multi-step intent navigation entirely on the client, enabling instant transitions between chained specs without AI roundtrips. It maintains a browser-like history stack (with forward navigation), tracks accumulated context across steps, and supports both linear chains and selection-based `chain_map` routing.",
  "concepts": [
    "ChainExecutor",
    "intent chaining",
    "chain_map",
    "selection routing",
    "history stack",
    "forward navigation",
    "accumulated context",
    "quiz score",
    "Svelte 5 runes",
    "advance",
    "back",
    "forward",
    "ChainState",
    "immutable updates"
  ],
  "categories": [
    "intent-engine",
    "navigation",
    "state-management"
  ],
  "source_docs": [
    "56bdeef9892cd660"
  ],
  "backlinks": null,
  "word_count": 665,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

When a Ripple spec has a `chain` property pointing to a next spec, `ChainExecutor` handles the navigation. Rather than sending the user's selection back to the AI and waiting for a new spec response, the executor resolves the next spec locally and transitions instantly. This is the mechanism behind multi-step flows like booking wizards, quiz sequences, and confirmation funnels.

## State Architecture (Svelte 5 Runes)

```typescript
private _history = $state<HistoryEntry[]>([]);
private _forwardStack = $state<HistoryEntry[]>([]);
private _context = $state<Record<string, unknown>>({});
private _quizScore = $state<{ correct: number; wrong: number; answers: boolean[] }>({ ... });
```

All state uses `$state` for reactivity. The history is represented as two stacks (back and forward), mirroring browser history. UI components that read `canGoBack` or `canGoForward` automatically re-render when these stacks change.

## HistoryEntry

```typescript
interface HistoryEntry {
  spec: UniversalSpec;
  state: ChainState;
}

export interface ChainState {
  selected: unknown;
  formData: Record<string, unknown>;
  displayLabel?: string;
}
```

Each history entry stores both the spec (to render the step) and the user's selection/form state at that step (to support pre-filling when navigating back).

## advance() — Local Chain Resolution

```typescript
advance(selection, formData, idField?): UniversalSpec | null {
  // 1. Save current state snapshot
  this.updateCurrentState(selection, formData);
  // 2. Accumulate context for later steps
  this._context = { ...this._context, [`${contextKey}_selection`]: selection, ... };
  // 3. Check chain_map first (selection-based routing)
  if (chain_map && key && chain_map[key]) return this.push(chain_map[key]);
  // 4. Fall back to linear chain
  if (current.chain) return this.push(current.chain);
  // 5. null = need AI roundtrip
  return null;
}
```

A `null` return signals to the parent that local resolution failed and an AI API call is needed to get the next step. This enables hybrid navigation: most steps resolve locally, but dynamic or personalized steps can still fall back to the AI.

## chain_map — Selection-Based Routing

`chain_map` maps selection keys to next specs:

```json
{
  "chain_map": {
    "flight_a": { "intent": "confirm", ... },
    "flight_b": { "intent": "confirm", ... }
  }
}
```

The `getSelectionKey` helper extracts the key from the selection value, trying `idField` first, then common field names (`id`, `value`, `key`). This handles both flat selections (strings/numbers) and object selections from list widgets.

## back() and forward()

```typescript
back(): { spec, state } | null {
  const current = this._history[this._history.length - 1];
  this._forwardStack = [current, ...this._forwardStack];
  this._history = this._history.slice(0, -1);
  return prev ? { spec, state } : null;
}
```

`back()` is immutable: it creates new arrays rather than mutating `_history` directly. This is required for Svelte 5 reactivity — mutating the array in place would not trigger the `$state` dependency graph.

The returned `state` includes the saved `formData` and `selected` value from when the user was on that step, allowing the UI to restore form field values when navigating back.

## Accumulated Context

Each `advance()` call writes to `_context` under a key derived from the spec:

```typescript
this._context = {
  ...this._context,
  [`${contextKey}_selection`]: selection,
  [`${contextKey}_formData`]: formData
};
```

By the time the user reaches a confirmation step, `getAccumulatedContext()` returns a flat record of all prior selections and form data. This is used to populate confirmation summaries without additional API calls.

## Quiz Score Tracking

```typescript
recordQuizAnswer(isCorrect: boolean) {
  this._quizScore = { correct: ..., wrong: ..., answers: [...this._quizScore.answers, isCorrect] };
}
```

Built-in quiz score tracking is included because quiz-type flows are a first-class use case. The score is reactive and accessible throughout the flow. `resetQuizScore()` is called when starting a new quiz sequence.

## estimatedTotalSteps

Walks the linear `chain` links from the root spec to estimate the total number of steps. Returns `undefined` if any step uses `chain_map` (dynamic routing) since the path length depends on user selections.

## Known Gaps

- `updateCurrentState` creates a new array reference for every call, even for small state updates. In a very long quiz (50+ questions), this creates O(n) array allocations.
- The context accumulation key (`getContextKey`) falls back to `intent_step_N` if the spec has neither an `id` nor a `title`. Specs with the same intent at multiple steps would produce colliding context keys.
