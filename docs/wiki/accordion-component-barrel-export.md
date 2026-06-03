---
{
  "title": "Accordion Component Barrel Export",
  "summary": "The accordion `index.ts` barrel re-exports all four accordion sub-components — Root, Content, Item, and Trigger — under both short names and fully-qualified names, enabling two distinct import styles for the accordion compound component.",
  "concepts": [
    "accordion",
    "barrel export",
    "compound component",
    "namespace import",
    "named import",
    "Svelte",
    "TypeScript",
    "index.ts",
    "dual export pattern"
  ],
  "categories": [
    "widget",
    "layout"
  ],
  "source_docs": [
    "14e729a878c52b3e"
  ],
  "backlinks": null,
  "word_count": 406,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`accordion/index.ts` is the public API surface for the accordion compound component. It collects the four pieces — `accordion.svelte`, `accordion-content.svelte`, `accordion-item.svelte`, `accordion-trigger.svelte` — and exports them under aliased names.

## Dual Export Pattern

The barrel exports each component twice:

```typescript
export {
  Root,
  Content,
  Item,
  Trigger,
  //
  Root as Accordion,
  Content as AccordionContent,
  Item as AccordionItem,
  Trigger as AccordionTrigger,
};
```

This enables two consumption patterns:

**Namespace import (preferred for compound use):**
```svelte
import * as Accordion from '$lib/components/ui/accordion';
<Accordion.Root>...<Accordion.Item value="x">...</Accordion.Item></Accordion.Root>
```
The `Root`, `Content`, `Item`, `Trigger` names are clean and readable in this style.

**Named import (preferred for isolated use):**
```svelte
import { AccordionContent } from '$lib/components/ui/accordion';
```
The fully-qualified `Accordion*` names prevent naming collisions when multiple component families are imported in the same file.

## Why Both?

Neither pattern is universally superior. Namespace imports require the compound component to always be used as a group — if only `AccordionContent` is needed for a custom trigger layout, `import * as Accordion` imports unused exports. Fully-qualified named imports avoid this but are verbose when all four pieces are used together. Exporting both gives consumers freedom.

## File Extension Handling

Each import path uses `.svelte` extensions (`./accordion.svelte`, etc.) rather than extension-less imports. SvelteKit's Vite configuration resolves these correctly, and the explicit extensions prevent ambiguity between `.svelte` and `.ts` files that might share a base name.

## Maintenance Implications

Adding a new sub-component to the accordion (e.g., `accordion-description.svelte`) requires three steps:
1. Create the file
2. Import and alias it in this barrel
3. Export under both short and qualified names

Forgetting step 3 (adding only the short name) would break consumers who import the qualified name.

## Convention Across Ripple UI

The same barrel pattern is used for every compound component in Ripple's UI layer (alerts, dialogs, tabs, etc.). Each component directory has an `index.ts` that exports both short and qualified names. This consistency means developers can expect the same import pattern regardless of which component they are using, reducing cognitive overhead when switching between components.

The pattern also enables IDE tooling to provide consistent auto-import suggestions: when a developer types `Accordion`, the IDE can suggest the namespace import from `$lib/components/ui/accordion` reliably.

## Known Gaps

No type re-exports are present. If consumers need the prop types of individual accordion pieces (e.g., to write wrapper components), they must import types directly from the implementation files. Adding `export type { AccordionRootProps }` etc. would complete the public API.