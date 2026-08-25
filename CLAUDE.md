# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A **monorepo** holding Ripple's spec engine and its renderers. An LLM produces a declarative JSON spec; Ripple renders it as a fully interactive UI with state management, event handling, and expression resolution.

| Package | Path | What |
|---|---|---|
| `@ripple-ui/core` | `packages/core/` | The engine: schema, expressions, state, event dispatcher, motion compiler, headless runtime. **Zero framework dependency.** Built with plain `tsc`. |
| `@ripple-ui/svelte` | `packages/svelte/` | The Svelte 5 renderer: 189 widgets, editor, intents, streaming. Depends on core via `file:../core`. |

**Which package does a change belong in?** If it needs the Svelte compiler
(a `.svelte` file, a `$state` rune, a `use:` action) or a DOM, it is
`packages/svelte`. Everything else is `packages/core` — and if you are not
sure, try core: the purity test will tell you immediately if it does not
belong there.

Root scripts fan out with bun workspaces: `bun run build|check|test` run
every package. Per-package: `cd packages/core && bun run test`.

**Never use `workspace:*` in `packages/svelte`'s dependencies.** It resolves
here and resolves against nothing for a consumer linking
`file:../ripple/packages/svelte`, which has no workspace root — `bun install`
there dies with "Workspace dependency not found". This shipped once and broke
paw-sites and paw-enterprise while every in-repo signal stayed green, because
the repo only tests itself from inside the workspace. `file:../core` works
both ways. `manifest-consumable.test.ts` guards it.

## Commands

```bash
# From the repo root — fans out to every package
bun install          # link the workspace
bun run build        # build all packages
bun run check        # type-check all packages
bun run test         # test all packages
bun run dev          # the Svelte playground

# Per package
cd packages/core && bun run test     # vitest, node environment, no DOM
cd packages/svelte && bun run check  # svelte-check
```

Package manager is **Bun** (bun.lock, workspaces). `bun install` from the root.

## Architecture

### Two Spec Systems

1. **UISpec** (`src/lib/schema/ui-spec.ts`) — Low-level: explicit widget tree with `UINode` containing `type`, `props`, `children`, `show`, event handlers. Direct control over layout.
2. **UniversalSpec** (`src/lib/schema/universal-spec.ts`) — High-level intent-based: declares _what_ the UI should accomplish (browse, select, form, detail, dashboard, etc.) and the layout engine picks the best rendering.

The **normalizer** (`src/lib/core/normalizer.ts`) converts UISpec → UniversalSpec by wrapping it as `intent: 'custom'`.

### Core Engine (`packages/core/src/core/`)

- **StateStore** (`state-store.ts`) — the state INTERFACE both runtimes implement. `EventDispatcher` and the headless resolver depend on this, never on a concrete class; that indirection is what keeps the engine renderer-agnostic.
- **StateManager** — Svelte 5 `$state` rune-based `StateStore`. Path-based get/set with dot notation. Lives in `packages/svelte/src/lib/core/state-manager.svelte.ts`, NOT in core: `$state` needs the Svelte compiler. Its rune-free twin is `packages/core/src/headless/state.ts`; `packages/svelte/src/lib/core/state-parity.test.ts` holds the two to identical semantics (it lives there because it is the only place both classes are reachable).
- **ExpressionResolver** (`expression-resolver.ts`) — Resolves `{state.foo}`, `{item.price}`, ternaries, comparisons, and template strings within props.
- **EventDispatcher** (`event-dispatcher.ts`) — Handles actions: `set`, `api`, `navigate`, `toast`, `emit`, `open`, `pin`, `unpin`. Resolves expressions in URLs/body/headers.

### Rendering Pipeline

`Ripple.svelte` → initializes state/events/context → `NodeRenderer.svelte` recursively renders the widget tree. NodeRenderer evaluates `show` conditions, resolves props via expressions, binds events, manages loop context (`item_as`, `index_as`), and renders children.

`packages/core/src/headless/resolve-tree.ts` is the same walk WITHOUT the rendering half — same rules, plain output. When you change one, change the other, or the runtimes diverge. Two behaviours are deliberately pinned by tests as shared with NodeRenderer: `each` items resolve from the data bag or state but never from loop context, and the data bag is consulted on a truthiness check.

### Three injection points across the package boundary

The engine must never import from a renderer, so where it needs one, the
renderer passes it in:

1. **Widget catalog** — `validateCatalog` takes `widgetTypes`. `packages/svelte/src/lib/widgets/validate-catalog-bound.ts` binds the registry, so Svelte-side callers are unchanged. Importing the raw one from `@ripple-ui/core` and expecting `flex` to be known is the mistake to avoid.
2. **Motion player** — `createEventDispatcher`'s 5th arg. `Ripple.svelte` passes a lazy import of its `playMotion` action. Without one, `animate` emits its event and skips the pulse (the headless case).
3. **State store** — both packages implement `StateStore`; the engine depends on the interface only.

### Widget System (`src/lib/widgets/`)

30+ widgets in 7 categories: layout (container, flex, grid, card, tabs, dashboard), display (text, heading, image, badge, progress, avatar, metric, feed), input (button, input, select, checkbox, switch), data (table, chart), control (if, each), composite (terminal).

Registry in `src/lib/widgets/index.ts` — supports `registerWidget`/`unregisterWidget` for custom widgets.

Widgets wrap **shadcn-svelte** components (`src/lib/components/ui/`) with Ripple-specific state binding and event handling.

Building a master-detail (list + detail) layout? Read the "Layout gotchas" section in `docs/widgets.md` first — independent column scroll needs a fixed `height` + `overflow:hidden` (NOT `max-height`), and the `master-detail` widget can't take custom list cards.

### Intent System (`src/lib/intent/`)

- **LayoutEngine** — auto-selects layout based on intent type, data shape, and display hints
- **PatternDetector** — detects semantic patterns (quiz, results) from spec structure
- **ChainExecutor** — manages multi-step intent flows with history, forward stack, and quiz scoring

### Key Context Keys

Widgets receive context via Svelte's `setContext`: `ui-state` (StateManager), `ui-events` (EventDispatcher), `ui-data` (data fetcher results), `ui-widget-resolver` (custom widget lookup).

## Conventions

- **Svelte 5 runes throughout**: `$state`, `$derived`, `$derived.by`, `$props()`, `$effect`. No Svelte 4 stores.
- **Expression syntax**: `{state.path}` for state bindings, `{item.field}` for loop context, supports operators and ternary.
- **Tailwind CSS** with shadcn-svelte semantic tokens (primary, secondary, muted, destructive, etc.).
- Library output goes to each package's `dist/`. The SvelteKit routes (`packages/svelte/src/routes/`) are for dev/playground only.
- **Nothing in `packages/core` may import Svelte**, a `.svelte` component, a `.svelte.ts` rune module, or touch `document`/`window` at module top level — including transitively. `packages/core/src/headless/purity.test.ts` crawls the real import graph and fails the build otherwise. Core's vitest also runs in the `node` environment with no DOM, so a violation fails there too. If a new dependency pulls in Svelte, extract the framework-free part or put the module in `packages/svelte`.
- **Watch for name collisions in barrels.** `widgets/c4/index.ts` exports both a COMPONENT `C4Diagram` and (aliased) the TYPE of the same name. Import data types from their defining module (`./types.js`), not the barrel — importing the type from the barrel silently resolves to the component's props type.
