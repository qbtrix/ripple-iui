---
title: Ripple Widget Manifest
date: 2026-05-02
status: design
---

# Ripple Widget Manifest

## Problem

The PocketPaw backend injects ripple widget knowledge into the agent's system prompt before pocket creation. Today this happens via `_get_ripple_widget_context()` in `backend/src/pocketpaw/api/v1/pockets.py:39`, which shells out to a `kb` binary that searches a pre-indexed `ripple` KB scope on the backend host.

This couples ripple releases to backend operations: every time ripple ships a new widget, someone has to re-index that scope on the backend host (or commit fresh wiki articles to the backend repo). New widgets are invisible to the LLM until that step happens. Backend deploys and ripple releases are on different cadences and owned by different concerns, so drift is the default state.

## Goal

Ripple owns and ships its own widget manifest. The backend fetches it at runtime. A ripple release is sufficient to make new widgets visible to the agent — no backend code change, no host-side re-indexing.

Non-goals:
- Replacing ripple's existing internal spec systems (UISpec, UniversalSpec). Those are for *runtime rendering*. The manifest is for *LLM authoring*.
- Versioning negotiation between consumer and ripple. v1 is a single shape, fetched from a pinned npm version.
- Serving the manifest from a server ripple operates. Ripple stays a publishable library.

## Approach

A build step in ripple walks the widget definitions and writes `dist/manifest.json`. The file is published with the npm package and reachable on jsDelivr at a stable URL per version. The backend fetches and caches it, and injects the result into the pocket-creation system prompt. The existing kb-scope fallback is retained for the cold-fetch failure case.

### Component 1: Per-widget manifest entries (ripple)

Each widget in `ripple/src/lib/widgets/` gets a co-located `*.manifest.ts` file that declares its LLM-facing surface area. This is hand-authored — props *types* could be inferred from Svelte component signatures, but the descriptions and example specs cannot, and a half-inferred manifest is worse than a fully authored one.

Shape per entry:

```ts
// ripple/src/lib/widgets/display/Metric.manifest.ts
import type { WidgetManifestEntry } from '$lib/manifest/types';

export const metricManifest: WidgetManifestEntry = {
  type: 'metric',
  category: 'display',
  description: 'Single KPI tile: large number with optional label, delta, and trend indicator.',
  props: {
    label: { type: 'string', required: true, description: 'Short metric name shown above the value.' },
    value: { type: 'string | number', required: true, description: 'The number or formatted string to display.' },
    delta: { type: 'string', required: false, description: 'Change indicator, e.g. "+12%" or "-3".' },
    trend: { type: '"up" | "down" | "flat"', required: false, description: 'Direction arrow color/icon.' },
  },
  example: {
    type: 'metric',
    props: { label: 'MRR', value: '$48.2k', delta: '+8.1%', trend: 'up' },
  },
};
```

Constraints:
- `description` is one line, < 200 chars. Long-form docs stay in the wiki; the manifest is for in-prompt scanning.
- `example` is a runnable UISpec node — the LLM can lift it as a starting point.
- No nested widget docs. If a widget composes others (e.g. a `dashboard` containing `metric`s), the manifest just lists the container; composition is the LLM's job.

### Component 2: Manifest aggregator + build step (ripple)

A new module `ripple/src/lib/manifest/index.ts` re-exports every per-widget manifest and exposes a `buildManifest()` function returning the full document:

```ts
{
  version: '1.4.2',           // ripple package.json version
  generatedAt: '2026-05-02T…', // ISO timestamp
  schema: 'ripple.manifest/v1',
  widgets: [ /* WidgetManifestEntry[] */ ],
}
```

A build script `scripts/build-manifest.ts` runs `buildManifest()` and writes `dist/manifest.json`. It's wired into ripple's existing `build` script so `bun run build` produces the manifest alongside the library.

A unit test (`manifest.test.ts`) asserts that every widget registered in `src/lib/widgets/index.ts` has a corresponding manifest entry. This is the only thing that prevents drift between the registry and the manifest, so it must exist before this is shipped.

### Component 3: Manifest fetcher (backend)

A new module `backend/src/pocketpaw/ripple/manifest.py` is the single entry point for fetching and caching the manifest. Two functions:

```python
async def get_manifest() -> dict | None:
    """Returns the parsed manifest, or None on failure. Caches in-process for 24h."""

async def format_for_prompt(manifest: dict) -> str:
    """Renders the manifest as a markdown block suitable for system-prompt injection."""
```

