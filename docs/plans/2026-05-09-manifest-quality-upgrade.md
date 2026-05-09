# Manifest Quality Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the agent stop generating broken-interaction Ripple pockets by giving the manifest two things it currently lacks: full runnable interaction examples per interactive widget (`pocket` field), and an action-grammar reference (`actions` section). Both are additive — the existing `example` contract is preserved.

**Architecture:** Two additive changes to the build-time manifest at `src/lib/manifest/`. (1) Add a sibling `pocket` (or `pockets[]` for widgets with multiple modes) field to `WidgetManifestEntry`, populated only on Tier A interactive widgets and Tier B composites. Each pocket is a complete `{ state?, ui }` mini-spec demonstrating realistic wiring (set / api / flow / branch / toast / validate / bind / `{state.x}` consumption). (2) Add a top-level `actions` section to `WidgetManifest` documenting all 17 EventAction variants with shape and a minimal example. Drift safety enforced by zod-validating every pocket and every action example against the same `UISpec` / `EventHandler` schemas the runtime uses.

**Tech Stack:** TypeScript, Zod (already used by `src/lib/schema/`), Vitest (already used by `src/lib/manifest/manifest.test.ts`), Bun.

**Reference docs:**
- Design doc: `docs/plans/2026-05-09-manifest-quality-upgrade-design.md`
- Action schemas: `src/lib/schema/event-handler.ts`
- Spec schema: `src/lib/schema/ui-spec.ts`
- Existing manifest types: `src/lib/manifest/index.ts`
- Existing tests: `src/lib/manifest/manifest.test.ts`
- Expression grammar: `docs/expression-grammar.md`
- Event handling: `docs/event-handling.md`
- Flow actions: `docs/flow-actions.md`

**Conventions to follow:**
- Bun, not npm. Run tests with `bun run test` or `bunx vitest run <path>`.
- Type-check with `bun run check`.
- Manifest builds via `bun run build` (which runs `scripts/build-manifest.ts` after `svelte-package`).
- Entry files use single-line prop definitions with no blank lines inside the entry object — match the existing style in `src/lib/manifest/entries/*.ts`.
- `bind` syntax in entries today is inconsistent (some use `'{state.x}'`, others use `'draft'` with no braces). **Use `'state.x'` (raw path, no braces)** for new pockets — it matches the canonical envelope example at `src/lib/manifest/index.ts:253` and the `bind` schema accepts a state path. Note this in pocket descriptions where useful.

---

## Phase 1 — Type changes & wiring (foundation, no content yet)

### Task 1.1: Add the `PocketSpec` and `ActionSpec` types

**Files:**
- Modify: `src/lib/manifest/index.ts`

**Step 1: Open the file, find the existing `WidgetManifestEntry` interface (around line 166).**

**Step 2: Add the new types and extend the interfaces.** Add the following near `WidgetManifestEntry`:

```typescript
/**
 * A runnable mini-spec demonstrating realistic interaction wiring for a
 * widget. Sibling to `example` — never a replacement for it. `example`
 * is a liftable node; `pocket` is a complete pocket.
 */
export interface PocketSpec {
  /** Optional state seed. Required if `ui` uses `bind` or reads `{state.*}`. */
  state?: Record<string, unknown>;
  /** The runnable widget tree. Top-level node should match (or contain) the entry's widget type. */
  ui: WidgetManifestEntry['example'];
}

/**
 * A named pocket variant for widgets with distinct interaction modes
 * (e.g. form submit-with-api vs submit-with-emit). Use `pocket` for the
 * single-variant case; reach for `pockets` only when one example genuinely
 * cannot represent the widget's range.
 */
export interface NamedPocketSpec extends PocketSpec {
  name: string;
  description?: string;
}

/**
 * Documents a single EventAction variant — what fields it takes, when to
 * use it, and a minimal valid example. Mirrors `EventHandler` zod schemas
 * in `src/lib/schema/event-handler.ts`. The drift test ensures every
 * `example` here parses against the live schema.
 */
export interface ActionSpec {
  /** One-line guidance — what this action does and when to use it. */
  description: string;
  /** Field name -> "type — note". Mark required fields with no `?`. */
  shape: Record<string, string>;
  /** A minimal valid handler — must parse against EventHandler. */
  example: Record<string, unknown>;
}
```

**Step 3: Extend `WidgetManifestEntry` and `WidgetManifest`.** Add the optional `pocket` / `pockets` fields to `WidgetManifestEntry`, and the `actions` field to `WidgetManifest`:

```typescript
export interface WidgetManifestEntry {
  // ... existing fields unchanged ...
  example: { type: string; props?: Record<string, unknown>; children?: unknown; [extraNodeField: string]: unknown };

  /**
   * A complete, runnable mini-spec showing realistic interaction wiring.
   * Present on Tier A (interactive) and Tier B (composite) widgets only.
   * At most one of `pocket` / `pockets` may be set.
   */
  pocket?: PocketSpec;

  /**
   * Multiple named pockets — only when one example genuinely cannot show
   * the widget's interaction range. Cap at 3 entries.
   */
  pockets?: NamedPocketSpec[];
}

export interface WidgetManifest {
  schema: 'ripple.manifest/v1';
  version: string;
  generatedAt: string;
  spec: SpecEnvelope;
  /** Grammar reference for every EventAction variant the dispatcher accepts. */
  actions: Record<string, ActionSpec>;
  widgets: WidgetManifestEntry[];
}
```

**Step 4: Update `buildManifest()` to include `actions: {}` (empty for now — populated in Phase 2):**

```typescript
import { manifestActions } from './actions.js';

export function buildManifest(): WidgetManifest {
  if (manifestEntries.length === 0) {
    throw new Error('No manifest entries registered');
  }
  return {
    schema: 'ripple.manifest/v1',
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    spec: specEnvelope,
    actions: manifestActions,
    widgets: manifestEntries,
  };
}
```

**Step 5: Create `src/lib/manifest/actions.ts` as a stub:**

```typescript
import type { ActionSpec } from './index.js';

/**
 * Grammar reference for every `EventAction` variant the dispatcher accepts.
 * Source-of-truth: `src/lib/schema/event-handler.ts`. Drift-tested in
 * `manifest.test.ts` — every `example` here must parse against the
 * live `EventHandler` zod schema.
 */
export const manifestActions: Record<string, ActionSpec> = {};
```

**Step 6: Run type-check.**

