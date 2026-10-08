---
{
  "title": "C4 Widget Type Definitions — Data Model for All Four C4 Levels",
  "summary": "types.ts holds the C4 widget's data model: the element shapes for all four levels, relationships and the diagram, the live-state types (C4Kind, C4Status including planned, C4Marker), the semantic-zoom types (C4Code, C4PortView) and the C4NodeData payload each SvelteFlow node receives.",
  "concepts": [
    "C4 model",
    "C4Element",
    "C4Kind",
    "C4Status",
    "planned",
    "C4Marker",
    "C4Code",
    "C4PortView",
    "C4NodeData",
    "shape inference",
    "TypeScript types"
  ],
  "categories": [
    "types",
    "diagram",
    "data-model"
  ],
  "source_docs": [
    "62080188ecd11d79"
  ],
  "backlinks": null,
  "word_count": 494,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`types.ts` is the data model of the C4 widget. Everything a host passes in, and everything handed from `C4Diagram` to the node components, is typed here. Inside the package, import these types from `./types.js`, not the `c4` barrel: the barrel also exports a component named `C4Diagram`, and the data type is re-exported there as `C4DiagramData`.

## Elements

```typescript
type C4Element = C4Person | C4System | C4Container | C4Component;
```

| Type | Own fields |
|------|------------|
| `C4Person` | `description?`, `external?`, `tags?` |
| `C4System` | `technology?`, `external?`, `containers?: C4Container[]` |
| `C4Container` | `type?: 'webapp' \| 'api' \| 'database' \| 'queue' \| 'filesystem' \| 'mobile' \| 'desktop'`, `components?`, `kb_article?` |
| `C4Component` | `type?: 'service' \| 'controller' \| 'repository' \| 'model' \| 'middleware'`, `kb_article?` |

Every element also carries the shared base fields:

- `kind?: C4Kind` (`person | system | container | component | code`) sets the shape explicitly.
- `drillable?: boolean` shows the drill affordance and routes clicks to `ondrilldown`, even when the children are not in this diagram.
- `children?: C4Element[]` nests the next level down, any kind. `containers` and `components` count as children too.
- `code?: C4Code` is the excerpt an expanded code element shows in semantic zoom.

## Shape inference

With `kind`, the shape follows it (`code` draws as a component card labelled Code; `type: 'database' | 'queue'` still picks those shapes). Without `kind`, the shape is inferred from the fields present: an element with no `technology`, `type`, `containers` or `components` is a person; a non-empty `containers` makes a boundary; `type: 'database'` or `'queue'` picks those shapes; `components` makes a container; anything else is a system. A `type: 'person'` field is not read; use `kind`.

## Relationships and the diagram

`C4Relationship` is `{ from, to, label?, technology?, style?: 'sync' | 'async' | 'event' }`. `async` draws dashed and animated, `event` dashed in the warning tone. `C4Diagram` (exported as `C4DiagramData`) is `{ level, title, description?, elements, relationships }`; an empty `title` hides the header.

## Live and semantic types

- `C4Status`: `changing | changed | landed | drift | failed | planned`. `planned` marks a blueprint element that does not exist in code yet.
- `C4Marker`: `{ id, label, color }`, where `color` is any CSS colour or `var(--token)`.
- `C4Code`: `{ startLine, before: string[], after?, changed?: [first, last], language? }`. Line numbers are the file's own; `after` turns on the Before/After switch.
- `C4PortView`: `{ text, items }`, one aggregated connection as a port badge or scope chip shows it, with the relationships behind it for the hover list.

## C4NodeData

The payload on each SvelteFlow node's `data`: display fields (`name`, `description`, `technology`, `external`, `subtype`, `kind`, `kb_article`, `tags`), `drillable`, `diagramLevel`, the original `element`, the `onclick` / `ondrilldown` callbacks, and in semantic zoom `ports` (scope chips) and `code` (the panel excerpt). `LayoutNode` is an internal `{ id, x, y, width, height }` box.

## Known gaps

- `tags` is carried through but nothing filters or displays by it.
