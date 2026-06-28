<!--
  sp0-spike-report.md
  @description SP-0 spike findings for the Ripple visual editor: per-node DOM-id
    stamping, empirical addressability coverage, one-op reactive round-trip, and
    an entanglement assessment of the svelte-visual-builder overlay/core. Ends
    with a GO / GO-WITH-FALLBACK / REDESIGN recommendation grounded in numbers.
  @created 2026-06-27 (branch: spike/editor-domid-overlay)
-->

# SP-0 Spike Report — Ripple Visual Editor: DOM addressability + overlay reuse

**Branch:** `spike/editor-domid-overlay`  •  **Date:** 2026-06-27  •  **Status:** complete

## TL;DR

| Question | Answer (evidence) |
|---|---|
| Can a rendered node be mapped back to its spec node from the DOM? | **Yes, 85%** today via the DOM `id` — `17/20` nodes, **zero widget changes**. |
| Does the proposed `data-ripple-node` stamp achieve that? | **No — 5%** (`1/20`). No widget forwards unknown attrs; only the renderer-owned motion wrapper carries it. |
| Does one mutator op round-trip reactively? | **Yes** — `node_prop_set` reflects in the DOM and unrelated live state survives. Test green. |
| Is `@builder/core` a drop-in `@ripple/core`? | **No.** It is genuinely framework-agnostic pure TS, but welded to `@builder/schema`'s `BuilderNode`; ripple already has the leaner equivalent (`spec-mutator`). Lift only the geometry math. |
| **Recommendation** | **GO-WITH-FALLBACK** (select by DOM `id`; converge the ~15% non-forwarders at touch-time). |

---

## 1. Coverage measurement (the key number)

**Test:** `src/lib/components/editor-domid-coverage.test.ts` → `SP-0: per-node DOM addressability coverage` (jsdom, renders `Ripple` with a 20-node spec spanning atoms / molecules / organisms / 5 composites). **PASSES.** Verbatim output:

```
================ SP-0 COVERAGE ================
total spec nodes (with id): 20
data-ripple-node coverage : 1/20 = 5.0%
   forwarded types        : ["card"]
   NON-forwarding types   : ["badge","button","card","container","data-grid","entity-detail",
                             "exec-dashboard","form","form-layout","heading","input",
                             "master-detail","metric","navbar","report-layout","stat","table","text"]
DOM id coverage           : 17/20 = 85.0%
   forwarded types        : ["button","card","container","data-grid","entity-detail",
                             "exec-dashboard","form","form-layout","heading","input",
                             "master-detail","navbar","report-layout","stat","text"]
   NON-forwarding types   : ["badge","metric","table"]
===============================================
```

### What this means

- **`data-ripple-node` (the proposed mechanism): 5.0%.** The single hit is `n_motion01`, a motion-wrapped node — and it surfaces only because **NodeRenderer itself owns the motion wrapper `<div>`** (which I stamped). Every plain widget drops the attribute.
- **DOM `id`: 85.0%.** This already works because **157 / 192 widget `.svelte` files explicitly bind `{id}` on their root element** (`<div {id}>`, `<nav {id}>`, …). `widgetProps.id = node.id` has always flowed; it just was never used as a selector.

### Root cause (why the stamp doesn't flow like `id`)

The task brief assumed `data-ripple-node` would "flow to widget roots exactly like `id`." It does not, and the reason is structural:

- **`id` flows because each widget *explicitly* binds it** (`{id}`), one element at a time — not because props fall through.
- **No widget spreads unknown attributes.** `grep` across all 192 widget components: **0** files spread `{...rest}` / `{...restProps}` / `{...$$restProps}` onto an element. The only spreads found are narrow, purpose-built objects (`{...interactive}` ×9, `{...triggerProps}` ×3, `{...rowInteractive}` ×1). In Svelte 5, an undeclared prop passed to a component with no rest-spread is simply discarded. So `data-ripple-node`, added to `widgetProps`, reaches the DOM **only** where the renderer owns the element (today: the motion wrapper).

### Non-forwarding set (the fallback list)

Two tiers:

