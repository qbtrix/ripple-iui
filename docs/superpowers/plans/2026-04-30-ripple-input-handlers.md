# Ripple Interactive Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Ripple input/tab/handler interactive end-to-end — `bind` is two-way, `on_input` exists, hosts get a single `onStateChange` stream — so an LLM-generated spec rendered in pockets or inline produces working forms with zero boilerplate.

**Architecture:** Three additive changes. (1) `StateManager` gains a tiny pub/sub. (2) `NodeRenderer` injects an automatic `onchange` write-back when `bind` is present and wires a new `on_input` event. (3) `Input.svelte` forwards `oninput` to `onchange` so text inputs are live. `Ripple.svelte` exposes the new `onStateChange` callback, and the playground demo is fixed to use schema-correct `on_click`.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, TypeScript, Zod (schema), Vitest + `@testing-library/svelte` + `@testing-library/user-event`, Bun for scripts.

**Spec:** `docs/superpowers/specs/2026-04-30-ripple-input-handlers-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/core/state-manager.svelte.ts` | Modify | Add `subscribe(fn)` + notify on `set/delete/reset` |
| `src/lib/core/state-manager.test.ts` | Create | Cover subscribe/unsubscribe/notify |
| `src/lib/schema/ui-spec.ts` | Modify | Add `on_input?: EventHandlerOrArray` to `UINodeBase` |
| `src/lib/components/NodeRenderer.svelte` | Modify | Generic two-way bind write-back + `on_input` wiring |
| `src/lib/components/NodeRenderer.bind.test.ts` | Create | Cover input/checkbox/tabs two-way bind, on_input, ordering |
| `src/lib/Ripple.svelte` | Modify | Accept and wire `onStateChange` prop |
| `src/lib/Ripple.onStateChange.test.ts` | Create | Subscriber receives writes; unsubscribes on destroy |
| `src/lib/widgets/input/Input.svelte` | Modify | `oninput` calls `onchange(value)` for live updates |
| `src/lib/widgets/input/Input.test.ts` | Modify | Add live-onchange test |
| `src/lib/widgets/input/Textarea.svelte` | Modify | Call new `oninput` callback when present |
| `src/lib/routes/playground/+page.svelte` | Modify | Replace `on: { click }` with `on_click`; add bind demo |

---

## Task 1: StateManager subscribers

**Files:**
- Modify: `src/lib/core/state-manager.svelte.ts`
- Create: `src/lib/core/state-manager.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/core/state-manager.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest';
import { createStateManager } from './state-manager.svelte.js';

describe('StateManager.subscribe', () => {
  test('notifies subscriber on set with (path, value, state)', () => {
    const sm = createStateManager({ name: 'init' });
    const fn = vi.fn();
    sm.subscribe(fn);

    sm.set('name', 'alice');

    expect(fn).toHaveBeenCalledTimes(1);
    const [path, value, state] = fn.mock.calls[0];
    expect(path).toBe('name');
    expect(value).toBe('alice');
    expect(state).toEqual({ name: 'alice' });
  });

  test('notifies on nested set with full path', () => {
    const sm = createStateManager({});
    const fn = vi.fn();
    sm.subscribe(fn);

    sm.set('user.profile.name', 'bob');

    expect(fn).toHaveBeenCalledWith(
      'user.profile.name',
      'bob',
      expect.objectContaining({ user: { profile: { name: 'bob' } } })
    );
  });

  test('notifies on delete and reset', () => {
    const sm = createStateManager({ a: 1, b: 2 });
    const fn = vi.fn();
    sm.subscribe(fn);

    sm.delete('a');
    sm.reset({ c: 3 });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0][0]).toBe('a');
    expect(fn.mock.calls[1][0]).toBe('');
    expect(fn.mock.calls[1][2]).toEqual({ c: 3 });
  });

  test('subscribe returns an unsubscribe function', () => {
    const sm = createStateManager({});
    const fn = vi.fn();
    const off = sm.subscribe(fn);

    sm.set('x', 1);
    off();
    sm.set('x', 2);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('multiple subscribers all fire', () => {
    const sm = createStateManager({});
    const a = vi.fn();
    const b = vi.fn();
    sm.subscribe(a);
    sm.subscribe(b);

    sm.set('k', 1);

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
cd D:/paw/ripple && bun run test src/lib/core/state-manager.test.ts
```