Run: `bun run check`
Expected: PASS (the new fields are all optional or empty; nothing should break).

**Step 7: Commit.**

```bash
git add src/lib/manifest/index.ts src/lib/manifest/actions.ts
git commit -m "feat(manifest): add pocket and actions type scaffolding"
```

---

### Task 1.2: Verify the existing test suite still passes

**Step 1: Run the manifest tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts`
Expected: All 7 existing tests pass.

**Step 2: If anything fails, stop and investigate.** The Phase 1 changes are purely additive; failures here mean a regression worth tracking down before continuing.

**Step 3: Run the full check.**

Run: `bun run check`
Expected: PASS.

No commit — this is a verification-only step.

---

## Phase 2 — Actions grammar section

### Task 2.1: Write the drift test for the actions section first (TDD)

**Files:**
- Modify: `src/lib/manifest/manifest.test.ts`

**Step 1: Add a new `describe` block to the test file, after the existing widget-manifest block.**

```typescript
import { EventHandler, EventAction } from '../schema/event-handler.js';
import { manifestActions } from './actions.js';

describe('manifest actions section', () => {
  const ALL_VARIANTS = EventAction.options;

  it('documents every EventAction variant the dispatcher supports', () => {
    const documented = new Set(Object.keys(manifestActions));
    const missing = ALL_VARIANTS.filter((v) => !documented.has(v));
    expect(missing).toEqual([]);
  });

  it('does not document any unknown action variants', () => {
    const known = new Set(ALL_VARIANTS);
    const ghosts = Object.keys(manifestActions).filter((k) => !known.has(k as never));
    expect(ghosts).toEqual([]);
  });

  it('every action.example parses against the live EventHandler schema', () => {
    for (const [name, spec] of Object.entries(manifestActions)) {
      const result = EventHandler.safeParse(spec.example);
      expect(
        result.success,
        `actions.${name}.example failed: ${result.success ? '' : JSON.stringify(result.error.issues)}`,
      ).toBe(true);
    }
  });

  it("every action.example's `action` field matches its key", () => {
    for (const [name, spec] of Object.entries(manifestActions)) {
      expect((spec.example as { action: string }).action).toBe(name);
    }
  });

  it('every action has a non-empty description and shape', () => {
    for (const [name, spec] of Object.entries(manifestActions)) {
      expect(spec.description.length, `actions.${name}.description is empty`).toBeGreaterThan(0);
      expect(Object.keys(spec.shape).length, `actions.${name}.shape is empty`).toBeGreaterThan(0);
    }
  });
});
```

**Step 2: Run the new tests — they should fail because `manifestActions` is empty.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts`
Expected: 1 FAIL on "documents every EventAction variant" (missing all 17 variants). Other new tests pass vacuously since `manifestActions` is `{}`.

This is the failing-test gate before populating content.

**Step 3: Commit the failing test.**

```bash
git add src/lib/manifest/manifest.test.ts
git commit -m "test(manifest): drift tests for actions grammar (currently failing)"
```

---

### Task 2.2: Populate the four state-mutation actions (set, toggle, push, remove)

**Files:**
- Modify: `src/lib/manifest/actions.ts`

**Step 1: Replace the empty `manifestActions` with the four state-mutation entries.** Refer to `src/lib/schema/event-handler.ts:62-97` for the exact field shapes.

```typescript
import type { ActionSpec } from './index.js';

export const manifestActions: Record<string, ActionSpec> = {
  set: {
    description: "Assign `value` to the state path `target`. The most common action — use it to update any state field.",
    shape: {
      action: '"set"',
      target: 'string — state path, e.g. "modalOpen" or "user.name"',
      'value?': 'any — value to assign. Supports {state.x} expressions.',
    },
    example: { action: 'set', target: 'modalOpen', value: false },
  },

  toggle: {
    description: "Flip a boolean target, or toggle membership of `value` in an array target.",
    shape: {
      action: '"toggle"',
      target: 'string — state path. If boolean, value is inverted; if array, `value` is added or removed.',
      'value?': 'any — when target is an array, the membership toggle key.',
    },
    example: { action: 'toggle', target: 'expanded' },
  },

  push: {
    description: "Append `value` to the array at `target`. Creates the array if undefined.",
    shape: {
      action: '"push"',
      target: 'string — state path to an array.',
      'value?': 'any — item to append.',
    },
    example: { action: 'push', target: 'todos', value: { id: 1, text: 'New task', done: false } },
  },

  remove: {
    description: "Remove an item from the array at `target` — by `value` (equality match) or by `index`.",
    shape: {
      action: '"remove"',
      target: 'string — state path to an array.',
      'value?': 'any — first matching item is removed.',
      'index?': 'number — remove by position instead.',
    },
    example: { action: 'remove', target: 'todos', index: 0 },
  },
};
```

**Step 2: Run the actions tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest actions section"`
Expected: Still failing on "documents every EventAction variant" because 13 are missing. Other action tests should pass for the 4 we just added.

**Step 3: Commit.**

```bash
git add src/lib/manifest/actions.ts
git commit -m "feat(manifest): document state-mutation actions (set, toggle, push, remove)"
```

---

### Task 2.3: Populate the host-delegated actions (open, navigate, toast, emit, pin, unpin)

**Files:**
- Modify: `src/lib/manifest/actions.ts`

**Step 1: Append the six host-delegated entries to `manifestActions`.** Refer to `src/lib/schema/event-handler.ts:100-136`.

```typescript
  open: {
    description: "Set the target state path to `true`. Idiomatic shortcut for opening a modal or dialog whose `value` is bound to that path.",
    shape: {
      action: '"open"',
      target: 'string — state path that controls the modal/dialog open state.',
    },
    example: { action: 'open', target: 'confirmDeleteOpen' },
  },

  navigate: {
    description: "Host-delegated URL change. The host's `onEvent` callback performs the navigation.",
    shape: {
      action: '"navigate"',
      url: 'string — destination URL. Supports {state.x} interpolation.',
    },
    example: { action: 'navigate', url: '/projects/{state.selectedId}' },
  },

  toast: {
    description: "Show a toast notification. Use after `set` / `api` to give the user feedback.",
    shape: {
      action: '"toast"',
      message: 'string — toast body. Supports {state.x} interpolation.',
      'variant?': '"default" | "success" | "error" | "warning" | "info"',
    },
    example: { action: 'toast', message: 'Saved', variant: 'success' },
  },

  emit: {
    description: "Emit a custom event up to the host. Use to hand control back to the host pipeline (e.g. \"submit complete, take it from here\").",
    shape: {
      action: '"emit"',
      'target?': 'string — event name.',
      'value?': 'any — event payload.',
    },
    example: { action: 'emit', target: 'submitted', value: '{state.formData}' },
  },

  pin: {
    description: "Host-delegated bookmark/pin operation. The host implements the persistence.",
    shape: {
      action: '"pin"',
      'target?': 'string — what is being pinned.',
      'value?': 'any — payload describing the pinned item.',
    },
    example: { action: 'pin', target: 'project', value: '{state.projectId}' },
  },

  unpin: {
    description: "Inverse of `pin`. Host-delegated bookmark removal.",
    shape: {
      action: '"unpin"',
      'target?': 'string — what is being unpinned.',
      'value?': 'any',
    },
    example: { action: 'unpin', target: 'project', value: '{state.projectId}' },
  },
```

