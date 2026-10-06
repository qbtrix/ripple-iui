---
{
  "title": "Test Suite for C4 ELK Layout Utilities",
  "summary": "The C4 widget's tests: pure suites for layout, the live layer and semantic zoom, and mount suites that render the real C4Diagram in jsdom for live props and semantic zoom.",
  "concepts": [
    "vitest",
    "testing",
    "ELK layout",
    "live layer",
    "semantic zoom",
    "planned status",
    "jsdom",
    "SvelteFlow"
  ],
  "categories": [
    "test",
    "layout",
    "diagram"
  ],
  "source_docs": [
    "41e55445b4648a74"
  ],
  "backlinks": null,
  "word_count": 259,
  "compiled_at": "2026-10-06T08:10:24Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The C4 widget's tests live in `widgets/c4/__tests__/` and run in the `client` vitest project:

```bash
cd packages/svelte
bunx vitest run src/lib/widgets/c4 --project client
```

## Pure suites (no DOM)

- `c4-layout.test.ts`: `getNodeType`, `isGroupNode` and `computeElkLayout` across persons, systems with and without containers, databases, queues, components and empty diagrams.
- `c4-live.test.ts`: explicit `kind`, `decorateNodes` (status attribute, controlled selection, untouched nodes kept by identity), the legend's status order and labels (including `planned`, listed last), `planCamera`, ELK edge routes and the rounded path drawn through them.
- `c4-semantic.test.ts`: what an `expanded` set draws, relationship lifting with counts, port badges and scope chips, ghosting, marker roll-up, what a code panel shows, and async/event dashes kept on semantic edges.

## Mount suites

- `c4-diagram-live.test.ts`: mounts `C4Diagram` (SvelteFlow + ELK) and checks status rings on the node wrappers, the status legend (the `planned` entry with its dashed swatch), marker dots, controlled selection, the zoom-button report, kind labels, and an untouched legacy render. It also clicks and presses Enter and Space on every node type (person, system, boundary, container, database, queue, component, code) on three diagram levels and asserts the same callbacks fire.
- `c4-diagram-semantic.test.ts`: boundaries nest in place, the scope ghosts its outside, a code panel shows real line numbers with its change tinted, the Before/After switch, scope chips, marker roll-up, `planned` and the scope ghost on the same node, and keyboard/click parity for every drawn node.

Each mount case runs ELK in jsdom, so these suites carry a 30s timeout. On a loaded machine run them one file at a time (`--no-file-parallelism`).