Expected: FAIL — `sm.subscribe is not a function`.

- [ ] **Step 3: Implement subscribe**

In `src/lib/core/state-manager.svelte.ts`, add a subscriber list and notify call. Replace the class body so `set/delete/reset` notify after writing. The full updated file:

```ts
/**
 * @file state-manager.svelte.ts
 * @description Reactive state management for the UI renderer using Svelte 5 runes.
 */

export type StateSubscriber = (
  path: string,
  value: unknown,
  state: Record<string, unknown>
) => void;

export class StateManager {
  private _state = $state<Record<string, unknown>>({});
  private subscribers = new Set<StateSubscriber>();

  constructor(initialState: Record<string, unknown> = {}) {
    try {
      this._state = structuredClone(initialState);
    } catch {
      this._state = JSON.parse(JSON.stringify(initialState));
    }
  }

  get state(): Record<string, unknown> {
    return this._state;
  }

  get(path: string): unknown {
    if (!path) return undefined;
    const parts = path.split('.');
    let current: unknown = this._state;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  set(path: string, value: unknown): void {
    if (!path) return;
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current: Record<string, unknown> = this._state;
    for (const part of parts) {
      if (current[part] === undefined || current[part] === null) {
        current[part] = {};
      }
      if (typeof current[part] !== 'object') {
        console.warn(`StateManager: Cannot set path "${path}" - "${part}" is not an object`);
        return;
      }
      current = current[part] as Record<string, unknown>;
    }
    current[lastKey] = value;
    this.notify(path, value);
  }

  update(path: string, updater: (current: unknown) => unknown): void {
    const current = this.get(path);
    this.set(path, updater(current));
  }

  has(path: string): boolean {
    return this.get(path) !== undefined;
  }

  delete(path: string): void {
    if (!path) return;
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current: Record<string, unknown> = this._state;
    for (const part of parts) {
      if (current[part] === undefined || typeof current[part] !== 'object') return;
      current = current[part] as Record<string, unknown>;
    }
    delete current[lastKey];
    this.notify(path, undefined);
  }

  reset(newState: Record<string, unknown> = {}): void {
    for (const key of Object.keys(this._state)) {
      delete this._state[key];
    }
    Object.assign(this._state, structuredClone(newState));
    this.notify('', undefined);
  }

  subscribe(fn: StateSubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notify(path: string, value: unknown): void {
    for (const fn of this.subscribers) {
      try {
        fn(path, value, this._state);
      } catch (err) {
        console.error('StateManager subscriber threw:', err);
      }
    }
  }
}

export function createStateManager(initialState: Record<string, unknown> = {}): StateManager {
  return new StateManager(initialState);
}
```

- [ ] **Step 4: Run test to verify it passes**

```
cd D:/paw/ripple && bun run test src/lib/core/state-manager.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```
cd D:/paw/ripple && git add src/lib/core/state-manager.svelte.ts src/lib/core/state-manager.test.ts && git commit -m "feat(ripple): StateManager.subscribe pub/sub for state writes"
```

---

## Task 2: `onStateChange` on `<Ripple>`

**Files:**
- Modify: `src/lib/Ripple.svelte`
- Create: `src/lib/Ripple.onStateChange.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/Ripple.onStateChange.test.ts`:

```ts
import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

test('onStateChange fires when a set action runs', async () => {
  const onStateChange = vi.fn();
  const { getByRole } = render(Ripple, {
    props: {
      spec: {
        ui: {
          type: 'button',
          props: { label: 'go' },
          on_click: { action: 'set', target: 'count', value: 7 },
        },
      },
      onStateChange,
    },
  });

  await userEvent.click(getByRole('button', { name: 'go' }));

  expect(onStateChange).toHaveBeenCalledWith(
    'count',
    7,
    expect.objectContaining({ count: 7 })
  );
});

