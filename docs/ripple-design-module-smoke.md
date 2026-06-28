<!-- Smoke runbook for the ripple design module integration branch. Created 2026-06-28.
     Branch: integration/ripple-design-module = ripple main (#79/#80/#81/#83) + design-system #82.
     Covers the library half (editor + design system + slides). The cross-repo half is not built. -->

# Ripple Design Module — Smoke Test (integration)

## What you're smoking

The complete **ripple-library** half of the unified design module on one branch: the visual editor (select, inline + inspector edit, persistence), the design system (brand tokens + token-editor widget), and the slides render layout. The branch `integration/ripple-design-module` is ripple `main` (editor #80, codemod #79, follow-ups #81, slides #83) with the design-system PR #82 merged in.

NOT in this smoke (next phase, not built): the cross-repo integration — mounting the editor in paw-enterprise, the real Branch-backed persistence adapter, and PDF/PPTX/MP4 export in pocketpaw.

## Setup

```bash
cd /Users/prakash-1/Documents/paw-worktrees/ripple-integration   # branch integration/ripple-design-module
# bun install already run
```

## 1. Automated (all green except one known pre-existing red)

```bash
bunx vitest run     # 1061 pass, 1 fail
bun run build       # svelte-package -> dist/ + manifest.json (184 widgets, v0.5.0)
bun run check       # svelte-check
```
Expected:
- `bunx vitest run` -> **1061 pass, 1 fail**. The one failure is pre-existing and unrelated: `manifest.test.ts > every entry has a non-empty description under 200 chars` (a 331-char widget description; reproduces on clean main).
- `bun run build` -> clean.
- `bun run check` -> ~38 pre-existing errors in widget-library files (missing `@types`, unknown row types); **zero** from this module.

## 2. Manual — three lab surfaces

```bash
bun run dev   # open the printed localhost URL, then visit each route
```

### /editor-lab — the visual editor
- [ ] sample spec renders
- [ ] click a widget -> selection box + inspector (id, type, props)
- [ ] hover -> dashed box tracks the node under the cursor
- [ ] double-click a heading / text / button -> edit inline -> Enter commits, canvas updates
- [ ] edit the text prop in the inspector -> canvas updates live
- [ ] click badge / metric / table -> selects directly (post-codemod these forward their id; near-100% of widgets are directly selectable, select-parent is the rare fallback)
- [ ] Save snapshot -> a revision appears; Restore -> canvas reverts (in-memory persistence port)
- [ ] resize the window -> the overlay re-measures and stays aligned

### /design-system-lab — the design system
- [ ] the token editor (left) and live preview (right) render
- [ ] edit a color (e.g. primary) -> the preview re-skins live
- [ ] edit a radius or a font -> the preview updates
- [ ] toggle light / dark -> the editor slot and the preview both switch
- [ ] an identity/empty brand keeps today's look (no regression)

### /slides-lab — the deck layout
- [ ] the sample renders as a deck, one slide at a time
- [ ] Next / Prev advance; the n / total counter updates
- [ ] clickable dots jump to a slide; Left / Right arrow keys navigate

## 3. Known limitations

- Persistence in `/editor-lab` is the in-memory stub; a refresh resets it. The real Branch-backed adapter is the next (cross-repo) phase.
- Overlay, inline-edit, and re-skin pixel correctness are confirmed by this manual pass: jsdom returns zero-size rects, so geometry is logic-tested only.
- The one red test (manifest description length) is pre-existing and untouched by this work.
- The cross-repo integration (editor mounted in the app, real persistence, export) is not in this branch.

## What "pass" means

All three labs behave as listed, the build is clean, and the only test red is the known manifest one. Then the library module is good to merge (PR #82 is the last open piece) and the next phase is the cross-repo integration.
