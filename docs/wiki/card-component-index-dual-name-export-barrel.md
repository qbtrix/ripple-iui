---
{
  "title": "Card Component Index — Dual-Name Export Barrel",
  "summary": "The card `index.ts` barrel file re-exports all seven card sub-components under both short semantic names (`Root`, `Header`, `Content`) and fully-qualified PascalCase names (`Card`, `CardHeader`, `CardContent`). This dual-export pattern supports both namespace-style and destructured imports.",
  "concepts": [
    "barrel export",
    "dual-name exports",
    "namespace import",
    "destructured import",
    "$lib alias",
    "card system",
    "SvelteKit module resolution",
    "component API surface",
    "index.ts pattern",
    "shadcn-style exports"
  ],
  "categories": [
    "widget",
    "card",
    "module-system"
  ],
  "source_docs": [
    "218019c78c8be52b"
  ],
  "backlinks": null,
  "word_count": 354,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This barrel file is the single public entry point for the entire card component system. It assembles the seven individual sub-component files into one importable module.

## Exported Components

The card system comprises seven building blocks:

| Export | Source File |
|---|---|
| `Root` / `Card` | `card.svelte` — root orchestrator |
| `Header` / `CardHeader` | `card-header.svelte` — adaptive grid header |
| `Content` / `CardContent` | `card-content.svelte` — main body |
| `Description` / `CardDescription` | `card-description.svelte` — subtitle text |
| `Footer` / `CardFooter` | `card-footer.svelte` — bottom action zone |
| `Title` / `CardTitle` | `card-title.svelte` — heading text |
| `Action` / `CardAction` | `card-action.svelte` — inline action slot |

## Dual-Name Export Pattern

Each component is exported twice: once as a short name (e.g. `Root`), and once as a qualified name (e.g. `Card`). This supports two idiomatic usage styles in Svelte projects:

**Namespace style** — consumers import the module as a namespace and use dot notation:

```typescript
import * as Card from "$lib/components/ui/card";
// Usage: <Card.Root>, <Card.Header>, <Card.Footer>
```

This is preferred when multiple card sub-components are used together — it makes the composition structure obvious in template code.

**Destructured style** — consumers import individual components by their full names:

```typescript
import { Card, CardHeader, CardContent, CardFooter } from "$lib/components/ui/card";
// Usage: <Card>, <CardHeader>, <CardContent>
```

This matches conventions from other UI libraries (shadcn/ui, Radix) that consumers may migrate from.

## Why a Barrel File

Without this file, consumers would need to import each sub-component from its individual file path (`"$lib/components/ui/card/card-footer.svelte"`). That couples import paths to the internal file structure. If a sub-component is ever renamed or moved, every import site breaks. The barrel decouples the public API from the internal layout — only `index.ts` needs updating.

It also enables SvelteKit's `$lib` alias to resolve the entire card system through a single clean path: `"$lib/components/ui/card"`.

## Known Gaps

`CardContent` and `CardAction` are included in the exports but their source files are not part of this batch. Consumers should note these exist as part of the public API even if their implementation details aren't reviewed here.
