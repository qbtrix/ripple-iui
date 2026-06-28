<!-- Ripple Visual Editor smoke-test runbook (SP-0 … SP-1c-a). Created 2026-06-27.
     For the captain's manual smoke pass before the next phase (real Branch adapter).
     Branch: feat/ripple-visual-editor. Companion: feat/ripple-widget-id-forwarding. -->

# Ripple Visual Editor — Smoke Test (SP-0 … SP-1c-a)

## What you're smoking

The first vertical of the Ripple visual editor: **select** any rendered node and **edit** its text inline or via the inspector, with each change going through one op seam that updates the canvas reactively. A persistence port and an in-memory adapter ship alongside (saveDraft, publish, restore), proven by unit tests. Wiring them into this lab page is the next slice (SP-1c-b), so on this branch the lab has only Re-measure and Clear buttons, not Save/Restore. Built on the DOM-`id` selector (SP-0 finding), with an L1 (pure TS) / L2 (Svelte) split throughout.

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
- [ ] **Resize** the window → selection / hover boxes re-measure and stay aligned.
- [ ] (No Save/Restore in this lab yet.) Persistence is built but not surfaced on the page on this branch. Verify it at the unit level instead: `bunx vitest run src/lib/editor/core/memory-persistence-adapter.test.ts` (saveDraft, publish, restore round-trip; history; scope isolation). The clickable round-trip arrives with SP-1c-b.

## 3. Known limitations (by design, this slice)

- **Overlay pixel alignment is not auto-verified** — jsdom returns zero rects, so all geometry logic is unit-tested but the *visual* box position is confirmed only by this manual pass. If a box is misaligned, that's a real bug — flag it.
- **Persistence is built but not wired into this lab.** The `PersistenceAdapter` port and the in-memory adapter exist and are unit-tested, but the lab page does not call them yet (it edits through the op seam directly). SP-1c-b wires the lab to the adapter, then swaps in the real Branch-backed adapter, which implements the same interface with no editor changes.
- **Running `vite dev` from a git worktree:** `/editor-lab` can return a 500. The editor is the first client consumer of the widget manifest, which statically imports the root `package.json`; Vite's worktree root detection puts that path outside `server.fs.allow`. This does not affect `bun run build`, production, or a normal clone (`/`, `/playground`, `/showcase` all render). Temporary unblock: `server.fs.strict: false` in `vite.config.ts`. Planned proper fix (at prune, when vite.config is free): inject the version via a Vite `define` so the manifest no longer imports `package.json` into the client path.
- **Not in this build:** drag-to-reorder, undo/redo, the brand / design-system widget, export (PDF/PPTX/MP4). Those are later slices.
- **Custom / Svelte sites** are not directly editable (they stay the chat lane) — out of scope.

## What "pass" means

Selection works across the catalog, inline + inspector edits reflect live on the canvas, and save-draft → restore round-trips. Anything that doesn't behave that way is a bug worth flagging before we wire the real persistence backend.
