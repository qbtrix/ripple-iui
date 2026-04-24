---
{
  "title": "C4 Database Node — Cylinder-Shaped SvelteFlow Node for Storage Elements",
  "summary": "A SvelteFlow custom node that renders a C4 database container using a CSS-composed cylinder shape (SVG ellipse cap + rectangular body). Visually distinct from other node types with a purple color scheme, and includes URL-sanitized KB links.",
  "concepts": [
    "C4DatabaseNode",
    "cylinder shape",
    "SVG ellipse",
    "SvelteFlow custom node",
    "database",
    "purple",
    "safeKbUrl",
    "XSS prevention",
    "C4NodeData",
    "Handle",
    "db-cap-top",
    "db-body"
  ],
  "categories": [
    "widget",
    "diagram",
    "storage"
  ],
  "source_docs": [
    "5f8a5453f0b3726c"
  ],
  "backlinks": null,
  "word_count": 371,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`C4DatabaseNode.svelte` renders storage elements in C4 diagrams — relational databases, document stores, object storage, and similar infrastructure. It is registered as the `'database'` node type and is routed to by `getNodeType` when a `C4Container` has `type: 'database'`.

## Cylinder Visual Construction

The cylinder shape is a three-layer CSS/SVG composition:

1. **Top cap** (`db-cap-top`): An SVG `<ellipse>` stretched across the full node width using `preserveAspectRatio="none"`. The purple fill matches the body color, and a slightly lighter stroke defines the ellipse edge.
2. **Body** (`db-body`): A rectangular `<div>` with matching purple background that holds the text content.
3. **Bottom cap** (`db-cap-bottom`): A second SVG ellipse, slightly darker, to simulate the base of the cylinder.

This approach avoids complex CSS `clip-path` tricks and renders crisply at all zoom levels — important in a pan/zoom diagram where nodes may be viewed at 30% or 200%.

## Content Layout

Inside the cylinder body:
- **Type label**: "Database" in small uppercase
- **Name**: primary identifier (`data.name`)
- **Technology badge**: `[PostgreSQL]`, `[Redis]`, etc.
- **Description**: truncated at 50 characters
- **KB link**: sanitized docs link if available

## Click Handling

Unlike `C4ContainerNode` and `C4SystemNode`, `C4DatabaseNode` does **not** implement drill-down. Databases typically do not have navigable sub-levels in C4 diagrams. The `handleClick` only fires `data.onclick`, making it an informational node rather than a navigation point.

The `hasDrilldown` state is still derived (`$derived(data.drillable ?? false)`) but not used in the click handler — this appears to be defensive code anticipating a future where database nodes might optionally show schema or query views.

## Connection Handles

All four handle positions are present, consistent with other C4 nodes. Databases receive edges from many directions in complex diagrams (API writes, jobs read, backups export), so the full four-sided attachment surface is appropriate.

## XSS Defense

The KB link uses `safeKbUrl()` (added 2026-04-10), consistent with the URL sanitization pattern across all C4 nodes that render external links.

## Known Gaps

- `hasDrilldown` is derived but never used in click logic or the template — this is dead code that suggests an incomplete implementation for optional database drill-down.
- The cylinder cap SVG heights (28px) are fixed and may look disproportionate on nodes with long content that causes the body to grow taller.