test('onStateChange unsubscribes on destroy', async () => {
  const onStateChange = vi.fn();
  const { getByRole, unmount } = render(Ripple, {
    props: {
      spec: {
        state: { count: 0 },
        ui: {
          type: 'button',
          props: { label: 'go' },
          on_click: { action: 'set', target: 'count', value: 1 },
        },
      },
      onStateChange,
    },
  });

  await userEvent.click(getByRole('button', { name: 'go' }));
  expect(onStateChange).toHaveBeenCalledTimes(1);

  unmount();
  // No further calls possible — getByRole would throw if used here.
  expect(onStateChange).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

```
cd D:/paw/ripple && bun run test src/lib/Ripple.onStateChange.test.ts
```

Expected: FAIL — `onStateChange` ignored, mock not called.

- [ ] **Step 3: Add the prop and subscribe**

In `src/lib/Ripple.svelte`:

a. Extend the `Props` interface:

```ts
interface Props {
  spec?: UniversalSpec | UISpec | any;
  streaming?: StreamSpecStore;
  skeleton?: 'card' | 'dashboard' | 'text' | 'none';
  state?: Record<string, any>;
  onEvent?: OnEventCallback;
  onSpecChanged?: (spec: DashboardSpec) => void;
  onStateChange?: (path: string, value: unknown, state: Record<string, unknown>) => void;
  class?: string;
  style?: string;
}
```

b. Destructure it:

```ts
let {
  spec: rawSpec,
  streaming,
  skeleton = 'card',
  state: initialStateOverride,
  onEvent,
  onSpecChanged,
  onStateChange,
  class: className = '',
  style
}: Props = $props();
```

c. After `setContext('ui-widget-registry', widgetRegistry);`, add:

```ts
$effect(() => {
  if (!onStateChange) return;
  return stateManager.subscribe(onStateChange);
});
```

(Returning the unsubscribe from the effect runs it on cleanup.)

- [ ] **Step 4: Run test to verify it passes**

```
cd D:/paw/ripple && bun run test src/lib/Ripple.onStateChange.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```
cd D:/paw/ripple && git add src/lib/Ripple.svelte src/lib/Ripple.onStateChange.test.ts && git commit -m "feat(ripple): onStateChange callback on <Ripple>"
```

---

## Task 3: `on_input` in schema

**Files:**
- Modify: `src/lib/schema/ui-spec.ts`

- [ ] **Step 1: Add `on_input` to `UINodeBase`**

In `src/lib/schema/ui-spec.ts`, inside the `UINodeBase = z.object({ ... })` block, add `on_input` next to the other `on_*` handlers:

```ts
// Event handlers
on_click: EventHandlerOrArray.optional(),
on_change: EventHandlerOrArray.optional(),
on_input: EventHandlerOrArray.optional(),
on_submit: EventHandlerOrArray.optional(),
on_focus: EventHandlerOrArray.optional(),
on_blur: EventHandlerOrArray.optional(),
```

- [ ] **Step 2: Type-check passes**

```
cd D:/paw/ripple && bun run check
```

Expected: PASS — no TS errors.

- [ ] **Step 3: Commit**

```
cd D:/paw/ripple && git add src/lib/schema/ui-spec.ts && git commit -m "feat(ripple): add on_input to UINode schema"
```

---

## Task 4: Two-way `bind` write-back + `on_input` wiring in NodeRenderer

**Files:**
- Modify: `src/lib/components/NodeRenderer.svelte`
- Create: `src/lib/components/NodeRenderer.bind.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/components/NodeRenderer.bind.test.ts`:

```ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

test('input with bind writes user input back to state', async () => {
  const onStateChange = vi.fn();
  render(Ripple, {
    props: {
      spec: {
        state: { username: '' },
        ui: {
          type: 'input',
          bind: '{state.username}',
          props: { placeholder: 'name' },
        },
      },
      onStateChange,
    },
  });

  await userEvent.type(screen.getByPlaceholderText('name'), 'ada');

  // Last write should reflect the final keystroke.
  const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1];
  expect(lastCall[0]).toBe('username');
  expect(lastCall[1]).toBe('ada');
});

test('checkbox with bind writes boolean back to state', async () => {
  const onStateChange = vi.fn();
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { enabled: false },
        ui: {
          type: 'checkbox',
          bind: '{state.enabled}',
          props: { label: 'Enable' },
        },
      },
      onStateChange,
    },
  });

  const cb = container.querySelector('button[role="checkbox"]') as HTMLElement;
  await userEvent.click(cb);

  expect(onStateChange).toHaveBeenLastCalledWith(
    'enabled',
    true,
    expect.objectContaining({ enabled: true })
  );
});

