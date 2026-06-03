---
{
  "title": "SourcesBar: Aggregated Sources Summary Bar with Copy and Share",
  "summary": "SourcesBar renders a compact row showing stacked source favicons and a count label alongside copy and share action buttons — serving as a persistent summary of all sources cited in a research response. It integrates with the Ripple event system to dispatch toast notifications and supports the Web Share API with clipboard fallback.",
  "concepts": [
    "sources bar",
    "stacked favicons",
    "source count",
    "Web Share API",
    "clipboard fallback",
    "toast notification",
    "EventDispatcher",
    "validSources filter",
    "overlapping icons",
    "source attribution summary"
  ],
  "categories": [
    "widget",
    "research",
    "citations",
    "event-system"
  ],
  "source_docs": [
    "7b5dcbb2b3b88053"
  ],
  "backlinks": null,
  "word_count": 532,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`SourcesBar` provides a birds-eye attribution summary. Where `SourceCard` and `Citation` surface individual sources, `SourcesBar` consolidates all sources into a single scannable row: "12 sources" with overlapping favicon thumbnails. It lives at the bottom of research responses as a persistent provenance indicator.

## Props

```svelte
interface Props {
  sources: SourceRef[];   // Required array
  count?: number;         // Override displayed count
  label?: string;         // default: 'sources'
  share?: boolean;        // default: true
  copy?: boolean;         // default: true
  class?: string;
  onclick?: (e?: unknown) => void;
}
```

## Source Filtering

```svelte
const validSources = $derived(sources.filter(s => s?.name));
```

The `validSources` derived filters out any source objects missing a `name`. AI-generated source arrays can include partially-constructed objects or `null` entries. Without this filter, the `faviconUrl(src.name)` call would receive `undefined`, which `faviconUrl` handles, but the favicon `<img>` would still render — potentially displaying a broken or generic icon for a nameless source.

## Stacked Favicons

```svelte
{#each validSources.slice(0, 4) as src, i}
  <img
    style="z-index:{4 - i}; margin-left:{i > 0 ? '-4px' : '0'}"
    src={src.favicon ?? faviconUrl(src.name)}
    ...
  />
{/each}
```

The bar shows a maximum of four favicons, stacked with a `-4px` negative left margin to create the overlapping cluster effect. `z-index` decrements with index so the first source is always on top — the most-recently listed (and presumably most-cited) source is visually prominent.

No `onerror` fallback is implemented on these images. A broken favicon in the cluster produces a small broken-image icon, which is less problematic in this aggregated context than in individual Citation or SourceCard usage.

## Copy Handler

```svelte
function handleCopy() {
  const text = sources.map(s => s.name + (s.url ? ` (${s.url})` : '')).join('\n');
  navigator.clipboard?.writeText(text);
  eventDispatcher?.dispatch(
    { action: 'toast', message: 'Sources copied', variant: 'success' },
    getCtx(), undefined
  );
}
```

The `?.` optional chaining on `navigator.clipboard` guards against environments where the Clipboard API is unavailable (insecure contexts, older browsers). The toast dispatch requires the event system context — if absent, the copy still happens silently with no user feedback.

## Share Handler with Fallback

```svelte
function handleShare() {
  const text = ...;
  if (navigator.share) {
    navigator.share({ text });
  } else {
    navigator.clipboard?.writeText(text);
    eventDispatcher?.dispatch({ action: 'toast', message: 'Link copied', ... });
  }
}
```

The Web Share API (`navigator.share`) is used when available — mobile browsers and some desktop browsers support native share sheets. When unavailable (most desktop browsers), it falls back to clipboard copy with a different toast message (`'Link copied'` vs `'Sources copied'`). The message distinguishes the two behaviors so users understand what happened.

## Count Override

```svelte
const displayCount = $derived(count ?? validSources.length);
```

The `count` override exists to handle cases where the total source count exceeds what is passed to the component (e.g. "42 sources" when only the top 10 are in the `sources` array). AI responses may know the total source count from metadata without passing every source object.

## Known Gaps

- No favicon error handling on stacked icons — broken images degrade without fallback.
- The `onclick` prop is wired to the container div but has no default behavior — it requires explicit handling by the parent. Unlike FollowUp or Citation which have default URL-open behavior, SourcesBar's container click does nothing unless the parent wires it up.