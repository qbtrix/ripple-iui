<!--
  2026-06-24-direct-manipulation-pattern.md
  Created 2026-06-24 — maps the canonical "user edits a widget → state mutates →
  persists" flow (observed end-to-end in Kanban), surveys which read-only widgets
  should become manipulable and ranks them, and documents the Table in-place cell
  edit reference implementation built on top of that pattern. Companion to the
  feat/widget-direct-manipulation branch.
-->

# Widget Direct Manipulation — pattern map, hit-list, and Table reference

**Date:** 2026-06-24
**Branch:** `feat/widget-direct-manipulation`
**Goal:** close the "generated widgets are read-only display" gap by giving widgets
real user-initiated direct manipulation that persists, generalizing the existing
Kanban drag→persist pattern.

---

## 1. The canonical flow (as observed in Kanban)

A user manipulating a widget mutates `bind`-bound state, and that mutation
surfaces to the host through `onStateChange`. The host (paw-enterprise
`ChatRippleFrame`) persists it over WebSocket. **The widget never touches the
StateManager or the host directly** — it only fires its `onchange` prop with the
*next* value. NodeRenderer is the bridge that turns that callback into a
`stateManager.set`, and Ripple is the bridge that turns the `set` into an
`onStateChange` call.

### The five hops, with exact files and functions

| # | Layer | File | What happens |
|---|-------|------|--------------|
| 1 | **Widget fires next value** | `src/lib/widgets/data/Kanban.svelte` → `onDropColumn` (lines 107–122) | On drop, builds the *full mutated card array* (`next = cards.map(...)`) and calls `onchange?.(next)`. The widget keeps zero persistence logic; it only emits the new bound value. |
| 2 | **NodeRenderer wires onchange → state.set** | `src/lib/components/NodeRenderer.svelte` → `onchange` (lines 290–294) + `widgetProps` wiring (lines 456–459) | When the node has a `bind`, NodeRenderer passes its own `onchange` as the widget's `[bindContract.event]` prop. That `onchange` does `const path = resolveBoundPath(); if (path) stateManager.set(path, eventValue);` then calls the optional user `on_change`. So the widget's `onchange(next)` becomes `stateManager.set('<bind path>', next)`. |
| 3 | **bind path resolution** | `src/lib/components/NodeRenderer.svelte` → `boundPathTemplate` (lines 255–259) + `resolveBoundPath` (lines 261–267) | `node.bind` (`"{state.board}"`) is stripped of `{}` and the `state.` prefix → `"board"`. Loop placeholders like `lines.{i}.qty` are resolved against the current loop context per invocation. |
| 4 | **StateManager mutates + notifies** | `src/lib/core/state-manager.svelte.ts` → `set` (lines 40–57) + `notify` (lines 96–104) | `set(path, value)` walks the dot path, assigns, then calls `notify(path, value)` which invokes every subscriber. State is a Svelte 5 `$state` proxy, so the bound widget re-renders with the new value too (round-trip). |
| 5 | **Ripple surfaces it to the host** | `src/lib/Ripple.svelte` → `$effect` subscribing `onStateChange` (lines 256–259) | Ripple does `stateManager.subscribe(onStateChange)`. So the host's `onStateChange(path, value, state)` fires on every mutation. paw-enterprise's `ChatRippleFrame` passes a callback here that persists over WebSocket. |

### The bound-value round-trip (read side)

NodeRenderer also reads state back into the widget so the UI reflects the
mutation: `boundValue` (lines 306–322) reads `stateManager.get(path)` and passes
it as `[bindContract.prop]` (default `value`) on the widget (line 456). After a
`set`, the `$state` proxy re-runs the derived and the widget receives the new
array — a true two-way binding.

### The bind contract