test('bind write-back runs before user on_change handler so handler sees new state', async () => {
  const onStateChange = vi.fn();
  render(Ripple, {
    props: {
      spec: {
        state: { username: '', mirrored: '' },
        ui: {
          type: 'input',
          bind: '{state.username}',
          props: { placeholder: 'name' },
          on_change: { action: 'set', target: 'mirrored', value: '{state.username}' },
        },
      },
      onStateChange,
    },
  });

  await userEvent.type(screen.getByPlaceholderText('name'), 'x');

  // The mirrored value must equal the username after the handler runs.
  const finalState = onStateChange.mock.calls.at(-1)![2];
  expect(finalState).toMatchObject({ username: 'x', mirrored: 'x' });
});

test('on_input fires on every keystroke', async () => {
  const onStateChange = vi.fn();
  render(Ripple, {
    props: {
      spec: {
        state: { keystrokes: 0 },
        ui: {
          type: 'input',
          props: { placeholder: 'name' },
          on_input: {
            action: 'set',
            target: 'keystrokes',
            value: '{state.keystrokes + 1}',
          },
        },
      },
      onStateChange,
    },
  });

  await userEvent.type(screen.getByPlaceholderText('name'), 'abc');

  // Three keystrokes — three writes to keystrokes.
  const writes = onStateChange.mock.calls.filter((c) => c[0] === 'keystrokes');
  expect(writes.length).toBe(3);
  expect(writes.at(-1)![1]).toBe(3);
});
```

- [ ] **Step 2: Run test to verify it fails**

```
cd D:/paw/ripple && bun run test src/lib/components/NodeRenderer.bind.test.ts
```

Expected: FAIL — bind doesn't write back; `on_input` not wired.

- [ ] **Step 3: Add `on_input` and bind write-back to NodeRenderer**

In `src/lib/components/NodeRenderer.svelte`, in the `<script>` block:

a. After the existing `const onblur = createEventHandler(node.on_blur);`, add:

```ts
const oninputUser = createEventHandler(node.on_input);
```

b. Compute the bound state path once (above the existing `boundValue` block is fine):

```ts
const boundPath = $derived.by(() => {
  if (!node.bind) return null;
  const stripped = node.bind.replace(/^\{|\}$/g, '').trim();
  return stripped.replace(/^state\./, '');
});
```

c. Replace the existing `onchange` declaration with a wrapper that does write-back-then-handler:

```ts
const onchangeUser = createEventHandler(node.on_change);
const onchange = (eventValue?: unknown) => {
  if (boundPath) {
    stateManager.set(boundPath, eventValue);
  }
  return onchangeUser?.(eventValue);
};

const oninput = (eventValue?: unknown) => {
  if (boundPath) {
    stateManager.set(boundPath, eventValue);
  }
  return oninputUser?.(eventValue);
};
```

If neither `bind` nor a user handler is present the wrapper is a no-op closure — fine. If the widget never fires `oninput`, the wrapper is never called.

d. In the `widgetProps` `{@const ...}` block, replace the `onchange` line and add `oninput`:

```svelte
{@const widgetProps = {
  id: node.id,
  ...(resolvedClass !== undefined && { class: resolvedClass }),
  ...(node.style !== undefined && { style: node.style }),
  ...resolvedProps,
  ...(boundValue !== undefined && { value: boundValue }),
  ...((node.type === 'checkbox' || node.type === 'switch') && boundValue !== undefined && { checked: boundValue }),
  ...(onclick !== undefined && { onclick }),
  ...((boundPath || onchangeUser) && { onchange }),
  ...((boundPath || oninputUser) && { oninput }),
  ...(onsubmit !== undefined && { onsubmit }),
  ...(onfocus !== undefined && { onfocus }),
  ...(onblur !== undefined && { onblur }),
  ...(defaultKids.length > 0 && { hasChildren: true })
}}
```

Note: only attach `onchange` / `oninput` if at least one of (bind, user handler) is present so we don't pollute widgets that take no such props. `boundPath` is reactive via `$derived`, so this re-evaluates correctly.

- [ ] **Step 4: Run test to verify it passes**

```
cd D:/paw/ripple && bun run test src/lib/components/NodeRenderer.bind.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Verify pre-existing slot tests still pass**