**Step 2: Run the action tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest actions section"`
Expected: Still failing on "documents every EventAction variant" because 7 control-flow + api are missing. Other tests pass.

**Step 3: Commit.**

```bash
git add src/lib/manifest/actions.ts
git commit -m "feat(manifest): document host-delegated actions (open, navigate, toast, emit, pin, unpin)"
```

---

### Task 2.4: Populate the api action

**Files:**
- Modify: `src/lib/manifest/actions.ts`

**Step 1: Append the api entry.** Refer to `src/lib/schema/event-handler.ts:147-158`.

```typescript
  api: {
    description: "Host-delegated HTTP call. The host performs the request; the response is written to `response_key` (if given) and `on_success` runs. On failure `on_error` runs and the error is exposed at state path `_flow_error`.",
    shape: {
      action: '"api"',
      url: 'string — endpoint. Supports {state.x} interpolation.',
      'method?': '"GET" | "POST" | "PUT" | "DELETE" | "PATCH" — default GET',
      'body?': 'object — request body. Values support {state.x} expressions.',
      'headers?': 'Record<string, string>',
      'response_key?': 'string — state path to write the response into.',
      'on_success?': 'EventHandler[] — runs after a successful response.',
      'on_error?': 'EventHandler[] — runs on host-reported failure.',
    },
    example: {
      action: 'api',
      method: 'POST',
      url: '/api/todos',
      body: { text: '{state.draft}' },
      response_key: 'newTodo',
      on_success: [
        { action: 'push', target: 'todos', value: '{state.newTodo}' },
        { action: 'set', target: 'draft', value: '' },
        { action: 'toast', message: 'Added', variant: 'success' },
      ],
      on_error: [
        { action: 'toast', message: 'Could not save', variant: 'error' },
      ],
    },
  },
```

**Step 2: Run tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest actions section"`
Expected: Action-specific tests pass for `api`. Variant-coverage test still failing.

**Step 3: Commit.**

```bash
git add src/lib/manifest/actions.ts
git commit -m "feat(manifest): document api action with on_success/on_error chaining"
```

---

### Task 2.5: Populate the flow-control actions (flow, branch, confirm, validate, delay, invoke)

**Files:**
- Modify: `src/lib/manifest/actions.ts`

**Step 1: Append the six flow-control entries.** Refer to `src/lib/schema/event-handler.ts:161-212` and `docs/flow-actions.md`.

```typescript
  flow: {
    description: "Run a list of handlers sequentially. If any step throws `FlowAbortError` (e.g. failed `validate`), `on_error` runs.",
    shape: {
      action: '"flow"',
      steps: 'EventHandler[] — sequential handlers.',
      'on_error?': 'EventHandler[] — runs on FlowAbortError.',
    },
    example: {
      action: 'flow',
      steps: [
        { action: 'set', target: 'saving', value: true },
        { action: 'delay', ms: 400 },
        { action: 'set', target: 'saving', value: false },
        { action: 'toast', message: 'Done', variant: 'success' },
      ],
    },
  },

  branch: {
    description: "Evaluate `if` and run `then` or `else`. The condition is a Ripple expression string (e.g. \"state.count > 5\").",
    shape: {
      action: '"branch"',
      if: 'string — Ripple expression evaluated as boolean.',
      then: 'EventHandler[] — runs when truthy.',
      'else?': 'EventHandler[] — runs when falsy.',
    },
    example: {
      action: 'branch',
      if: 'state.user.role == "admin"',
      then: [{ action: 'navigate', url: '/admin' }],
      else: [{ action: 'toast', message: 'Admins only', variant: 'warning' }],
    },
  },

  confirm: {
    description: "Show the ConfirmDialog, suspend the flow, and run `on_confirm` or `on_cancel` based on the user's choice.",
    shape: {
      action: '"confirm"',
      message: 'string — body shown in the dialog.',
      'title?': 'string',
      'confirm_label?': 'string — default "Confirm".',
      'cancel_label?': 'string — default "Cancel".',
      on_confirm: 'EventHandler[]',
      'on_cancel?': 'EventHandler[]',
    },
    example: {
      action: 'confirm',
      title: 'Delete project?',
      message: 'This cannot be undone.',
      confirm_label: 'Delete',
      on_confirm: [
        { action: 'api', method: 'DELETE', url: '/api/projects/{state.projectId}' },
        { action: 'navigate', url: '/projects' },
      ],
    },
  },

  validate: {
    description: "If `condition` is falsy, show a toast and abort the enclosing flow (FlowAbortError). Silent on pass.",
    shape: {
      action: '"validate"',
      condition: 'string — Ripple expression. Falsy aborts the flow.',
      message: 'string — toast shown on failure.',
      'variant?': '"default" | "success" | "error" | "warning" | "info"',
    },
    example: {
      action: 'validate',
      condition: 'state.email != ""',
      message: 'Email required',
      variant: 'error',
    },
  },

  delay: {
    description: "Pause the flow for the given number of milliseconds. Useful for optimistic-UI demos and animations.",
    shape: {
      action: '"delay"',
      ms: 'number — non-negative.',
    },
    example: { action: 'delay', ms: 300 },
  },

  invoke: {
    description: "Call a registered widget method by widget id. Used for imperative actions on widgets that expose them (e.g. focusing an input).",
    shape: {
      action: '"invoke"',
      target: 'string — widget id.',
      method: 'string — registered method name.',
      'args?': 'any[]',
    },
    example: { action: 'invoke', target: 'searchInput', method: 'focus' },
  },
```

