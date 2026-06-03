---
{
  "title": "Tabs Component Public API Index",
  "summary": "The barrel file for the Tabs component family, re-exporting all four sub-components plus variant utilities under both short and verbose names. Establishes the single import point consumers use to access the entire tabs system.",
  "concepts": [
    "barrel file",
    "index module",
    "named exports",
    "namespace import",
    "tabs",
    "tabsListVariants",
    "TabsListVariant",
    "dual naming",
    "shadcn convention",
    "public API",
    "TypeScript types",
    "re-export"
  ],
  "categories": [
    "tabs",
    "navigation",
    "state-management"
  ],
  "source_docs": [
    "09ee4ae6ac62cd85"
  ],
  "backlinks": null,
  "word_count": 389,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This `index.ts` file is the public surface of ripple's Tabs component. It acts as a barrel — a single module that aggregates and re-exports everything a consumer needs — so that import statements stay clean and do not require knowledge of the internal file layout.

## What Is Exported

```typescript
import Root from "./tabs.svelte";
import Content from "./tabs-content.svelte";
import List from "./tabs-list.svelte";
import Trigger from "./tabs-trigger.svelte";
```

Four Svelte components are pulled in. Additionally, `tabs-list.svelte` exports two extra items: the `tabsListVariants` function (a `tailwind-variants` configuration object) and the `TabsListVariant` TypeScript type. Both are re-exported here.

## Dual Naming Strategy

Every component is exported under two names:

| Short name | Verbose name |
|------------|-------------|
| `Root` | `Tabs` |
| `Content` | `TabsContent` |
| `List` | `TabsList` |
| `Trigger` | `TabsTrigger` |

The short names (`Root`, `Content`, etc.) support the **namespace import pattern**:

```svelte
import * as Tabs from "$lib/components/ui/tabs";
<Tabs.Root> <Tabs.List> <Tabs.Trigger> <Tabs.Content />
```

The verbose names (`Tabs`, `TabsContent`, etc.) support **named import pattern** and map to shadcn-ui naming conventions, making it easier to migrate components from shadcn or follow its documentation:

```svelte
import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/components/ui/tabs";
```

Both styles are equally valid. The dual export prevents a naming conflict that would otherwise arise: `Root as Tabs` means the verbose export has the human-friendly name while the namespace import stays clean with `Root`.

## Variant Utilities

`tabsListVariants` and `TabsListVariant` are exported alongside the components. Exposing the variant function lets consumers compute class strings for custom tab list layouts without reimporting from the internal file. The TypeScript type export ensures consumers can write type-safe variant selectors:

```typescript
import { tabsListVariants, type TabsListVariant } from "$lib/components/ui/tabs";
const myVariant: TabsListVariant = "line";
```

## Why a Barrel File Matters

Without this index, every consumer would need to import from four separate file paths. More importantly, the internal file names are an implementation detail — if `tabs-list.svelte` were ever renamed or split, the public API could remain stable by updating only this index file. The barrel acts as an abstraction boundary.

## Known Gaps

The `tabs-content.svelte` is listed in the AST-extracted imports but the actual source only imports three of the four files in the AST note. All four are correctly re-exported in the source. No TODO or FIXME markers are present.