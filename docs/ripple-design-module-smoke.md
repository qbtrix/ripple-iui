<!-- Smoke runbook — Ripple design module, full integration (library half).
     Branch: integration/ripple-design-module-v2 (snapshot of main @ 42aae55).
     Created 2026-06-29. Covers everything merged: editor + codemod + follow-ups +
     slides + design system + polish (and the coexisting AI-native widget tier).
     The cross-repo half (paw-enterprise mount, real Branch adapter, pocketpaw
     export) is NOT in this branch. -->

# Ripple Design Module — Full Smoke Test

## What this is

`integration/ripple-design-module-v2` is a snapshot of `main` with the **complete library half** of the unified design module:

| area | what | PR |
|---|---|---|
| editor | select / hover overlay, inline + inspector edit, one-op apply, persistence port | #80 |
| addressability | 19 widgets forward `id` on root (near-100% direct selection) | #79 |
| editor follow-ups | lab Save/Restore wired, manifest no longer imports package.json | #81 |
| slides | `slides` intent layout (render a spec as a deck) | #83 |
| design system | portable brand token contract + `DesignSystemEditor` widget | #82 |
| polish | accurate select-parent legend, proxy-safe adapter clone | #85 |

Also present on this branch (a separate track, not part of this smoke): the **AI-native widget tier** (#84) — `stream-text`, `tool-call`, `reasoning-trace`, `approval-gate` — with its own showcase.

NOT here (next session): the cross-repo half — mounting the editor in paw-enterprise, the real Branch-backed persistence adapter, and PDF/PPTX/MP4 export in pocketpaw.

## Setup

```bash
cd /Users/prakash-1/Documents/paw-worktrees/ripple-integration-final   # branch integration/ripple-design-module-v2
# bun install already run
```

## 1. Automated checks

```bash
bunx vitest run     # 1107 pass, 1 fail
bun run build       # svelte-package -> dist/ + manifest (188 widgets, v0.5.0)
bun run check       # svelte-check
```
Expected:
- `bunx vitest run` -> **1107 pass, 1 fail**. The single failure is pre-existing and unrelated: `manifest.test.ts > every entry has a non-empty description under 200 chars` (a 331-char widget description; reproduces on a clean checkout).
- `bun run build` -> clean.
- `bun run check` -> ~38 pre-existing errors in widget-library files (missing `@types`, etc.); none from the editor / design-system / slides code.

## 2. Manual — three labs

```bash
bun run dev   # open the printed localhost URL, then visit each route
```

### /editor-lab — the visual editor
- [ ] sample spec renders
- [ ] click a widget -> selection box + inspector shows its id / type / props
- [ ] hover -> dashed box tracks the node under the cursor
- [ ] double-click a heading / text / button -> edit inline -> Enter commits, canvas updates; Escape cancels
- [ ] edit the text prop in the inspector -> canvas updates live
- [ ] click badge / metric / table -> selects them **directly** (post-codemod they forward their id). The legend now states this; select-parent is only the fallback for widgets without their own root.
- [ ] **Save snapshot** -> a revision is added; **Restore** a revision -> the canvas reverts (in-memory persistence port)
- [ ] resize the window -> the overlay re-measures and stays aligned

### /design-system-lab — the design system
- [ ] the token editor (left) and live preview (right) render
- [ ] **edit a color (e.g. primary)** -> the preview re-skins live (this was the `$state`-proxy clone bug from the last smoke; now fixed)
- [ ] edit a font family -> all preview text re-skins
- [ ] edit a radius / spacing / shadow step -> the preview reflects it
- [ ] toggle light / dark -> the editor slot and the preview both switch
- [ ] an identity / empty brand keeps today's look (no regression)

### /slides-lab — the deck layout
- [ ] the sample renders as a deck, one slide at a time
- [ ] Next / Prev advance; the n / total counter tracks
- [ ] clickable dots jump to a slide; Left / Right arrow keys navigate

## 3. Fixed since the last smoke (verify these specifically)

- **Primary color (any token) now applies.** Root cause was `structuredClone` throwing `DataCloneError` on the Svelte `$state` proxy, which swallowed every edit. Now cloned via a JSON round-trip. Confirm by editing any color in `/design-system-lab`.
- **Select-parent legend is accurate.** It previously claimed badge/metric/table do not forward `id`; the codemod made them forward, and the legend + list now match reality.
- **Persistence adapter hardened** against the same proxy-clone landmine (preventive).

## 4. Known issues / limitations

- One red test: `manifest.test.ts` description-length, pre-existing and unrelated.
- Issue #86: a non-reproducible `Live4` badge transient seen once in `/editor-lab` (cosmetic, self-corrects on reload). Logged for the team; not a blocker.
- Persistence in `/editor-lab` is the in-memory stub (a refresh resets it). The real Branch-backed adapter is the cross-repo phase.
- Overlay / inline-edit / re-skin pixel correctness is confirmed by this manual pass (jsdom returns zero-size rects, so geometry is logic-tested only).

## What "pass" means

All three labs behave as listed, the build is clean, and the only test red is the known manifest one. Then the library module is verified end to end and the next session is the cross-repo integration.