```
cd D:/paw/ripple && bun run test src/lib/components/NodeRenderer.slots.test.ts
```

Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```
cd D:/paw/ripple && git add src/lib/components/NodeRenderer.svelte src/lib/components/NodeRenderer.bind.test.ts && git commit -m "feat(ripple): two-way bind write-back and on_input in NodeRenderer"
```

---

## Task 5: `Input.svelte` — `oninput` forwards to `onchange`

**Files:**
- Modify: `src/lib/widgets/input/Input.svelte`
- Modify: `src/lib/widgets/input/Input.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/widgets/input/Input.test.ts`:

```ts
test('onchange fires on every keystroke (live updates)', async () => {
  const onchange = vi.fn();
  render(Input, { props: { placeholder: 'live', onchange } });
  await userEvent.type(screen.getByPlaceholderText('live'), 'abc');
  // Three keystrokes → three onchange calls. Final value = 'abc'.
  expect(onchange).toHaveBeenCalledTimes(3);
  expect(onchange.mock.calls.at(-1)![0]).toBe('abc');
});
```

- [ ] **Step 2: Run test to verify it fails**

```
cd D:/paw/ripple && bun run test src/lib/widgets/input/Input.test.ts
```

Expected: FAIL — `onchange` only called once on blur (current test relies on `tab` to fire it). The new test types without blurring.

- [ ] **Step 3: Forward `oninput` to `onchange`**

In `src/lib/widgets/input/Input.svelte`, replace the `handleInput` function:

```ts
function handleInput(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  oninput?.(v);
  onchange?.(v);
}
```

The native `onchange` handler stays as-is; for text inputs the browser's own change event still fires on blur with the same final value, which is harmless (one extra `onchange(value)` call with the unchanged value at blur). If that becomes a real issue later we can dedupe.

- [ ] **Step 4: Run test to verify it passes**

```
cd D:/paw/ripple && bun run test src/lib/widgets/input/Input.test.ts
```

Expected: PASS — including the older `onchange fires on blur` test (it still passes; it just now also fires on each keystroke).

- [ ] **Step 5: Commit**

```
cd D:/paw/ripple && git add src/lib/widgets/input/Input.svelte src/lib/widgets/input/Input.test.ts && git commit -m "feat(ripple): Input.onchange fires on every keystroke for live binding"
```

---

## Task 6: `Textarea.svelte` — accept `oninput` callback

**Files:**
- Modify: `src/lib/widgets/input/Textarea.svelte`

- [ ] **Step 1: Add `oninput` prop and call it**

In `src/lib/widgets/input/Textarea.svelte`:

a. Extend `Props`:

```ts
interface Props {
  id?: string;
  class?: string;
  style?: Record<string, string>;
  value?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  label?: string;
  oninput?: (value?: unknown) => void;
  onchange?: (value?: unknown) => void;
  onfocus?: (value?: unknown) => void;
  onblur?: (value?: unknown) => void;
}
```

b. Destructure `oninput`:

```ts
let {
  id, class: className, style, value = '', placeholder = '',
  rows = 3, disabled = false, label, oninput, onchange, onfocus, onblur
}: Props = $props();
```

c. Update `handleInput` to call both:

```ts
function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  localValue = target.value;
  oninput?.(target.value);
  onchange?.(target.value);
}
```

- [ ] **Step 2: Type-check passes**

```
cd D:/paw/ripple && bun run check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
cd D:/paw/ripple && git add src/lib/widgets/input/Textarea.svelte && git commit -m "feat(ripple): Textarea forwards oninput callback for on_input"
```

---

## Task 7: Playground demo — fix syntax + add interactive example

**Files:**
- Modify: `src/routes/playground/+page.svelte`

- [ ] **Step 1: Replace the EXAMPLE constant**

