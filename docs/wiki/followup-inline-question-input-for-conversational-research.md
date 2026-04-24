---
{
  "title": "FollowUp: Inline Question Input for Conversational Research",
  "summary": "FollowUp renders a pill-shaped text input with a send button that emits follow-up queries back into the Ripple event system — bridging widget-level user input with the runtime's event dispatcher. It implements empty-string guarding, Enter-key submission, and graceful degradation when the event system context is absent.",
  "concepts": [
    "follow-up input",
    "event dispatcher",
    "context injection",
    "StateManager",
    "EventDispatcher",
    "empty string guard",
    "Enter key handler",
    "Shift+Enter",
    "getContext",
    "Svelte 5 runes",
    "conversational UI"
  ],
  "categories": [
    "widget",
    "research",
    "interactive",
    "event-system"
  ],
  "source_docs": [
    "57c521cbe4cc6d5a"
  ],
  "backlinks": null,
  "word_count": 527,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`FollowUp` is the conversational re-entry point embedded within research responses. After an AI generates a research widget, the FollowUp component lets users ask a clarifying or deepening question without leaving the current response context. It exists to make AI research responses feel like a conversation rather than a terminal output.

## Props

```svelte
interface Props {
  placeholder?: string;    // default: 'Ask follow-up'
  submitLabel?: string;    // sr-only button label, default: 'Send'
  event?: string;          // event name to dispatch, default: 'follow-up'
  class?: string;
  onsubmit?: (e?: unknown) => void;
}
```

## Context-Based Event Dispatch

The component pulls both `EventDispatcher` and `StateManager` from Svelte context:

```svelte
const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
const stateManager = getContext<StateManager | undefined>('ui-state');
```

Both are typed as `| undefined`. This is a defensive pattern — if `FollowUp` is rendered outside of a Ripple runtime context (e.g. in a Storybook story, a test harness, or embedded in a third-party shell), these contexts won't be present and `getContext` returns `undefined`. Without the undefined typing, calling `eventDispatcher.dispatch(...)` would throw at runtime.

The submit handler handles both paths:

```svelte
function handleSubmit() {
  const text = value.trim();
  if (!text) return;              // Guard against empty submit
  if (onsubmit) {
    onsubmit(text);               // Direct callback path
  } else {
    eventDispatcher?.dispatch(    // Runtime event path
      { action: 'emit', target: event, value: text },
      { state: stateManager?.state ?? {} },
      undefined
    );
  }
  value = '';                     // Clear input after submit
}
```

The `onsubmit` callback takes priority over the event dispatcher — this allows widgets embedding `FollowUp` to handle the query locally (e.g. filtering a visible list) rather than escalating to the full runtime.

## Empty-String Guard

`if (!text) return` prevents dispatching an empty event when the user presses Enter on a blank input or clicks the send button with whitespace. The button is also `disabled={!value.trim()}` for visual feedback, but the guard exists in the logic layer as a belt-and-suspenders defense — the `disabled` attribute can be bypassed programmatically.

## Enter Key Behavior

```svelte
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
}
```

`!e.shiftKey` is intentional — `Shift+Enter` is the universal convention for newlines in chat inputs. Honoring it here, even though the input is a single-line `<input>` (not a textarea), future-proofs against a potential upgrade to multi-line input.

`e.preventDefault()` stops the form's default submit behavior if `FollowUp` is ever nested inside a `<form>` element.

## Visual Design

The pill container uses `border-radius: 12px` with `focus-within` border color change — the border highlights when the inner input receives focus, giving the whole pill an active appearance:

```css
.rfollow:focus-within {
  border-color: hsl(var(--primary) / 0.5);
}
```

The send button uses an upward-arrow SVG icon. The button's disabled state reduces opacity to 35%, making the inactive state obvious without hiding the button.

## Known Gaps

- The state passed to `eventDispatcher.dispatch` as `{ state: stateManager?.state ?? {} }` includes the full state manager state snapshot. For large state objects, this could inadvertently include sensitive session data in event payloads. Scoping to a relevant state slice would be safer.
- No character limit or visual counter — very long follow-up queries will be submitted without truncation warnings.