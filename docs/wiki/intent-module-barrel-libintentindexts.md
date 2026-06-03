---
{
  "title": "Intent Module Barrel — lib/intent/index.ts",
  "summary": "The `lib/intent/index.ts` barrel re-exports Ripple's intent-layer subsystems: the layout engine, pattern detector, chain executor, and dashboard manager. It provides a stable import boundary for the intent-resolution layer, which sits between raw spec parsing and concrete rendering.",
  "concepts": [
    "barrel file",
    "intent layer",
    "layout engine",
    "pattern detector",
    "ChainExecutor",
    "DashboardManager",
    "module boundary",
    "export *",
    "Svelte ts barrel"
  ],
  "categories": [
    "module-system",
    "intent-engine"
  ],
  "source_docs": [
    "7f00cef9c823c4a0"
  ],
  "backlinks": null,
  "word_count": 492,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/intent/index.ts` is the public barrel for Ripple's intent layer — the set of modules responsible for interpreting what a spec *intends* to do and selecting the appropriate rendering strategy or navigation behavior. Like `lib/core/index.ts`, it aggregates re-exports without defining any symbols of its own.

## What It Exports

```typescript
export * from './layout-engine.js';
export * from './pattern-detector.js';
export { ChainExecutor } from './chain-executor.svelte.js';
export { DashboardManager, createDashboardManager, type DashboardSpec, type DashboardWidget } from './dashboard-manager.svelte.js';
```

Four modules are aggregated here:

| Module | Export style | Contents |
|---|---|---|
| `layout-engine.js` | `export *` | `determineLayout`, `analyzeData` |
| `pattern-detector.js` | `export *` | Pattern detection utilities |
| `chain-executor.svelte.js` | Named | `ChainExecutor` class |
| `dashboard-manager.svelte.js` | Named | `DashboardManager`, `createDashboardManager`, `DashboardSpec`, `DashboardWidget` |

## Why Selective Named Exports for .svelte.ts Files

The two `.svelte.js` entries use named exports rather than `export *`. This avoids re-exporting internal types (`HistoryEntry`, `SpecChangeHandler`) that are intentionally not exported from the source modules. Using `export *` would expose any symbol marked `export` in the source file, including types intended only for internal module use. The named export list acts as an explicit public surface declaration.

## Relationship to lib/index.ts

The intent barrel is **not** re-exported from `lib/index.ts` (the top-level package entry point). Consumers of the full Ripple package must import from `ripple/intent` or the file path directly to access `ChainExecutor`, `DashboardManager`, and the layout engine functions.

This split reflects a layered architecture decision: `lib/core` is the rendering engine (always needed), while `lib/intent` is the interpretation layer (only needed for intent-driven rendering and multi-step flows). A consumer building a simple widget renderer that takes a `UISpec` directly does not pay the bundle cost for the intent layer — it is never imported into their dependency graph.

## layout-engine and pattern-detector Use export *

Both are utility modules that export multiple standalone functions. Using `export *` here avoids enumerating each function name in this barrel and allows the source modules to add new exported functions without requiring a corresponding update to this barrel file.

## Intent Layer Architecture

```
lib/intent/index.ts (public barrel)
  ├── layout-engine.js      → determineLayout, analyzeData
  ├── pattern-detector.js   → pattern detection helpers
  ├── chain-executor.svelte.js → ChainExecutor (multi-step navigation)
  └── dashboard-manager.svelte.js → DashboardManager (widget state)
```

The intent layer sits between spec ingestion and rendering:

```
Raw spec → normalizeSpec (core) → intent layer → DashboardRenderer / IntentRenderer
```

The layout engine analyzes the spec's intent and data to select a layout. The chain executor handles client-side multi-step navigation. The dashboard manager owns mutable widget list state for persistent dashboards.

## Known Gaps

`DashboardRenderer.svelte` — the primary visual component for `intent='dashboard'` specs — is **not** exported from this barrel. Consumers must import it directly from `./intent/DashboardRenderer.svelte`. This inconsistency means the intent layer's data model (accessible via this barrel) and its main rendering component are split across two different import paths, which can surprise developers building custom intent renderers or wrappers around the dashboard UI.
