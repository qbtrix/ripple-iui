# Manifest Quality Upgrade — Design

**Date:** 2026-05-09
**Status:** Approved, ready for implementation plan

## Problem

The agent (LLM consuming `static/manifest.json`) produces Ripple pockets with broken
or missing interactivity. Inspection of the manifest shows why: per-widget
examples are catalog entries, not usage entries.

- 150 widgets, each with a single `example` field that is a bare prop bag
- `EventAction` is referenced 73 times as a prop type but the manifest never
  documents what an `EventAction` actually looks like (no field shapes, no
  list of action variants)
- Only 27 widgets document their `events` at all; the other 123 advertise
  no event surface even when the underlying widget has one
- Zero examples demonstrate `set` / `api` / `flow` / `branch` / `confirm` /
  `toast` / state envelopes / `{state.x}` expression consumption

LLMs imitate examples far more than they reason from grammar. If every
example is a static prop bag, the agent learns "Ripple specs are static prop
bags" and produces static specs. The fix is to put working interaction
patterns in the manifest, in front of the model, where it is primed to copy.

## Non-Goals

- Changing the runtime / `EventDispatcher` — every action we document is
  already implemented (verified in `src/lib/core/event-dispatcher.ts`)
- Changing the existing `example` shape contract — it is consumed as a
  liftable node by the agent's prompt builder and by `manifest.test.ts`
- Documenting every widget at the same depth — pure layout/display widgets
  do not need wiring examples
- Building a runnable playground for manifest examples (out of scope)

## Approach

Two additive changes to the manifest:

### 1. New `pocket` / `pockets` sibling field on `WidgetManifestEntry`

A fully runnable mini-spec demonstrating realistic wiring for the widget.
Sibling to `example`, never replaces it.

```ts
interface WidgetManifestEntry {
  // existing fields unchanged
  type: string;
  category: string;
  description: string;
  props: Record<string, WidgetPropSpec>;
  events?: Record<string, WidgetPropSpec>;
  nodeFields?: Record<string, WidgetPropSpec>;
  example: { type: string; props?: ...; children?: ...; [extra]: unknown };

  // NEW: optional runnable mini-spec
  pocket?: { state?: Record<string, unknown>; ui: ExampleNode };

  // NEW: optional set of runnable mini-specs for widgets with distinct
  // interaction modes (e.g. form submit-with-api vs submit-with-emit).
  // At most one of `pocket` / `pockets` may be present.
  pockets?: Array<{
    name: string;
    description?: string;
    state?: Record<string, unknown>;
    ui: ExampleNode;
  }>;
}
```

Why a sibling rather than reshaping `example`:

- `example` today is consumed as a liftable node — the agent merges it into
  a parent spec's `children`. Making `example` a `{ state, ui }` wrapper
  forces every consumer to unwrap and re-merge `state`, which is a
  regression worse than the gap we are trying to close.
- Existing `manifest.test.ts:25-29` and the `if` / `each` `nodeFields`
  carve-outs depend on the node-shaped contract.
- The two fields play different roles: `example` answers "what does this
  node look like in isolation"; `pocket` answers "what does a working
  pocket that uses this widget look like."

### 2. New top-level `actions` section

The agent currently has no schema for `EventAction` — only the bare type
label. Add one entry per action variant with shape, required/optional
fields, when-to-use, and a minimal example. Source-of-truth derived from
`src/lib/schema/event-handler.ts` so it cannot drift silently.

```ts
interface WidgetManifest {
  schema: 'ripple.manifest/v1';
  version: string;
  generatedAt: string;
  spec: SpecEnvelope;
  actions: Record<EventAction, ActionSpec>;   // NEW
  widgets: WidgetManifestEntry[];
}

interface ActionSpec {
  description: string;        // when to use, one line
  shape: Record<string, string>;  // field name -> "type (required?) — note"
  example: EventHandler;      // a minimal valid handler
}
```