`src/lib/core/widget-bind-contract.ts` maps a widget `type` → `{ prop, event }`.
Default is `{ prop: 'value', event: 'onchange' }`. Kanban, Table, and DataGrid
all use the default contract (registered in `DEFAULT_BIND_WIDGETS`). A widget that
exposes a non-default bind surface (wizard's `currentStep`/`onstepchange`,
checkbox's `checked`) registers an override there.

### Backward-compat invariant (the load-bearing rule)

NodeRenderer only wires `onchange`→`set` **when the node has a `bind`** (line
458: `...((boundPathTemplate || onchangeUser) && { [bindContract.event]: onchange })`).
A widget rendered with **no `bind`** never gets a state-writing `onchange`, so it
stays pure display. **Any new manipulation must be gated on the same `bind`
signal** so unbound usages stay read-only and backward-compatible.

### One-line summary

```
widget.onchange(next)  →  NodeRenderer.onchange  →  stateManager.set(bindPath, next)
   →  StateManager.notify  →  Ripple.onStateChange(path, next, state)  →  host persists
```

---

## 2. Read-only widgets that should become manipulable — ranked hit-list

Surveyed `src/lib/widgets/data/` and the broader catalog. Ranked by
value (how often agent-generated pockets render the widget × how natural direct
manipulation is) against implementation cost. "Manipulable today" means the
widget already fires `onchange` with a mutated value.

| Rank | Widget | File | Manipulable today? | Proposed manipulation | Value | Effort |
|------|--------|------|--------------------|-----------------------|-------|--------|
| ✅ ref | **Table** | `data/Table.svelte` | No (display only) | **In-place cell edit** (click cell → edit → commit → `state.set` full row array) | **Highest** — tables are the most common agent-generated data surface; "edit this cell" is the #1 missing affordance | S–M (this branch) |
| 1 | **DataGrid** | `data/DataGrid.svelte` | Selection only (`onchange` = selected row id) | Per-column in-place cell edit (mirror Table, but DataGrid owns its own `<td>` so column-level `editable` flag is natural) | High — DataGrid is the "richer table"; same edit muscle memory | M (reuse Table's edit-cell logic) |
| 2 | **list / repeater (`each` + sortable list)** | `data/VirtualList.svelte`, control `each`, `data/Tree.svelte` | No | **Reorder** (drag handle → mutated array via `onchange`, exact Kanban shape) | High — reorder is the second-most-requested affordance after edit | M (Kanban drag code is directly liftable) |
| 3 | **TreeTable / Tree** | `data/TreeTable.svelte`, `data/Tree.svelte` | Tree fires selection `onchange`; no node rename/move | Inline node rename (same cell-edit primitive); optional drag-to-reparent | Medium | M |
| 4 | **Calendar** | `data/Calendar.svelte` | No | Drag event to a new day (Kanban-style move, `columnKey`→date) | Medium — niche but high-delight | M–L |
| 5 | **KvTable / DefinitionList / SettingsList** | `research/KvTable.svelte`, `display/DefinitionList.svelte`, `vertical/SettingsList.svelte` | SettingsList may already bind toggles | Inline value edit (same cell-edit primitive) | Low–Medium | S each |
| — | ComparisonTable / PricingTable | `display/ComparisonTable.svelte`, `vertical/PricingTable.svelte` | No | **Skip** — these are marketing/display artifacts, editing them is not a user job | n/a | n/a |

**Why Table is the reference:** highest frequency in agent pockets, the simplest
DOM (one `<td>` per cell), and the cleanest demonstration of the click→edit→commit
loop that DataGrid / TreeTable / KvTable all reuse afterward. Build it once, copy
the `EditableCell` muscle into the rest.

---

## 3. Table in-place cell editing — the reference implementation

Built on this branch in `src/lib/widgets/data/Table.svelte`.

### Design (bound-path driven, backward-compatible)

- **Editable only when bound.** Table gains an `editable?: boolean` prop AND an
  `onchange?: (rows) => void` prop. NodeRenderer only supplies `onchange` when the
  node has a `bind` (per §1), so in practice a Table becomes editable only when the
  spec author writes `editable: true` **and** `bind: "{state.rows}"`. An unbound
  Table (the overwhelming majority — every existing spec) renders byte-identical
  read-only output. This preserves backward compat exactly like Kanban.
- **Per-column opt-out.** A column may set `editable: false` to stay read-only even
  in an editable table (e.g. an id or computed column).
- **Commit = full mutated array.** Like Kanban, on commit Table builds the next
  full rows array (`rows.map(r => r === row ? { ...r, [key]: nextValue } : r)`) and
  calls `onchange?.(next)`. It never imports StateManager.
- **Edit on the *source* row identity, not the sorted/paged view.** The visible
  rows are sorted/filtered/paged derivations; commit maps over the original
  `tableData` by row identity so the write targets the right record.

### Interaction + a11y (per `2026-04-15-atoms-roadmap.md` conventions)

- Click an editable cell → it swaps to an `<input>` seeded with the current value,
  auto-focused and text-selected.
- **Enter commits**, **Escape cancels** (restores original, no `onchange`).
- **Blur commits** (so click-away saves).
- Editable cells get `role="button"`, `tabindex="0"`, and **Enter/Space** opens the
  editor from the keyboard. `aria-label` announces "Edit <column>".
- `data-editable` / `data-editing` attributes for styling + test assertions.
- The input carries `aria-label="Edit <column> value"`.

### Files touched

- `src/lib/widgets/data/Table.svelte` — added `editable` prop, per-column
  `editable` flag, `onchange` emit, the `EditableCell` interaction, a11y attrs.
- `src/lib/core/widget-bind-contract.ts` — `data-table` / `datatable` aliases added
  to `DEFAULT_BIND_WIDGETS` so a bound Table doesn't trip the dev warning. (`table`
  was already covered transitively via the registry; the alias rows make it
  explicit.)
- `src/lib/widgets/data/Table.edit.test.ts` — behavior tests (below).

### Tests (`Table.edit.test.ts`)

Failing-first, then green. Two layers, matching the repo's existing split:

1. **Widget-level** (props + `onchange` spy): click cell → input appears; Enter
   commits the full mutated array via `onchange`; Escape cancels (no `onchange`);
   an unbound / non-editable Table renders no inputs and no `data-editing`.
2. **Integration through `Ripple`** (`bind` + `onStateChange` spy): a bound editable
   Table commits the edit to state and fires `onStateChange` with the mutated rows
   array — proving the full §1 chain end-to-end.

---

## 4. Next widgets (recommended order after Table)

1. **DataGrid in-place edit** — copy Table's `EditableCell` into DataGrid's `<td>`;
   add `editable` prop + per-column flag. ~M, mostly mechanical.
2. **List / repeater reorder** — lift Kanban's `ondragstart`/`ondrop` into
   VirtualList (and a generic sortable wrapper for `each`); emit the reordered
   array via `onchange`. ~M.
3. **Tree / TreeTable inline rename** — reuse the cell-edit primitive for node
   labels. ~M.

Effort is in agent-hours: each is one focused implementer pass plus a test file,
because the persistence plumbing (§1) is already proven and shared.