1. **Render a root but don't bind `id`** (selectable only if we touch them): from the sample — **`badge`, `metric`, `table`**. Full set from `grep` (35 files lacking any `{id}` binding), the registered-widget ones being: `badge`, `metric`, `progress`, `skeleton`, `soul-status`, `table`, `chart`, `terminal`, and the entire `research/` pack (`source-card`, `citation`, `sources-bar`, `discover-card`, `follow-up`, `company-header`, `ticker`, `kv-table`, `timeline`, `callout`, `news-card`, `analyst-bar`, `range-bar`).
2. **Don't render their own root element** (delegate/internal — not directly selectable by design): `if`, `each` (control flow), `dashboard-slot`, `confirm-dialog`, `workflow`/`workflow-node`, and the `c4/nodes/*` SvelteFlow internals.

> Note: `data-grid`, all 5 composites tested, `form`, `navbar`, the text atoms, `input`, `button`, `card`, `stat` **do** forward `id` — composites are *not* the problem; specific display/data/research atoms are.

---

## 2. ensure-ids finding (Task 2)

**Found:** Neither `Ripple.svelte` nor `core/normalizer.ts` calls `ensureNodeIds()`. Node ids exist **only if the backend/author supplied them**; `ensureNodeIds` (in `core/spec-id.ts`) was written but never wired into the render path.

**Did:** Added an **opt-in `ensureIds` prop** to `Ripple.svelte` (default **off**). When on, a `WeakSet`-guarded `$effect` runs `ensureNodeIds(spec.ui)` once per distinct `ui` root, filling stable `n_xxxxxxxx` ids on any node lacking one.

- **Default-off ⇒ byte-identical** to today's behavior for every existing consumer (paw-enterprise renders `Ripple` everywhere) — no surprise mutation.
- The effect reads `spec.ui` (the slot) but never reads any node's `id`, and the `WeakSet` guards re-entry, so writing ids back can't loop.
- `ensureNodeIds` only **fills gaps** (existing ids kept; only sibling-duplicate ids reassigned), so an already-id'd spec is untouched even with the flag on.

**Caveat (needs design decision, not a spike blocker):** ids are random, so stability requires assigning them **once** and persisting. The editor host should turn `ensureIds` on, then save the now-id'd spec. A plain (non-editor) render leaves the caller's spec untouched.

---

## 3. One-op round-trip (Task 4)

**Test:** `src/lib/components/editor-one-op-roundtrip.test.ts` → `SP-0: one-op round-trip (spec-mutator -> reactive DOM)` → `node_prop_set is reflected in the DOM and unrelated instance state survives`. **PASSES.**

Flow (faithful to the real editor data flow — spec held in Svelte `$state`, see fixture `editor-roundtrip-harness.test.svelte`):

1. Render a 2-node spec (`text#n_target01` = "before"; `input#n_keepinp1` bound to `{state.draft}`).
2. User types **"user-typed"** into the bound input → asserted `input.value === 'user-typed'` (live state in the `StateManager`).
3. Apply **exactly one** op via `spec-mutator`: `applyOp(spec.ui, { action: 'node_prop_set', node_id: 'n_target01', prop: 'text', value: 'after' })`.
4. **Assert (a):** target text node now contains "after", not "before" — **DOM reflects the op**.
5. **Assert (b):** the input still shows "user-typed" — **unrelated instance state preserved** (surgical edit, no remount/clobber).

**Confirmed op API:** `core/spec-mutator.ts` exposes `applyOp(root, payload)` dispatching on `payload.action`. The `set_node_prop` action is wire-named **`node_prop_set`** → `{ node_id, prop, value }` → `applySetNodeProp`. (Full op set: `node_added`, `node_replaced`, `node_prop_set`, `node_moved`, `node_removed`, plus three `node_prop_array_item_*` ops.) Mutations are **in place**; reactivity requires the spec live in `$state` (deep proxy) — the editor must own it there, not pass a frozen prop object.

---

## 4. Overlay entanglement (Task 5) — `refs/svelte-visual-builder`

> refs live at `/Users/prakash-1/Documents/refs/svelte-visual-builder` (read-only; workspace-level, not in the worktree).

### 4a. How coupled is the overlay to `BuilderNode` / the engine? (quantified)

The overlay/geometry/selection engine = `editor-svelte/src/lib/{canvas.ts (74), anchor-controller.ts (38), layout-overlay.ts (160), interaction-core.ts (628), drag-drop.ts (181), transient-drag.ts (67), drop-rules.ts (122), navigator-model.ts (248)}` + the `BuilderCanvas.svelte` shell (**3755**).