All 17 variants covered: `set`, `toggle`, `push`, `remove`, `open`,
`navigate`, `toast`, `emit`, `pin`, `unpin`, `api`, `flow`, `branch`,
`confirm`, `validate`, `delay`, `invoke`.

## Tier the work

Not every widget needs a `pocket`. Three tiers based on whether interaction
is the value:

- **Tier A — interactive (~30 widgets).** Get a full `pocket`.
  button, input, select, checkbox, switch, form, modal, combobox,
  multi-select, slider, rating, file-upload, data-grid, kanban, calendar,
  date-picker, time-picker, color-picker, otp-input, code-editor, rich-text,
  search, segmented, radio-group, textarea, number-input, filter-bar, tree,
  command-palette, confirm-dialog.
- **Tier B — composites with cross-widget compositions (~5 widgets).** Get a
  `pocket` with realistic 2–3-child composition.
  form, wizard-layout, master-detail, dashboard, app-shell.
- **Tier C — display / layout (~115 widgets).** No `pocket` field. Existing
  `example` stays as-is.

Patterns each `pocket` should demonstrate (chosen by widget):
- State envelope present and seeded
- `bind: 'state.x'` for two-way binding inputs
- `{state.x}` expression consumption in props
- At least one event action wired (`set` minimum, ideally with `flow` /
  `validate` / `api` / `toast` for richer widgets)
- Realistic copy and shapes — not "Foo Bar" / "value 1"

## Drift safety

Manifest content is hand-authored but the runtime contract is defined by
zod schemas. Hand-authored content rots silently against schema changes
unless tested. New tests in `src/lib/manifest/manifest.test.ts`:

1. Every `pocket.ui` (and each `pockets[].ui`) parses against the `UISpec`
   zod schema.
2. Every event handler inside any `pocket.ui` parses against the
   `EventHandler` zod schema.
3. Every `bind: 'state.X'` references a path that exists in the
   pocket's `state`.
4. Every `actions[name].example` parses against the `EventHandler` zod
   schema with a matching `action` literal.
5. At most one of `pocket` / `pockets` is set on any entry.

Without these, the manifest will lie to the agent within one release.

## Files

New:
- `src/lib/manifest/actions.ts` — the `actions` object literal
- `src/lib/manifest/types.ts` (or extension to `index.ts`) —
  `PocketSpec` / `ActionSpec` types

Modified:
- `src/lib/manifest/index.ts` — extend `WidgetManifestEntry` with
  optional `pocket` / `pockets`; extend `WidgetManifest` with `actions`;
  update `buildManifest()` to include `actions`
- `src/lib/manifest/entries/*.ts` — add `pocket` to ~30 Tier A entries
  and ~5 Tier B entries (~35 files touched)
- `src/lib/manifest/manifest.test.ts` — add the five drift tests above
- `static/manifest.json`, `dist/manifest.json` — regenerated by build

Build script (`scripts/build-manifest.ts`) needs no change — it just
serializes whatever `buildManifest()` returns.

## Size impact

Current manifest: ~9525 lines / ~280 KB.
Estimated additions:
- ~35 pockets × ~20 lines avg = ~700 lines
- `actions` section, 17 variants × ~10 lines = ~170 lines

Total: ~+850 lines (~+9%). Well within prompt budgets.

## Risks

- **Drift unnoticed without tests.** Mitigated by required zod-validation
  tests above.
- **Bad pockets ship to production.** Mitigated by validating against the
  same schemas the runtime uses, plus manual review during the implementation
  PR.
- **Multiple pockets cause confusion.** Mitigated by the
  "at most one of `pocket` / `pockets`" invariant and capping `pockets[]`
  at 2–3 entries per widget.

## Open questions

None blocking implementation. Naming of the new field (`pocket` vs
`runnable` vs `demo` vs `scenario`) can be finalized during plan-writing —
default is `pocket` because it matches the product vocabulary and is
shorter than alternatives.
