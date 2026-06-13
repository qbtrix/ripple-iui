# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@ripple-ui/svelte` — a Svelte 5 component library that renders UI from JSON specs. Designed for AI-generated interfaces: an LLM produces a declarative JSON spec, and Ripple renders it as a fully interactive UI with state management, event handling, and expression resolution.

## Commands

```bash
bun run dev          # Start dev server (SvelteKit)
bun run build        # Build library to dist/ via svelte-package
bun run check        # Type-check (svelte-kit sync && svelte-check --tsconfig ./tsconfig.json)
bun run test         # Run tests (vitest) — no tests exist yet
```

Package manager is **Bun** (bun.lock). Use `bun install` for dependencies.

## Architecture

### Two Spec Systems

1. **UISpec** (`src/lib/schema/ui-spec.ts`) — Low-level: explicit widget tree with `UINode` containing `type`, `props`, `children`, `show`, event handlers. Direct control over layout.
2. **UniversalSpec** (`src/lib/schema/universal-spec.ts`) — High-level intent-based: declares _what_ the UI should accomplish (browse, select, form, detail, dashboard, etc.) and the layout engine picks the best rendering.

The **normalizer** (`src/lib/core/normalizer.ts`) converts UISpec → UniversalSpec by wrapping it as `intent: 'custom'`.

### Core Engine (`src/lib/core/`)

- **StateManager** (`state-manager.svelte.ts`) — Svelte 5 `$state` rune-based. Path-based get/set with dot notation (`"user.profile.name"`). Auto-creates intermediate objects.
- **ExpressionResolver** (`expression-resolver.ts`) — Resolves `{state.foo}`, `{item.price}`, ternaries, comparisons, and template strings within props.
- **EventDispatcher** (`event-dispatcher.ts`) — Handles actions: `set`, `api`, `navigate`, `toast`, `emit`, `open`, `pin`, `unpin`. Resolves expressions in URLs/body/headers.

### Rendering Pipeline

`Ripple.svelte` → initializes state/events/context → `NodeRenderer.svelte` recursively renders the widget tree. NodeRenderer evaluates `show` conditions, resolves props via expressions, binds events, manages loop context (`item_as`, `index_as`), and renders children.

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
- Library output goes to `dist/` — this is a publishable npm package, not a standalone app. The SvelteKit routes (`src/routes/`) are for dev/playground only.