Coupling signals:
- **223** `BuilderNode` references across `editor-svelte/src`.
- **11** `*.ts` files import `@builder/core`; **16** import `@builder/schema`.
- Every selection/geometry/drag module imports core types: `BuilderEngineState, BuilderRect, DropTarget, NodeBounds, SlotBounds` + `getCanvasGeometryKey`, `getNodeLocation`.

**The decisive architectural difference.** Their runtime renderer `runtime-svelte/BuilderNodeView.svelte` emits **each node's root element itself** and **spreads** the data attributes onto it:

```svelte
{ ...mergeNodeClassAttribute(resolvedAttributes, className), ...extraAttributes,
  'data-builder-node': node.id, 'data-builder-type': node.type,
  'data-builder-parent': parentId, 'data-builder-slot': slot,
  'data-builder-index': String(index), 'data-builder-accepts-children': ... }
```

So svelte-visual-builder gets **100% per-node addressability** (`data-builder-node`) because **one renderer owns every node's root**. Ripple's `NodeRenderer` does the opposite — it delegates the root element to one of **192 widget components**, which don't spread attributes. **That single difference is the entire 5%-vs-85% gap**, and it means the overlay cannot be lifted onto ripple unchanged: it expects a `data-*`-stamped root on *every* node.

**N (integration points to re-point):** the seam is the data model. For the overlay engine alone (excluding the 3755-line shell + the ~30 panel components):
- **~7 modules / ~1,470 lines** import core/schema and are keyed on `BuilderNode` + `BuilderEngineState` + the node-id/breakpoint geometry index.
- Of those: **~300–400 lines lift near-verbatim** (pure rect math — `pointInRect`, `rectToStyle`, viewport sizing in `canvas.ts`; the `BuilderRect`/`NodeBounds`/`SlotBounds` types + `buildCanvasGeometryIndex`/`getCanvasGeometryKey` in core). **~1,100 lines must be re-pointed** to ripple's `UINode` + `spec-mutator` (`interaction-core` hit-testing/drop resolution, `drag-drop`/`drop-rules`/`transient-drag` legality, `navigator-model` tree, `layout-overlay`'s `node.layout`/`node.styles.base` reads — ripple stores those as Tailwind classes + `props`, a different shape).
- **`BuilderCanvas.svelte` (3755) + panels: do NOT lift** — it's their whole app shell (inspector, AI tools, history, globals, responsive authoring), bound to `@builder/core` engine state. Write a thin ripple canvas + overlay instead.

### 4b. Is `@builder/core` genuinely framework-agnostic pure TS reusable as `@ripple/core`?

- **Framework-agnostic pure TS: YES.** 2888-line single `index.ts`, **0** real DOM/browser usages (no `window`/`HTMLElement`/`getBoundingClientRect`/`document.query*`; the `document.` hits are a local `BuilderDocument` variable), **no** `svelte`/`react` imports. Its only dependency is `@builder/schema`. It is a clean command-engine + history + geometry-state core.
- **Reusable as our L1 `@ripple/core`: NO — not as-is.** It is welded to `@builder/schema`'s `BuilderNode`/`BuilderDocument`/`BuilderPackage`, a **different data model** from ripple's `UISpec`/`UINode`. Ripple **already has** the L1 it needs — `spec-id.ts` + `spec-mutator.ts` + the `UINode` schema — which is leaner and already wire-compatible with the mutation ops our backend emits. Adopting `@builder/core` would force either adopting their whole schema (a `UINode`↔`BuilderNode` adapter at every boundary) or rewriting the engine onto `UINode` (which defeats "reuse"). **Keep `spec-mutator` as L1; lift only the model-light geometry layer.**

---

## 5. Toolchain notes

