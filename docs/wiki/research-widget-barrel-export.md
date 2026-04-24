---
{
  "title": "Research Widget Barrel Export",
  "summary": "Central re-export index for all research-domain UI widgets in the Ripple library. Groups thirteen Svelte components under a single import path so consumers never depend on internal file layout.",
  "concepts": [
    "barrel export",
    "research widgets",
    "SourceCard",
    "Citation",
    "SourcesBar",
    "DiscoverCard",
    "FollowUp",
    "AnalystBar",
    "RangeBar",
    "KvTable",
    "Timeline",
    "Callout",
    "NewsCard",
    "tree-shaking",
    "public API"
  ],
  "categories": [
    "widget",
    "research",
    "exports"
  ],
  "source_docs": [
    "95abe48d52093e18"
  ],
  "backlinks": null,
  "word_count": 375,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `lib/widgets/research/index.ts` barrel file is the public surface of the research widget family. Instead of importing each component from its own deep path, consumers write a single import and destructure what they need:

```typescript
import { SourceCard, Citation, AnalystBar } from '$lib/widgets/research';
```

This pattern is intentional — it gives the library maintainers freedom to restructure internal folders without breaking call sites.

## Exported Components

The index surfaces thirteen components, each solving a distinct research-UI problem:

| Component | Role |
|-----------|------|
| `SourceCard` | Compact card linking to a named source with an accent color |
| `Citation` | Inline citation badge (source name + number) |
| `SourcesBar` | Horizontal bar listing all sources used in a response |
| `DiscoverCard` | Card with image and title for "explore more" recommendations |
| `FollowUp` | Input field for follow-up questions, bottom of a response |
| `CompanyHeader` | Name + logo header for company-focused research pockets |
| `Ticker` | Live or static stock ticker display |
| `KvTable` | Key-value table for structured facts |
| `Timeline` | Chronological event list |
| `Callout` | Highlighted block for important findings or warnings |
| `NewsCard` | Article card with headline, source badge, and link |
| `AnalystBar` | Bar visualization of analyst buy/hold/sell ratings |
| `RangeBar` | Visual range indicator (e.g. 52-week price range) |

## Why a Barrel?

Without this file, a pocket spec that uses five research widgets would need five separate deep-path imports. If any component moves, all consumers break. The barrel decouples the public API from the private file tree.

It also enables tree-shaking — bundlers that support ESM named exports can dead-code-eliminate any component not referenced at build time.

## Design Philosophy

The research family covers the full lifecycle of a research-style AI response: surface the sources (`SourceCard`, `Citation`, `SourcesBar`), present structured data (`KvTable`, `AnalystBar`, `RangeBar`, `Timeline`), give narrative context (`Callout`, `NewsCard`), and invite further engagement (`DiscoverCard`, `FollowUp`). Grouping them under one module path signals to consumers that they belong to a coherent semantic domain.

## Known Gaps

The index carries no version guard. If components are added or removed, there is no mechanism to communicate breaking changes to consumers beyond a changelog entry.