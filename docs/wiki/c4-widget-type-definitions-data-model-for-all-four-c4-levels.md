---
{
  "title": "C4 Widget Type Definitions — Data Model for All Four C4 Levels",
  "summary": "The TypeScript type definitions for the entire C4 widget subsystem, covering all four C4 hierarchy levels (Person, System, Container, Component), relationships, diagram spec, and the internal SvelteFlow node data payload. These types are the contract between diagram data authors and the rendering engine.",
  "concepts": [
    "C4Person",
    "C4System",
    "C4Container",
    "C4Component",
    "C4Relationship",
    "C4Element",
    "C4Diagram",
    "C4NodeData",
    "LayoutNode",
    "kb_article",
    "tags",
    "ContainerType",
    "ComponentType",
    "type union",
    "C4 model"
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
  "word_count": 490,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`types.ts` defines the shared data model for the C4 diagram widget. Every input the widget accepts and every piece of data passed between components flows through these interfaces. The 2026-04-07 update added `kb_article` and `tags` fields across element types to support documentation linking and filtering.

## Element Hierarchy

The C4 model has four element types forming a nested hierarchy:

```
C4Person          — human actors (no technology)
C4System          — top-level software systems
  └── C4Container — deployable units within a system
        └── C4Component — code-level modules within a container
```

All four are unified under the `C4Element` union type:

```typescript
export type C4Element = C4Person | C4System | C4Container | C4Component;
```

This union is used everywhere the layout engine and node type classifier receive arbitrary elements. Type narrowing is done via structural duck-typing (checking which fields exist) rather than a discriminant, because adding a `kind` field would be a breaking change to the data format.

## Interface Details

### `C4Person`
```typescript
{ id, name, description?, external?, tags? }
```
Minimal — no `technology` or `type`, which is how `getNodeType()` identifies persons.

### `C4System`
```typescript
{ id, name, description?, technology?, external?, containers?: C4Container[], tags? }
```
The presence of `containers` determines whether a system renders as a group box or a flat card.

### `C4Container`
```typescript
{ id, name, description?, technology?, type?: ContainerType, components?: C4Component[], kb_article?, tags? }
```
`type` is a discriminant union: `'webapp' | 'api' | 'database' | 'queue' | 'filesystem' | 'mobile' | 'desktop'`. The layout engine uses `type: 'database'` and `type: 'queue'` to select correct dimensions and node types.

### `C4Component`
```typescript
{ id, name, description?, technology?, type?: ComponentType, kb_article?, tags? }
```
`type` options: `'service' | 'controller' | 'repository' | 'model' | 'middleware'`. These map to the subtype label shown inside `C4ComponentNode`.

### `C4Relationship`
```typescript
{ from, to, label?, technology?, style?: 'sync' | 'async' | 'event' }
```
The `style` field hints at the nature of the interaction — synchronous call, async message, or event emission. Currently captured in data but not yet visually differentiated in edge rendering.

### `C4Diagram`
```typescript
{ level: 'context' | 'container' | 'component' | 'code', title, description?, elements, relationships }
```
The top-level input to `C4Diagram.svelte`. The `level` field controls which node types are visible and which drill-down paths are available.

### `C4NodeData`
The internal payload type passed into every SvelteFlow custom node component via `node.data`. It bridges the C4 data model with SvelteFlow's rendering layer, carrying:
- Display fields: `name`, `description`, `technology`, `subtype`, `external`
- Interaction fields: `onclick`, `ondrilldown`, `drillable`, `diagramLevel`
- Navigation field: `kb_article`
- Back-reference: `element` (the original `C4Element`)

## Known Gaps

- The `C4Relationship.style` field (`'sync' | 'async' | 'event'`) is defined but not yet used to render different edge styles (e.g., dashed for async, animated for event). This is a documented data capability without a matching visual implementation.
- `tags` is present on all element types but no filtering or display logic currently uses it.