**Step 2: Run all action tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest actions section"`
Expected: ALL action tests pass — every variant documented, every example parses, every shape non-empty.

**Step 3: Run full test suite.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts`
Expected: All tests pass (existing 7 + 5 new).

**Step 4: Commit.**

```bash
git add src/lib/manifest/actions.ts
git commit -m "feat(manifest): document flow-control actions (flow, branch, confirm, validate, delay, invoke)"
```

---

## Phase 3 — Pocket drift safety (TDD)

### Task 3.1: Write the pocket drift test before adding any pockets

**Files:**
- Modify: `src/lib/manifest/manifest.test.ts`

**Step 1: Add a new describe block.**

```typescript
import { UISpec, UINode } from '../schema/ui-spec.js';

describe('manifest pockets', () => {
  function entriesWithPockets() {
    return manifestEntries.flatMap((e) => {
      if (e.pocket && e.pockets) {
        // covered by a separate test, but skip here so we don't double-fail.
        return [];
      }
      if (e.pocket) return [{ entry: e, pocket: { name: 'default', ...e.pocket } }];
      if (e.pockets) return e.pockets.map((p) => ({ entry: e, pocket: p }));
      return [];
    });
  }

  it('no entry sets both `pocket` and `pockets`', () => {
    const offenders = manifestEntries.filter((e) => e.pocket && e.pockets).map((e) => e.type);
    expect(offenders).toEqual([]);
  });

  it('every pocket.ui parses against the UISpec ui-tree schema', () => {
    for (const { entry, pocket } of entriesWithPockets()) {
      const result = UINode.safeParse(pocket.ui);
      expect(
        result.success,
        `${entry.type}.${pocket.name}.ui failed: ${result.success ? '' : JSON.stringify(result.error.issues, null, 2)}`,
      ).toBe(true);
    }
  });

  it('every pocket as a complete spec parses against UISpec (including state)', () => {
    for (const { entry, pocket } of entriesWithPockets()) {
      const result = UISpec.safeParse({
        version: '1.0',
        state: pocket.state ?? {},
        ui: pocket.ui,
      });
      expect(
        result.success,
        `${entry.type}.${pocket.name} spec failed: ${result.success ? '' : JSON.stringify(result.error.issues, null, 2)}`,
      ).toBe(true);
    }
  });

  it('every event handler inside any pocket parses against EventHandler', () => {
    const EVENT_KEYS = ['on_click', 'on_change', 'on_input', 'on_submit', 'on_focus', 'on_blur'] as const;

    function walk(node: unknown, path: string, fail: (msg: string) => void) {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      for (const k of EVENT_KEYS) {
        if (n[k] === undefined) continue;
        const handlers = Array.isArray(n[k]) ? (n[k] as unknown[]) : [n[k]];
        for (const [i, h] of handlers.entries()) {
          const r = EventHandler.safeParse(h);
          if (!r.success) fail(`${path}.${k}[${i}] invalid: ${JSON.stringify(r.error.issues)}`);
        }
      }
      const children = n.children;
      if (Array.isArray(children)) {
        for (const [i, c] of children.entries()) walk(c, `${path}.children[${i}]`, fail);
      }
      const elseChildren = n.else_children;
      if (Array.isArray(elseChildren)) {
        for (const [i, c] of elseChildren.entries()) walk(c, `${path}.else_children[${i}]`, fail);
      }
    }

    const failures: string[] = [];
    for (const { entry, pocket } of entriesWithPockets()) {
      walk(pocket.ui, `${entry.type}.${pocket.name}`, (msg) => failures.push(msg));
    }
    expect(failures).toEqual([]);
  });

  it('every `bind` path resolves against the pocket\'s state', () => {
    function collectBinds(node: unknown, out: string[]) {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      if (typeof n.bind === 'string') out.push(n.bind);
      const children = n.children;
      if (Array.isArray(children)) for (const c of children) collectBinds(c, out);
      const elseChildren = n.else_children;
      if (Array.isArray(elseChildren)) for (const c of elseChildren) collectBinds(c, out);
    }

    const failures: string[] = [];
    for (const { entry, pocket } of entriesWithPockets()) {
      const binds: string[] = [];
      collectBinds(pocket.ui, binds);
      const state = (pocket.state ?? {}) as Record<string, unknown>;
      for (const raw of binds) {
        // Accept both 'state.x' and '{state.x}' forms; strip braces and the leading 'state.'.
        const stripped = raw.replace(/^\{(.*)\}$/, '$1');
        const path = stripped.startsWith('state.') ? stripped.slice('state.'.length) : stripped;
        const head = path.split('.')[0]?.split('[')[0];
        if (!head) continue;
        if (!(head in state)) {
          failures.push(`${entry.type}.${pocket.name}: bind "${raw}" references state.${head} which is missing from pocket.state`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
```

**Step 2: Run the new test block.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest pockets"`
Expected: All tests pass — no entries have pockets yet, so all loops are empty. (This is intentional. The tests guard pockets as we add them.)

**Step 3: Commit.**

```bash
git add src/lib/manifest/manifest.test.ts
git commit -m "test(manifest): drift tests for pocket field (zod + bind resolution)"
```

---

## Phase 4 — Tier A pockets (interactive widgets)

> **Strategy:** Add pockets in small batches (3–6 widgets per commit). After each batch, run the drift tests; if any pocket fails the tests, fix it before moving on. **Never** disable a drift test to make a pocket pass — the test is the contract.

### Task 4.1: Add pocket to `button`

**Files:**
- Modify: `src/lib/manifest/entries/button.ts`

**Step 1: Replace the file with the upgraded version that adds a `pocket`. Keep `example` exactly as-is.**

```typescript
import type { WidgetManifestEntry } from '../index.js';

export const buttonEntry: WidgetManifestEntry = {
  type: 'button',
  category: 'input',
  description: 'Button with variant, size, and loading states. Wire to actions via on_click.',
  props: {
    label: { type: 'string', required: false, description: 'Button text.' },
    variant: { type: '"default" | "secondary" | "outline" | "ghost" | "link" | "destructive"', required: false, description: 'Style variant.' },
    size: { type: '"sm" | "md" | "lg" | "icon"', required: false, description: 'Button size.' },
    disabled: { type: 'boolean', required: false, description: 'Disable interaction.' },
    loading: { type: 'boolean', required: false, description: 'Show spinner and disable.' },
    type: { type: '"button" | "submit" | "reset"', required: false, description: 'HTML button type.' },
  },
  events: {
    on_click: { type: 'EventAction', required: false, description: 'Action fired on click.' },
  },
  example: { type: 'button', props: { label: 'Save changes', variant: 'default', size: 'md', type: 'submit' } },
  pocket: {
    state: { saving: false, savedCount: 0 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px', align: 'start' },
      children: [
        {
          type: 'button',
          props: { label: '{state.saving ? "Saving…" : "Save changes"}', loading: '{state.saving}' },
          on_click: {
            action: 'flow',
            steps: [
              { action: 'set', target: 'saving', value: true },
              { action: 'delay', ms: 600 },
              { action: 'set', target: 'saving', value: false },
              { action: 'set', target: 'savedCount', value: '{state.savedCount + 1}' },
              { action: 'toast', message: 'Saved', variant: 'success' },
            ],
          },
        },
        { type: 'text', props: { text: 'Saved {state.savedCount} times' } },
      ],
    },
  },
};
```

**Step 2: Run pocket drift tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest pockets"`
Expected: All tests pass.

**Step 3: Commit.**

```bash
git add src/lib/manifest/entries/button.ts
git commit -m "feat(manifest): add interactive pocket for button"
```

---

### Task 4.2: Add pockets for the simple-bind input widgets (input, textarea, switch, checkbox, slider, number-input)

**Files:**
- Modify: `src/lib/manifest/entries/input.ts`, `textarea.ts`, `switch.ts`, `checkbox.ts`, `slider.ts`, `number-input.ts`

**Strategy:** Each of these widgets centers on `bind` + `on_change`. Pockets demonstrate the bound state being read elsewhere in the tree (so the agent sees the round-trip).

**Step 1: For `input`, append the `pocket` field after `example`.**

```typescript
  pocket: {
    state: { email: '', sent: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'input', props: { label: 'Email', type: 'email', placeholder: 'you@example.com' }, bind: 'state.email' },
        { type: 'text', props: { text: 'Will send to: {state.email || "(nothing yet)"}' } },
        {
          type: 'button',
          props: { label: 'Send', disabled: '{state.email == ""}' },
          on_click: [
            { action: 'set', target: 'sent', value: true },
            { action: 'toast', message: 'Sent to {state.email}', variant: 'success' },
          ],
        },
      ],
    },
  },
```

**Step 2: For `textarea`, append:**

```typescript
  pocket: {
    state: { feedback: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'textarea', props: { label: 'Feedback', placeholder: 'Tell us what you think…', rows: 4 }, bind: 'state.feedback' },
        { type: 'text', props: { text: '{state.feedback.length} / 500 characters' } },
      ],
    },
  },
```

**Step 3: For `switch`, append:**

```typescript
  pocket: {
    state: { notificationsEnabled: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'switch', props: { label: 'Enable notifications' }, bind: 'state.notificationsEnabled' },
        {
          type: 'alert',
          show: '{state.notificationsEnabled}',
          props: { variant: 'info', title: 'Notifications on', description: 'You will receive desktop alerts.' },
        },
      ],
    },
  },
```

**Step 4: For `checkbox`, append:**

```typescript
  pocket: {
    state: { agreed: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'checkbox', props: { label: 'I agree to the terms' }, bind: 'state.agreed' },
        {
          type: 'button',
          props: { label: 'Continue', disabled: '{!state.agreed}' },
          on_click: { action: 'toast', message: 'Continuing…', variant: 'info' },
        },
      ],
    },
  },
```

**Step 5: For `slider`, append:**

```typescript
  pocket: {
    state: { volume: 50 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'slider', props: { label: 'Volume', min: 0, max: 100, step: 1 }, bind: 'state.volume' },
        { type: 'text', props: { text: 'Volume: {state.volume}%' } },
      ],
    },
  },
```

**Step 6: For `number-input`, append:**

```typescript
  pocket: {
    state: { quantity: 1 },
    ui: {
      type: 'flex',
      props: { direction: 'row', gap: '12px', align: 'center' },
      children: [
        { type: 'number-input', props: { label: 'Quantity', min: 1, max: 99 }, bind: 'state.quantity' },
        { type: 'text', props: { text: 'Subtotal: ${state.quantity * 12}' } },
      ],
    },
  },
```

**Step 7: Run drift tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest pockets"`
Expected: All tests pass.

**Step 8: Commit.**

```bash
git add src/lib/manifest/entries/input.ts src/lib/manifest/entries/textarea.ts src/lib/manifest/entries/switch.ts src/lib/manifest/entries/checkbox.ts src/lib/manifest/entries/slider.ts src/lib/manifest/entries/number-input.ts
git commit -m "feat(manifest): add interactive pockets for basic input widgets"
```

---

### Task 4.3: Add pockets for selection widgets (select, combobox, multi-select, radio-group, segmented)

**Files:**
- Modify: `src/lib/manifest/entries/select.ts`, `combobox.ts`, `multi-select.ts`, `radio-group.ts`, `segmented.ts`

**Step 1: For `select`, append a pocket that sets a value and shows downstream consumption.**

```typescript
  pocket: {
    state: { plan: 'pro' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'select',
          props: {
            label: 'Plan',
            options: [
              { value: 'free', label: 'Free' },
              { value: 'pro', label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' },
            ],
          },
          bind: 'state.plan',
        },
        { type: 'badge', props: { text: 'Current: {state.plan}', variant: 'secondary' } },
      ],
    },
  },
```

**Step 2: For `combobox`, append:**

```typescript
  pocket: {
    state: { assigneeId: null },
    ui: {
      type: 'combobox',
      props: {
        label: 'Assignee',
        options: [
          { value: 1, label: 'Alice', description: 'Admin' },
          { value: 2, label: 'Bob', description: 'Editor' },
          { value: 3, label: 'Carol', description: 'Viewer' },
        ],
        searchPlaceholder: 'Search users…',
      },
      bind: 'state.assigneeId',
      on_change: { action: 'toast', message: 'Assigned', variant: 'success' },
    },
  },
```

**Step 3: For `multi-select`, append:**

```typescript
  pocket: {
    state: { tags: ['urgent'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'multi-select',
          props: {
            label: 'Tags',
            options: [
              { value: 'urgent', label: 'Urgent' },
              { value: 'bug', label: 'Bug' },
              { value: 'feature', label: 'Feature' },
              { value: 'docs', label: 'Docs' },
            ],
          },
          bind: 'state.tags',
        },
        { type: 'text', props: { text: 'Selected: {state.tags.length} tag(s)' } },
      ],
    },
  },
```

**Step 4: For `radio-group`, append:**

```typescript
  pocket: {
    state: { delivery: 'standard' },
    ui: {
      type: 'radio-group',
      props: {
        label: 'Delivery',
        options: [
          { value: 'standard', label: 'Standard (3-5 days)' },
          { value: 'express', label: 'Express (1-2 days)' },
          { value: 'pickup', label: 'Pickup (today)' },
        ],
      },
      bind: 'state.delivery',
    },
  },
```

**Step 5: For `segmented`, append:**

```typescript
  pocket: {
    state: { view: 'list' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'segmented',
          props: {
            options: [
              { value: 'list', label: 'List' },
              { value: 'grid', label: 'Grid' },
              { value: 'map', label: 'Map' },
            ],
          },
          bind: 'state.view',
        },
        { type: 'text', props: { text: 'Showing as: {state.view}' } },
      ],
    },
  },
```

**Step 6: Run drift tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest pockets"`
Expected: All tests pass.

**Step 7: Commit.**

```bash
git add src/lib/manifest/entries/select.ts src/lib/manifest/entries/combobox.ts src/lib/manifest/entries/multi-select.ts src/lib/manifest/entries/radio-group.ts src/lib/manifest/entries/segmented.ts
git commit -m "feat(manifest): add interactive pockets for selection widgets"
```

---

### Task 4.4: Add pockets for date/time/color/code/rich-text widgets (calendar, date-picker, time-picker, color-picker, code-editor, rich-text, otp-input, rating, file-upload)

**Files:**
- Modify: `src/lib/manifest/entries/calendar.ts`, `date-picker.ts`, `time-picker.ts`, `color-picker.ts`, `code-editor.ts`, `rich-text.ts`, `otp-input.ts`, `rating.ts`, `file-upload.ts`

**Strategy:** Each pocket binds to state, optionally consumes the bound value in a sibling widget. For widgets where the existing `example` already shows reasonable wiring (e.g. they already have bind), the pocket emphasizes the **state envelope + downstream consumption**.

**Step 1: Read each entry first to confirm current shape, then append a `pocket` per the patterns below.**

Use the patterns from Tasks 4.1–4.3 as templates. For each:
- Bind to a state path with a sensible seed.
- Show the bound value being read in a sibling text/badge/alert.
- Where the widget has a meaningful action (e.g. `rating`'s on_change), wire it with `set` + `toast`.

Example for `rating`:

```typescript
  pocket: {
    state: { score: 0, submitted: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'rating', props: { label: 'How was it?', max: 5 }, bind: 'state.score' },
        { type: 'text', props: { text: 'You rated: {state.score}/5' } },
        {
          type: 'button',
          props: { label: 'Submit rating', disabled: '{state.score == 0}' },
          on_click: [
            { action: 'set', target: 'submitted', value: true },
            { action: 'toast', message: 'Thanks for the {state.score}-star rating!', variant: 'success' },
          ],
        },
      ],
    },
  },
```

Write similar pockets for the other 8. Keep each ~15-25 lines.

**Step 2: Run drift tests after each entry, or after the full batch.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest pockets"`
Expected: All tests pass.

**Step 3: Commit.**

```bash
git add src/lib/manifest/entries/calendar.ts src/lib/manifest/entries/date-picker.ts src/lib/manifest/entries/time-picker.ts src/lib/manifest/entries/color-picker.ts src/lib/manifest/entries/code-editor.ts src/lib/manifest/entries/rich-text.ts src/lib/manifest/entries/otp-input.ts src/lib/manifest/entries/rating.ts src/lib/manifest/entries/file-upload.ts
git commit -m "feat(manifest): add interactive pockets for date/time/code/media inputs"
```

---

### Task 4.5: Add pockets for data widgets (data-grid, kanban, tree, search, filter-bar, command-palette, confirm-dialog)

**Files:**
- Modify: `src/lib/manifest/entries/data-grid.ts`, `kanban.ts`, `tree.ts`, `search.ts`, `filter-bar.ts`, `command-palette.ts`, `confirm-dialog.ts`

**Strategy:** These are higher-leverage; pockets should demonstrate selection patterns, search filtering, and confirm-flow integration with `confirm` action.

**Step 1: For `data-grid`, demonstrate selection + bulk action with a state-driven action bar.**

```typescript
  pocket: {
    state: { selected: [], rows: [
      { id: 1, name: 'Alice', email: 'alice@example.com', revenue: '$8,400' },
      { id: 2, name: 'Bob', email: 'bob@example.com', revenue: '$5,200' },
      { id: 3, name: 'Carol', email: 'carol@example.com', revenue: '$12,800' },
    ] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'data-grid',
          props: {
            columns: [
              { key: 'name', label: 'Customer', sortable: true },
              { key: 'email', label: 'Email' },
              { key: 'revenue', label: 'Revenue', align: 'right', sortable: true },
            ],
            rows: '{state.rows}',
            selectable: true,
            searchable: true,
          },
          bind: 'state.selected',
        },
        {
          type: 'flex',
          show: '{state.selected.length > 0}',
          props: { gap: '8px', align: 'center' },
          children: [
            { type: 'text', props: { text: '{state.selected.length} selected' } },
            {
              type: 'button',
              props: { label: 'Email selected', variant: 'secondary', size: 'sm' },
              on_click: { action: 'toast', message: 'Sent to {state.selected.length} customers', variant: 'success' },
            },
          ],
        },
      ],
    },
  },
```

**Step 2: For `confirm-dialog`, show the `confirm` action wiring.**

```typescript
  pocket: {
    state: { projects: [
      { id: 1, name: 'Atlas migration' },
      { id: 2, name: 'Onboarding redesign' },
    ] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'confirm-dialog' },
        {
          type: 'each',
          items: 'state.projects',
          item_as: 'project',
          children: [
            {
              type: 'flex',
              props: { gap: '12px', align: 'center', justify: 'between' },
              children: [
                { type: 'text', props: { text: '{project.name}' } },
                {
                  type: 'button',
                  props: { label: 'Delete', variant: 'destructive', size: 'sm' },
                  on_click: {
                    action: 'confirm',
                    title: 'Delete {project.name}?',
                    message: 'This cannot be undone.',
                    confirm_label: 'Delete',
                    on_confirm: [
                      { action: 'remove', target: 'projects', value: '{project}' },
                      { action: 'toast', message: 'Deleted', variant: 'success' },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
```

**Step 3: For `search`, `filter-bar`, `kanban`, `tree`, `command-palette`, write similar pockets demonstrating their primary interaction (search-filtered list, multi-filter facets, drag-reorder kanban with `set`, expanded tree state, command-palette opening via keybinding state).** Use the schema docs in `src/lib/widgets/` to confirm prop names if uncertain.

**Step 4: Run drift tests after each entry to fail fast.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest pockets"`
Expected: All tests pass.

**Step 5: Commit.**

```bash
git add src/lib/manifest/entries/data-grid.ts src/lib/manifest/entries/kanban.ts src/lib/manifest/entries/tree.ts src/lib/manifest/entries/search.ts src/lib/manifest/entries/filter-bar.ts src/lib/manifest/entries/command-palette.ts src/lib/manifest/entries/confirm-dialog.ts
git commit -m "feat(manifest): add interactive pockets for data + selection widgets"
```

---

## Phase 5 — Tier B composites

### Task 5.1: Upgrade `form` with a multi-pocket entry (submit-with-api and submit-with-validate)

**Files:**
- Modify: `src/lib/manifest/entries/form.ts`

**Step 1: Replace the file with two named pockets — one demonstrating client-side validation + emit, one demonstrating validate + api + toast.** Keep `example` as-is.

```typescript
  pockets: [
    {
      name: 'validate-and-emit',
      description: 'Client-side validation, then hand off to the host via emit.',
      state: { email: '', password: '', errors: {} },
      ui: {
        type: 'form',
        props: {
          fields: {
            email: { required: 'Email is required', minLength: 5 },
            password: { required: 'Password is required', minLength: 8 },
          },
          validateOn: 'submit',
        },
        on_submit: { action: 'emit', target: 'login', value: { email: '{state.email}', password: '{state.password}' } },
        children: [
          { type: 'input', props: { label: 'Email', type: 'email' }, bind: 'state.email' },
          { type: 'input', props: { label: 'Password', type: 'password' }, bind: 'state.password' },
          { type: 'button', props: { label: 'Sign in', type: 'submit' } },
        ],
      },
    },
    {
      name: 'validate-and-api',
      description: 'Validate, call API, toast on success or failure.',
      state: { name: '', email: '', submitting: false, errors: {} },
      ui: {
        type: 'form',
        props: {
          fields: {
            name: { required: 'Name is required' },
            email: { required: 'Email is required', minLength: 5 },
          },
          validateOn: 'submit',
        },
        on_submit: {
          action: 'flow',
          steps: [
            { action: 'set', target: 'submitting', value: true },
            {
              action: 'api',
              method: 'POST',
              url: '/api/contacts',
              body: { name: '{state.name}', email: '{state.email}' },
              on_success: [
                { action: 'set', target: 'submitting', value: false },
                { action: 'set', target: 'name', value: '' },
                { action: 'set', target: 'email', value: '' },
                { action: 'toast', message: 'Contact saved', variant: 'success' },
              ],
              on_error: [
                { action: 'set', target: 'submitting', value: false },
                { action: 'toast', message: 'Could not save', variant: 'error' },
              ],
            },
          ],
        },
        children: [
          { type: 'input', props: { label: 'Name' }, bind: 'state.name' },
          { type: 'input', props: { label: 'Email', type: 'email' }, bind: 'state.email' },
          { type: 'button', props: { label: '{state.submitting ? "Saving…" : "Save"}', loading: '{state.submitting}', type: 'submit' } },
        ],
      },
    },
  ],
```

**Step 2: Run all pocket tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest pockets"`
Expected: All tests pass — including the "no entry sets both pocket and pockets" test (form should only have `pockets`, not `pocket`).

**Step 3: Commit.**

```bash
git add src/lib/manifest/entries/form.ts
git commit -m "feat(manifest): add validate-and-emit / validate-and-api pockets to form"
```

---

### Task 5.2: Add pockets to `modal` (open + confirm) and `master-detail` (selection-driven detail panel)

**Files:**
- Modify: `src/lib/manifest/entries/modal.ts`, `master-detail.ts`

**Step 1: For `modal`, append a pocket showing open via `open` action + dismissal:**

```typescript
  pocket: {
    state: { settingsOpen: false, theme: 'light' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'button',
          props: { label: 'Open settings' },
          on_click: { action: 'open', target: 'settingsOpen' },
        },
        {
          type: 'modal',
          props: { title: 'Settings', description: 'Personalize your experience.', size: 'sm' },
          bind: 'state.settingsOpen',
          children: [
            {
              type: 'radio-group',
              props: {
                label: 'Theme',
                options: [
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ],
              },
              bind: 'state.theme',
            },
            {
              type: 'button',
              props: { label: 'Done' },
              on_click: { action: 'set', target: 'settingsOpen', value: false },
            },
          ],
        },
      ],
    },
  },
```

**Step 2: For `master-detail`, append a pocket where a list selection drives a detail panel.**

```typescript
  pocket: {
    state: {
      selectedId: 1,
      tickets: [
        { id: 1, title: 'Login fails on Safari', priority: 'high', body: 'Users on Safari 17 hit a redirect loop after OAuth.' },
        { id: 2, title: 'Export is slow', priority: 'medium', body: 'CSV export of >10k rows takes >30s.' },
        { id: 3, title: 'Typo in onboarding', priority: 'low', body: '"Welome" should be "Welcome" on the second step.' },
      ],
    },
    ui: {
      type: 'master-detail',
      props: { masterWidth: '320px' },
      children: [
        {
          slot: 'master',
          type: 'each',
          items: 'state.tickets',
          item_as: 'ticket',
          children: [
            {
              type: 'card',
              props: { hoverable: true, selected: '{ticket.id == state.selectedId}' },
              on_click: { action: 'set', target: 'selectedId', value: '{ticket.id}' },
              children: [
                { type: 'text', props: { text: '{ticket.title}', weight: 'medium' } },
                { type: 'badge', props: { text: '{ticket.priority}', variant: 'secondary' } },
              ],
            },
          ],
        },
        {
          slot: 'detail',
          type: 'flex',
          props: { direction: 'column', gap: '12px' },
          children: [
            { type: 'heading', props: { level: 3, text: '{state.tickets.where("id", state.selectedId).first().title}' } },
            { type: 'text', props: { text: '{state.tickets.where("id", state.selectedId).first().body}' } },
          ],
        },
      ],
    },
  },
```

> Note: the `where(...).first()` chain must be supported by the resolver. Confirm by checking `docs/expression-grammar.md` (whitelisted method calls section). If `.first()` isn't whitelisted, switch to `[0]` indexing per the expressions doc bracket-index syntax. Run drift tests to catch this.

**Step 3: Run drift tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest pockets"`
Expected: All tests pass.

**Step 4: Commit.**

```bash
git add src/lib/manifest/entries/modal.ts src/lib/manifest/entries/master-detail.ts
git commit -m "feat(manifest): add pockets for modal (open) and master-detail (selection)"
```

---

### Task 5.3: Add pockets to `wizard-layout`, `dashboard`, `app-shell`

**Files:**
- Modify: `src/lib/manifest/entries/wizard-layout.ts`, `dashboard.ts`, `app-shell.ts`

**Step 1: Read each entry to confirm current shape (slot names, prop conventions).**

**Step 2: Write a pocket for each.**

- `wizard-layout` → multi-step flow with `branch` action gating the next step on a validation condition.
- `dashboard` → state-driven date-range picker that filters charts/metrics via `{state.range}` reads.
- `app-shell` → sidebar selection drives main content via `set` + bound state.

Keep each pocket 25-40 lines. Use the patterns established in 5.1 / 5.2.

**Step 3: Run drift tests.**

Run: `bunx vitest run src/lib/manifest/manifest.test.ts -t "manifest pockets"`
Expected: All tests pass.

**Step 4: Commit.**

```bash
git add src/lib/manifest/entries/wizard-layout.ts src/lib/manifest/entries/dashboard.ts src/lib/manifest/entries/app-shell.ts
git commit -m "feat(manifest): add pockets for wizard, dashboard, app-shell composites"
```

---

## Phase 6 — Verification & artifact regeneration

### Task 6.1: Regenerate the static manifest and inspect the diff

**Step 1: Run the build.**

Run: `bun run build`
Expected: Output line `✓ wrote .../static/manifest.json (150 widgets, vX.Y.Z)` and same for `dist/`.

**Step 2: Inspect size and shape.**

Run: `node -e "const m = require('./static/manifest.json'); console.log('widgets:', m.widgets.length, 'actions:', Object.keys(m.actions).length, 'pockets:', m.widgets.filter(w => w.pocket || w.pockets).length);"`
Expected: `widgets: 150 actions: 17 pockets: <Tier A count + Tier B count, ≈ 38–45>`.

**Step 3: Spot-check a single pocket renders correctly via the playground.**

Run: `bun run dev` (in background)
Then in the browser, paste one of the pockets (e.g. button's pocket) into the playground spec input. Verify:
- The widget renders
- The interaction works (click the button → "Saving…" → toast → counter increments)

If anything fails to render, **do not** weaken the drift test. Fix the pocket so it both passes drift tests and renders correctly.

**Step 4: No commit yet.** This is verification.

---

### Task 6.2: Run the full test suite and type-check

**Step 1: Run all tests.**

Run: `bun run test`
Expected: ALL tests pass — both manifest tests and any other test files.

**Step 2: Type-check.**

Run: `bun run check`
Expected: PASS, no errors.

**Step 3: If any check fails, fix before continuing.**

---

### Task 6.3: Commit the regenerated manifest artifact

**Step 1: Stage and commit the regenerated artifact.**

Run:
```bash
git status                          # confirm static/manifest.json is the only artifact change
git add static/manifest.json
git commit -m "chore(manifest): regenerate static/manifest.json with pockets + actions"
```

Note: `dist/manifest.json` is generated at publish time — do not commit it.

---

### Task 6.4: Branch freshness check before pushing

> See `~/.claude/projects/D--paw-ripple/memory/feedback_branch_freshness.md` — fetch + ancestry-check before push, in case main has moved or the branch is already merged.

**Step 1: Fetch.**

Run: `git fetch origin`

**Step 2: Confirm the current branch is not already merged.**

Run: `git branch --merged origin/main | grep "$(git rev-parse --abbrev-ref HEAD)"`
Expected: empty (branch not yet merged).

**Step 3: Confirm we're up-to-date with main.**

Run: `git log --oneline ..origin/main`
Expected: empty (or any commits behind are reviewed and intentional).

**Step 4: If main has moved with conflicts likely**, rebase or merge as appropriate — do not force-push without user approval.

---

## Phase 7 — PR

### Task 7.1: Open the PR

**Step 1: Push the branch.**

Run: `git push -u origin feat/ripple-full-recovery`

**Step 2: Open the PR via gh.**

Run:
```bash
gh pr create --title "feat(manifest): pocket field + actions grammar for higher-quality agent output" --body "$(cat <<'EOF'
## Summary
- Add a sibling `pocket` (and optional `pockets[]`) field to every Tier A interactive widget and Tier B composite, populated with a runnable mini-spec demonstrating realistic interaction wiring (set / api / flow / branch / toast / validate / bind / `{state.x}` consumption).
- Add a top-level `actions` section to the manifest documenting all 17 EventAction variants with shape, when-to-use, and a minimal example.
- Add zod-based drift tests that validate every pocket's UI and every action example against the live `UISpec` / `EventHandler` schemas.

## Why
The agent was producing pockets with broken or missing interactivity because the manifest's per-widget examples were catalog-shaped (prop bag only) and `EventAction` was referenced 73 times with no field-level grammar. LLMs imitate examples; the new pockets give the agent working interaction patterns to copy.

## Test plan
- [ ] `bun run test` (all manifest tests pass — original 7 + new pocket + actions drift tests)
- [ ] `bun run check` (type-check passes)
- [ ] `bun run build` regenerates `static/manifest.json` cleanly
- [ ] Manual: paste 3-4 pockets into the dev playground and confirm they render + interact as specified

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Verify PR opened cleanly and link returned.**

---

## Out-of-scope follow-ups (do not do in this PR)

- Tier B remaining composites (`order-status`, `invoice-layout`, `report-layout`, `analytics-dashboard`, etc.) → next PR.
- Per-prop event handler description cross-references to the new `actions` section (e.g. "see actions.set for shape") → next PR.
- A `recipes[]` top-level section → only if pocket-driven examples don't move agent output quality enough; revisit after measuring impact.
- Unifying `bind` syntax across the manifest (some entries use `'{state.x}'`, others use `'state.x'`) → tracked separately; the new pockets should standardize on `'state.x'` form.
