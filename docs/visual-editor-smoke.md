<!-- Ripple Visual Editor smoke-test runbook (SP-0 … SP-1c-a). Created 2026-06-27.
     For the captain's manual smoke pass before the next phase (real Branch adapter).
     Branch: feat/ripple-visual-editor. Companion: feat/ripple-widget-id-forwarding. -->

# Ripple Visual Editor — Smoke Test (SP-0 … SP-1c-a)

## What you're smoking

The first vertical of the Ripple visual editor: **select** any rendered node, **edit** its text inline or via the inspector, and route every edit through a **host-supplied persistence port** (with an in-memory draft / revisions / restore stub). Built on the DOM-`id` selector (SP-0 finding), L1 (pure TS) / L2 (Svelte) split throughout.

- **Branch:** `feat/ripple-visual-editor` (off `origin/main`)
- **Companion PR:** `feat/ripple-widget-id-forwarding` — 19 display/research widgets bind their node id on root, taking direct selectability from ~85% to ~100%.

## Prereqs

```bash
cd /Users/prakash-1/Documents/paw-worktrees/ripple-editor-spike   # the editor worktree
# bun install — already done in this worktree
```

## 1. Automated smoke (all green except one KNOWN, pre-existing red)

```bash
bunx vitest run src/lib/editor/     # editor module → 8 files, 83 tests pass
bunx vitest run                     # full suite → 998 pass, 1 FAIL
bun run build                       # svelte-package → dist/ (lint:anim + manifest)
bun run check                       # svelte-check
```

Expected:
- `src/lib/editor/` → **83 passed / 8 files**.
- Full suite → **998 passed, 1 failed**. The 1 failure is **pre-existing and unrelated**: `src/lib/manifest/manifest.test.ts > every entry has a non-empty description under 200 chars` (a manifest description is 331 chars). It reproduces on clean `main`; our diff never touches manifest data.
- `bun run check` → our editor files are clean; there are pre-existing `svelte-check` errors in *other* files (`Ripple.svelte`, `ArticleLayout.svelte`, `MultiSelect.test.ts`) — not ours.

## 2. Manual smoke — the canvas

```bash
bun run dev     # open the printed localhost URL → navigate to /editor-lab
```

Checklist:
- [ ] `/editor-lab` renders the sample spec (navbar, heading, text, button, card, stat, badge, metric, table, …).
- [ ] **Click** a widget → a selection box outlines it; the inspector shows its `id` + `type` + props.
- [ ] **Hover** → a dashed hover box tracks the widget under the cursor.
- [ ] **Double-click** a heading / text / button → edit the text in place → Enter (or blur) → canvas updates live; Escape cancels.
- [ ] **Inspector edit** → change the primary text prop in the inspector → canvas updates live.
- [ ] Click **badge / metric / table** → selects the **parent** (these display widgets don't bind `id` on *this* branch; the companion codemod PR makes them directly selectable).
- [ ] **Save draft** → a revision appears in the list; **Restore** a revision → the canvas reverts (this is the in-memory persistence port).
- [ ] **Resize** the window → selection / hover boxes re-measure and stay aligned.

## 3. Known limitations (by design, this slice)

- **Overlay pixel alignment is not auto-verified** — jsdom returns zero rects, so all geometry logic is unit-tested but the *visual* box position is confirmed only by this manual pass. If a box is misaligned, that's a real bug — flag it.
- **Persistence is an in-memory stub** — a page refresh resets it. The real Branch-backed adapter (draft → review → publish + history) is the **next phase** and drops into the same `PersistenceAdapter` port with no editor changes.
- **Not in this build:** drag-to-reorder, undo/redo, the brand / design-system widget, export (PDF/PPTX/MP4). Those are later slices.
- **Custom / Svelte sites** are not directly editable (they stay the chat lane) — out of scope.

## What "pass" means

Selection works across the catalog, inline + inspector edits reflect live on the canvas, and save-draft → restore round-trips. Anything that doesn't behave that way is a bug worth flagging before we wire the real persistence backend.