Implementation:
- Source URL is `POCKETPAW_RIPPLE_MANIFEST_URL`, defaulting to `https://cdn.jsdelivr.net/npm/@ripple-ui/svelte@latest/dist/manifest.json`. Prod pins a version (`@1.4.2/...`); dev floats on `@latest`.
- 24h in-process cache keyed by URL. Cache is a module-global `dict[str, tuple[float, dict]]`. No file persistence — cold-start cost is one fetch.
- 5s fetch timeout (vs the current 3s for kb search; remote fetch needs a touch more headroom).
- On any failure (network, parse, schema), return `None`. Caller falls back.
- No retries inside the fetcher. If the first call fails, the next caller within the TTL gets `None` from cache; we don't want a slow-thrash of retries on every pocket creation.

### Component 4: Replacing the injection site (backend)

`_get_ripple_widget_context()` in `backend/src/pocketpaw/api/v1/pockets.py:39` becomes a thin orchestrator:

```
1. Try get_manifest() + format_for_prompt() — return that block if non-empty.
2. Fall back to the existing kb search path (unchanged) — return that if non-empty.
3. Return "".
```

Both branches keep the same `<ripple-widget-reference>...</ripple-widget-reference>` envelope so the rest of the prompt-building code is untouched. We do not pass the user's message to the manifest path — the v1 design injects all widgets, no relevance filter.

If filtering becomes necessary later (manifest grows past ~10k tokens), the right move is to trim individual entries, not to add a selector — the cost of "the LLM picked the wrong widget because filter scored badly" is harder to debug than the cost of an extra few hundred tokens.

## Data flow

```
ripple build → dist/manifest.json → npm publish
                    │
                    ▼
        jsDelivr CDN (versioned URL)
                    │
                    │ HTTP GET (cached 24h, 5s timeout)
                    ▼
backend manifest.py → format_for_prompt() → system prompt block
                    │ (on failure)
                    ▼
        kb search ripple scope (existing fallback)
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `POCKETPAW_RIPPLE_MANIFEST_URL` | `https://cdn.jsdelivr.net/npm/@ripple-ui/svelte@latest/dist/manifest.json` | Override for pinning a specific ripple version in prod or pointing at a staging build. |
| `POCKETPAW_RIPPLE_MANIFEST_TTL_SECONDS` | `86400` | In-process cache TTL. Lower in dev if iterating on the manifest itself. |

No backend deploy is required to upgrade ripple — bumping the URL's version pin (or letting `@latest` track) is sufficient.

## Error handling

- **Fetch fails (network, 4xx, 5xx, timeout):** log at warning, return `None` from `get_manifest()`, caller falls back to kb search.
- **JSON parse fails:** log at error (this means a corrupted or non-manifest URL — operator concern), return `None`, fall back.
- **Manifest schema mismatch (wrong `schema` field, missing `widgets` array):** log at error, return `None`, fall back. We do not attempt partial parses.
- **Empty `widgets` array:** treat as success but inject nothing. Caller falls back to kb search since the formatted block is empty.

The kb fallback already swallows its own errors and returns `""`. So in the worst case (manifest fetch fails AND kb fails) the agent gets no widget context — same as today.

## Testing

Ripple side:
- Unit test asserting every widget in `widgets/index.ts` registry has a manifest entry. **This is the drift guard and is non-negotiable.**
- Snapshot test on `buildManifest()` output shape (catches accidental schema changes).

Backend side:
- Unit test for `manifest.py` covering: fresh fetch, cache hit, cache expiry, fetch timeout, fetch 4xx, malformed JSON, schema mismatch, empty widgets array.
- Integration test for the updated `_get_ripple_widget_context` covering: manifest path succeeds → manifest output returned, manifest path fails → kb fallback hit, both fail → `""`.
- Mock the HTTP fetch — no live CDN calls in tests.

## Risks and mitigations

- **Manifest drift from actual widget code.** Drift guard test (Component 2) asserts registry ↔ manifest parity. CI fails if a widget is registered without a manifest entry.
- **CDN availability.** jsDelivr has very high availability, but the kb fallback exists for the long tail. If jsDelivr becomes a problem, swap the default URL to unpkg without code changes.
- **Stale cache during ripple release.** 24h TTL means a freshly-deployed ripple version isn't visible to the agent for up to a day. Acceptable for v1; if it becomes painful, add a `POCKETPAW_RIPPLE_MANIFEST_TTL_SECONDS=0` for dev or expose a manual cache-bust endpoint. Don't pre-build either of those.
- **Token cost of injecting all widgets.** ~30 widgets × ~150 tokens = ~5k tokens per pocket-creation request. Measurable but small relative to the rest of the prompt. Revisit if the widget count or per-entry size grows materially.

## Out of scope (deliberate)

- Tooling for non-pocket consumers (paw-enterprise, others) to fetch the manifest. The URL is public; if another consumer wants it later, they read this spec and add a fetcher. No shared client library yet — premature.
- A versioned schema (`ripple.manifest/v2`). v1 ships, future shape changes get a new schema field and a one-time backend update.
- Serving the manifest from a ripple-operated server. Static JSON on a CDN handles every requirement v1 has.
