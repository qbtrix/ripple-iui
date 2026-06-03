---
{
  "title": "SvelteKit App Type Declarations",
  "summary": "The `app.d.ts` file is the SvelteKit-generated ambient type declaration file that extends the global `App` namespace. It provides a central place to type platform-specific interfaces like error shapes, locals, page data, page state, and platform context.",
  "concepts": [
    "SvelteKit",
    "TypeScript",
    "ambient declarations",
    "App namespace",
    "App.Error",
    "App.Locals",
    "App.PageData",
    "App.PageState",
    "App.Platform",
    "global augmentation",
    "module declaration"
  ],
  "categories": [
    "configuration",
    "type-system"
  ],
  "source_docs": [
    "3d450fc2fc7b0f10"
  ],
  "backlinks": null,
  "word_count": 471,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

SvelteKit projects include an `app.d.ts` file at the project root to declare types that span the entire application. This file uses TypeScript's `declare global` syntax to augment the `App` namespace, which is a convention defined by SvelteKit itself.

## Purpose

The `App` namespace hosts five extension points that SvelteKit reads during compilation and runtime:

- **`App.Error`** — The shape of errors surfaced to `+error.svelte` pages. Without this, error objects are typed as `unknown`, forcing unsafe casts in error pages.
- **`App.Locals`** — Data attached to `event.locals` in server hooks and route handlers. Typing this prevents typos and enables autocomplete in load functions and actions.
- **`App.PageData`** — The merged data shape returned to page components from `load()`. Declaring it tightens the type contract between server-side loaders and client-side page components.
- **`App.PageState`** — Describes the shape used by `history.pushState` / `pushState` for shallow routing. Untyped page state leads to silent runtime errors when reading `$page.state`.
- **`App.Platform`** — Platform-specific context (e.g., Cloudflare Workers bindings, Deno runtime). Required for edge deployments that expose non-standard runtime APIs.

## Current State

All five interfaces are commented out, which means the project currently uses the SvelteKit defaults: errors are `App.Error = { message: string }`, locals are empty, and platform context is absent. This is appropriate for a fresh project or a library bundle where server-side concerns are minimal.

The file ends with `export {}` — a TypeScript idiom to convert the file from a script into a module. Without this, `declare global` blocks in non-module files behave differently and can cause "duplicate identifier" errors in strict configurations.

## Why This File Exists

SvelteKit's code generator creates `app.d.ts` on project init and expects it to be checked in. Tooling (language servers, `svelte-check`, CI type-checks) all rely on this file being present to resolve `App.*` types. Removing it breaks type inference across all route load functions.

## Integration with Ripple

For Ripple as a component library package, `app.d.ts` primarily matters for the demo/dev app, not for the library build itself. The library exports widgets and runtime primitives; the SvelteKit-specific `App` namespace is only relevant when Ripple's demo application adds server-side routes, API endpoints, or streaming handlers.

When the Ripple demo app begins serving streaming spec endpoints (for `StreamSpecStore` demos), `App.Locals` should be populated with request-scoped state like session IDs or feature flags passed from server hooks into load functions. `App.PageData` should reflect the shape of data returned by those load functions so page components receive typed props.

## Known Gaps

All interfaces are commented out. As Ripple adds server-side data fetching, streaming endpoints, or edge deployment targets, the relevant interfaces should be uncommented and populated. In particular, if the Ripple demo app uses SvelteKit's `error()` helper with custom fields, `App.Error` should be extended to carry those fields so error pages receive fully-typed error objects.