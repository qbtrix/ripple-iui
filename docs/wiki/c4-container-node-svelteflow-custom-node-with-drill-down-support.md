---
{
  "title": "C4 Container Node — SvelteFlow Custom Node with Drill-Down Support",
  "summary": "A SvelteFlow custom node that renders a C4 Container element (API servers, databases, queues, etc.) as a blue-700 box with technology label. Supports drill-down navigation from Container to Component level, and includes URL-sanitized knowledge base links.",
  "concepts": [
    "C4ContainerNode",
    "drill-down",
    "SvelteFlow custom node",
    "hasDrilldown",
    "ondrilldown",
    "container level",
    "component level",
    "safeKbUrl",
    "XSS prevention",
    "C4NodeData",
    "technology badge",
    "Handle"
  ],
  "categories": [
    "widget",
    "diagram",
    "navigation"
  ],
  "source_docs": [
    "127094cc96ac5469"
  ],
  "backlinks": null,
  "word_count": 363,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4ContainerNode.svelte` renders a C4 Container — the middle tier of C4 architecture diagrams representing deployable units like web apps, APIs, databases, and message queues. It is registered as the `'container'` node type in `C4Diagram.svelte` and handles the interaction that lets users navigate from the Container view down to a Component view.

## Drill-Down Navigation

The component's most significant behavior is the drill-down click handler:

```typescript
const hasDrilldown = $derived(data.drillable ?? false);

function handleClick() {
  if (hasDrilldown && data.ondrilldown && data.element) {
    const nextLevel = data.diagramLevel === 'container' ? 'component' : 'code';
    data.ondrilldown(data.element, nextLevel);
  } else if (data.onclick && data.element) {
    data.onclick(data.element);
  }
}
```

The level progression logic is baked into the node itself: from `container` → `component`, and from anything else → `code`. This keeps the parent `C4Diagram.svelte` from needing to track which level each node is at — each node knows its own next step.

The `drillable` flag controls whether a drill-down indicator is shown. This allows containers without component-level data to be non-drillable, preventing dead-end navigation.

## Visual Content

- **Type label**: "Container" in small uppercase
- **Name**: primary label (`data.name`)
- **Technology badge**: `[FastAPI]`, `[PostgreSQL]`, etc.
- **Description**: truncated at 55 characters
- **KB link**: sanitized documentation link if `data.kb_article` is set
- **Drill indicator**: a small arrow icon when `hasDrilldown` is true

## Connection Handles

Four handles (Top/Left as targets, Bottom/Right as sources) give ELK flexibility for edge routing. Container diagrams often have bidirectional relationships (e.g., API ↔ Database), so all four attachment points are necessary.

## XSS Defense

The KB link URL is processed by `safeKbUrl()` (from `../url-sanitizer.js`), identical to the pattern in `C4ComponentNode`. Added 2026-04-10 to block `javascript:` and `data:` scheme injection through the `kb_article` field.

## Relationship to Other Nodes

`C4ContainerNode` sits between `C4SystemNode` (which drills into containers) and `C4ComponentNode` (which containers drill into). The three nodes form the navigable hierarchy of the C4 widget.

## Known Gaps

- The `nextLevel` fallback for non-`'container'` diagram levels defaults to `'code'`, which may not always be the right next step. A more explicit level-progression map would be safer.
- `safeKbUrl` is called twice per render (in `{#if}` and `href`), a minor redundancy shared with `C4ComponentNode`.