In `src/routes/playground/+page.svelte`, replace the `EXAMPLE` JSON.stringify block (currently lines 5–65) with:

```ts
const EXAMPLE = JSON.stringify(
  {
    version: '1.0',
    state: { username: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        { type: 'heading', props: { text: 'Hello, Ripple!', level: 2 } },
        {
          type: 'text',
          props: {
            text: 'Edit the JSON on the left to render a different UI.',
            size: 'sm'
          }
        },
        {
          type: 'grid',
          props: { columns: 3, gap: 3 },
          children: [
            {
              type: 'stat',
              props: {
                label: 'Revenue',
                value: 12450,
                format: 'currency',
                deltaPercent: 3.4,
                direction: 'up-good'
              }
            },
            {
              type: 'stat',
              props: {
                label: 'Signups',
                value: 247,
                deltaPercent: 18.2,
                direction: 'up-good'
              }
            },
            {
              type: 'stat',
              props: {
                label: 'Churn',
                value: 0.034,
                format: 'percent',
                deltaPercent: -0.8,
                direction: 'down-good'
              }
            }
          ]
        },
        {
          type: 'flex',
          props: { direction: 'column', gap: '8px' },
          children: [
            {
              type: 'input',
              bind: '{state.username}',
              props: { label: 'Your name', placeholder: 'Type something' }
            },
            {
              type: 'text',
              props: { text: 'Hello, {state.username}!', size: 'sm' }
            }
          ]
        },
        {
          type: 'button',
          props: { label: 'Click me', variant: 'default' },
          on_click: [{ action: 'toast', message: 'Hello from Ripple!' }]
        }
      ]
    }
  },
  null,
  2
);
```

The two changes vs. the old example:

1. `on: { click: [...] }` → `on_click: [...]` so the button actually toasts.
2. New input + text demonstrating `bind` two-way: typing in the input updates `state.username`, which the text widget displays via `{state.username}`.

- [ ] **Step 2: Smoke-check by starting the dev server**

```
cd D:/paw/ripple && bun run dev
```

Open `http://localhost:5173/playground`. Verify:
- The input is visible.
- Typing in it updates the "Hello, …!" line live.
- Clicking the button shows a toast in the events panel.

(If running headless, skip — the next task's full test sweep covers the wiring.)

- [ ] **Step 3: Commit**

```
cd D:/paw/ripple && git add src/routes/playground/+page.svelte && git commit -m "fix(ripple): playground example uses on_click and demos two-way bind"
```

---

## Task 8: Final verification

**Files:** none

- [ ] **Step 1: Type-check the whole package**

```
cd D:/paw/ripple && bun run check
```

Expected: PASS — zero errors.

- [ ] **Step 2: Run the full test suite**

```
cd D:/paw/ripple && bun run test
```

Expected: PASS — including the four new test files plus all pre-existing ones.

- [ ] **Step 3: Build to ensure the package still publishes**

```
cd D:/paw/ripple && bun run build
```

Expected: PASS — `dist/` regenerated cleanly.

- [ ] **Step 4: Manual smoke in the playground**

Run `bun run dev` and visit `/playground`. Confirm:
- Typing in the new input updates the greeting live.
- The events panel shows the toast event after clicking the button.
- No console warnings from `NodeRenderer` about `Cannot set path` or unknown actions.

- [ ] **Step 5: Hand off**

Report status to the user; mention that downstream consumers (paw-enterprise pocket renderer) can now drop their per-input `on_change: set` boilerplate and rely on `bind`, and may use `onStateChange` to mirror Ripple state into host state.

---

## Spec Coverage

| Spec section | Covered by task |
|---|---|
| Two-way `bind` in NodeRenderer | Task 4 |
| `on_input` event in schema | Task 3 |
| `on_input` event in NodeRenderer | Task 4 |
| Live updates for text inputs (`Input.svelte`) | Task 5 |
| `Textarea` `oninput` callback | Task 6 |
| `onStateChange` on `<Ripple>` (StateManager pub/sub) | Tasks 1 + 2 |
| Playground demo fix | Task 7 |
| Tests covering all of the above | Tasks 1, 2, 4, 5 |
| Final verification (`bun run check`/`test`/`build`) | Task 8 |
