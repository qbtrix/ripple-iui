---
{
  "title": "C4 Widget Public API Barrel — Exports for Component, Types, and Layout",
  "summary": "widgets/c4/index.ts is the C4 widget's public surface: the C4Diagram component, three layout helpers, and the data, live-state and semantic-zoom types. The widgets barrel re-exports the component and the data types for hosts.",
  "concepts": [
    "barrel exports",
    "public API",
    "C4Diagram",
    "C4DiagramData",
    "name collision",
    "C4Status",
    "C4Code",
    "widgets barrel"
  ],
  "categories": [
    "module",
    "widget",
    "diagram"
  ],
  "source_docs": [
    "37396c86a22fe1b2"
  ],
  "backlinks": null,
  "word_count": 237,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/widgets/c4/index.ts` is what the rest of Ripple, and hosts, import from. Internal files (`live.ts`, `semantic.ts`, `semantic-flow.ts`, the node components) stay private.

## Exports

```typescript
export { default as C4Diagram } from './C4Diagram.svelte';
export { computeElkLayout, getNodeType, isGroupNode } from './elk-layout.js';
export type {
  C4Kind, C4Status, C4Marker, C4Code, C4PortView,
  C4Person, C4System, C4Container, C4Component,
  C4Relationship, C4Element,
  C4Diagram as C4DiagramData,
  C4NodeData, LayoutNode,
} from './types.js';
```

The layout helpers let a caller or a test compute positions and node types without mounting the component.

## From a host

`@ripple-ui/svelte/widgets` exports `C4Diagram` and the data types a host needs to build a diagram: `C4DiagramData`, `C4Element`, `C4Person`, `C4System`, `C4Container`, `C4Component`, `C4Relationship`, `C4Kind`, `C4Status`, `C4Marker`, `C4Code` and `C4PortView`. In a JSON spec the widget type is `c4`; its props are listed in the manifest entry `manifest/entries/c4.ts`.

```typescript
import { C4Diagram, type C4DiagramData, type C4Status } from '@ripple-ui/svelte/widgets';
```

## The name collision

The component and the data interface are both called `C4Diagram`, so the barrel exports the data type as `C4DiagramData`. Inside the package, import data types from `./types.js`: importing `C4Diagram` as a type from the barrel resolves to the component, and svelte-package would emit a `.d.ts` where the two names clash. `C4Diagram.svelte` itself imports the type aliased for the same reason.

## Known gaps

- `C4Status` is a closed union. A host that keeps a `Record<C4Status, ...>` must add an entry whenever a status is added (`planned` is the latest).