- **Bun + Vitest 4.1.1.** `bun install` clean; `bunx vitest run` works (single-run, non-watch in the agent shell).
- **Vitest's default reporter swallows `console.log`** — use `--reporter=verbose` to surface measurement output (that's how the coverage block above was captured).
- Two test "projects": `client` (jsdom, the relevant one) and `ssr`. New tests are jsdom `client`.
- `test-setup.ts` polyfills only `Element.animate`. **No `ResizeObserver`/`matchMedia`/`IntersectionObserver`** — so jsdom-hostile widgets (echarts `chart`, leaflet `map`, muuri `kanban`, canvas) were excluded from the coverage spec by design (they don't render in jsdom and would distort the count).
- Edits made this spike: `NodeRenderer.svelte` (stamp), `Ripple.svelte` (opt-in `ensureIds`), two new tests + one `.test.svelte` fixture (the `.test.*` suffix is excluded from the npm package by `package.json`'s `!dist/**/*.test.*`).
- **Full suite: 921 passed, 1 failed (`922` total) — the 1 red is PRE-EXISTING and unrelated.** `src/lib/manifest/manifest.test.ts > every entry has a non-empty description under 200 chars` fails with `expected 331 to be less than 200` (a manifest entry description is too long). Verified pre-existing: it reproduces on the clean base with all spike changes stashed, and the spike diff touches only `Ripple.svelte` + `NodeRenderer.svelte` (no manifest data). Left unfixed per "do not fix unrelated reds." The 3 new spike tests all pass.

---

## 6. Recommendation: **GO-WITH-FALLBACK**

The editor's foundational requirements are met **today**: nodes are reactively editable with one-op precision (§3), and a node can be mapped to its DOM element for **85%** of widget types with **zero widget churn** (§1) — using the DOM **`id`** that ripple already binds, not the `data-ripple-node` attribute the brief assumed. The proposed-attribute path is inert on its own (5%) for a structural reason (widgets own their roots and don't spread attrs), but that does not block the editor — it just **changes the overlay's primary selector to the DOM `id`**, with a small, well-bounded fallback. Hence GO, with this fallback plan:

1. **Primary selector = DOM `id`** (`container.querySelector('[id="n_…"]')` → `getBoundingClientRect`). 85% now, no widget edits.
2. **Keep the additive `data-ripple-node` / `data-ripple-type` stamp** shipped on this branch (it's harmless, future-proofs the dedicated-attribute path, disambiguates from author-set ids, and already makes motion-wrapped nodes selectable at the wrapper).
3. **Fallback for the ~15% non-forwarders** (`badge`, `metric`, `table`, `chart`, `progress`, `research/*`): a **mechanical touch-time codemod** adding `{id}` (and `data-ripple-node={id}`) to each widget's root element — converges coverage toward ~100% without a coordinated big-bang refactor (matches the workspace's touch-time-migration charter). Control/internal nodes (`if`/`each`/slots) are intentionally non-selectable.
4. **Overlay:** lift the **pure geometry math** from `@builder/core` + `canvas.ts` (~300–400 lines, re-typed), **rewrite** the selection/drag/drop engine against `UINode` + `spec-mutator` (~1,100 lines), and **do not** adopt `@builder/core` as `@ripple/core` or lift `BuilderCanvas.svelte`.

Choosing `data-ripple-node` as the *sole* mechanism would be REDESIGN territory (5%); selecting by `id` makes it a GO. The "fallback" is the selector swap + the bounded widget codemod — not a re-architecture.

---

## 7. Needs human / visual confirmation (not programmatically verified)

- **Geometry under real layout.** Coverage here proves the element is *findable*; it does not prove `getBoundingClientRect` returns a sane box in a real browser (jsdom returns zeros). Confirm overlay rectangles visually in a browser, especially for `display:contents`/inline widgets and the motion wrapper (`class="block"`).
- **DOM-`id` collision risk.** `widgetProps` spreads `id: node.id` **before** `...resolvedProps`, so an author-supplied `props.id` would *override* the node id for `id`-based selection. (The `data-ripple-node` stamp is placed **last**, so it's collision-proof — another reason to keep it as the canonical attribute once widgets forward it.) Audit how often specs carry author `id` props.
- **jsdom-excluded widgets.** `chart`, `map`, `kanban`, `drawing-canvas`, `model-viewer`, `video`/`audio` were not measured. Confirm their root `id`/attr forwarding in a browser.
- **Stable-id persistence policy.** `ensureIds` assigns random ids in place; the save/persist story (when does the editor write them back?) is a design decision, not verified here.
- **Drag/drop semantics mismatch.** Ripple's child model (`children[]` + named-slot via `child.slot`) differs from `BuilderNode` slots; the re-pointed drop-rules need behavioral review, not just a type re-point.
