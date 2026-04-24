---
{
  "title": "C4 Component Node — SvelteFlow Custom Node for Service Components",
  "summary": "A SvelteFlow custom node that renders a C4 Component element as a compact blue box with a four-square icon, subtype label, technology badge, and optional knowledge base link. URL sanitization prevents XSS via `javascript:` or `data:` scheme injection in the KB link.",
  "concepts": [
    "C4ComponentNode",
    "SvelteFlow custom node",
    "kb_article",
    "safeKbUrl",
    "XSS prevention",
    "URL sanitization",
    "component level",
    "C4NodeData",
    "Handle",
    "stopPropagation",
    "technology badge",
    "drill-down"
  ],
  "categories": [
    "widget",
    "diagram",
    "security"
  ],
  "source_docs": [
    "f652039c9fef2759"
  ],
  "backlinks": null,
  "word_count": 384,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4ComponentNode.svelte` renders the lowest-level architectural element in the C4 model — a component within a container (e.g., an Auth Service, a Repository layer, a Controller). It sits at the Component level of C4 drill-down and is registered as the `'component'` node type in `C4Diagram.svelte`.

## Visual Design

The node uses a compact blue-500 color scheme to visually distinguish it from Container nodes (blue-700) and System nodes. A four-square SVG icon in the corner signals "this is a component" at a glance, echoing the UML component notation.

Content displayed:
- **Subtype label**: `data.subtype` capitalized (e.g., "Service", "Controller") or fallback "Component"
- **Name**: `data.name` as the primary label
- **Technology badge**: `[Python]`, `[FastAPI]`, etc. in brackets
- **Description**: truncated at 50 characters with an ellipsis to keep nodes compact
- **KB link**: an icon-link to internal documentation if `data.kb_article` is set

## Connection Handles

Four SvelteFlow `Handle` elements are placed on all four sides (Top/Left as targets, Bottom/Right as sources). This gives ELK full flexibility to route edges from any direction, which is important because component diagrams can have complex relationships between co-located components.

## XSS Defense — URL Sanitization

Added 2026-04-10: the KB link href is wrapped in `safeKbUrl(data.kb_article)` from `../url-sanitizer.js`. Without this, an attacker who controls `kb_article` data (e.g., through a compromised diagram spec) could inject `javascript:alert(1)` or `data:text/html,...` as the href. Browsers execute `javascript:` URLs on click, making this a stored XSS vector.

```svelte
{#if safeKbUrl(data.kb_article)}
  <a href={safeKbUrl(data.kb_article)} target="_blank" rel="noopener noreferrer">
    Docs
  </a>
{/if}
```

The `safeKbUrl` function returns `null` or `undefined` for unsafe schemes, and the `{#if}` block suppresses the link entirely rather than rendering a broken or dangerous anchor.

## Click Handling

Clicks delegate to `data.onclick(data.element)` if both are present. The guard prevents a null-reference error if the node is rendered without a click handler (e.g., in a static export).

The KB link calls `e.stopPropagation()` to prevent the outer `onclick` from firing when a user clicks Docs — otherwise both the element selection and the navigation would trigger simultaneously.

## Known Gaps

- `safeKbUrl` is called twice per render (once in `{#if}`, once in `href`). A local variable would be cleaner but this is a minor inefficiency.
- The description truncation at 50 characters is hardcoded. A future enhancement could make this configurable or use CSS `text-overflow: ellipsis` instead.