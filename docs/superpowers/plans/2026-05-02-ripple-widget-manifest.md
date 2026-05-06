# Ripple Widget Manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a build-time-generated `dist/manifest.json` from ripple and consume it from the PocketPaw backend, replacing the local `kb search` widget-context injection with a CDN-backed fetch.

**Architecture:** Per-widget manifest entries in ripple are aggregated into `dist/manifest.json` by a build script that runs as part of `bun run build`. The backend fetches this manifest from jsDelivr (configurable URL), caches it in-process for 24h, formats it as a markdown block, and injects it into the pocket-creation system prompt. The existing `kb search` path remains as the failure-mode fallback.

**Tech Stack:** TypeScript, Svelte 5, Vitest (ripple side); Python 3.11+, httpx, pytest-asyncio (backend side).

---

## File Structure

**Ripple — new files:**
- `src/lib/manifest/index.ts` — types (`WidgetManifestEntry`, `WidgetManifest`), `buildManifest()` aggregator, all manifest entry imports.
- `src/lib/manifest/entries/metric.ts` — seed manifest entry for `metric`.
- `src/lib/manifest/entries/text.ts` — seed manifest entry for `text`.
- `src/lib/manifest/entries/heading.ts` — seed manifest entry for `heading`.
- `src/lib/manifest/entries/flex.ts` — seed manifest entry for `flex`.
- `src/lib/manifest/entries/grid.ts` — seed manifest entry for `grid`.
- `src/lib/manifest/manifest.test.ts` — drift guard + shape tests.
- `scripts/build-manifest.ts` — node script that calls `buildManifest()` and writes `dist/manifest.json`.

**Ripple — modified files:**
- `package.json` — extend the `build` script to invoke `scripts/build-manifest.ts` after `svelte-package`.

**Backend — new files:**
- `backend/ee/ripple/manifest.py` — `get_manifest()` fetcher with TTL cache, `format_for_prompt()` renderer.
- `backend/tests/test_ripple_manifest.py` — unit tests for the fetcher, formatter, and orchestrator.

**Backend — modified files:**
- `backend/src/pocketpaw/config.py` — add `ripple_manifest_url` and `ripple_manifest_ttl_seconds` settings (env-prefixed).
- `backend/src/pocketpaw/api/v1/pockets.py:39-92` — rename existing `_get_ripple_widget_context()` to `_get_ripple_widget_context_via_kb()` (body unchanged), add new manifest-fetcher helper, and a thin orchestrator under the original name.

---

## Phase 1: Ripple Manifest Infrastructure

### Task 1: Define manifest types and aggregator skeleton

**Files:**
- Create: `ripple/src/lib/manifest/index.ts`

- [ ] **Step 1: Create the types and a `buildManifest()` skeleton that throws when no entries are registered**

```ts
// ripple/src/lib/manifest/index.ts
// Build-time-generated manifest of every Ripple widget the LLM should know
// about. Aggregated into dist/manifest.json by scripts/build-manifest.ts.

import pkg from '../../../package.json' with { type: 'json' };

export interface WidgetPropSpec {
  type: string;
  required: boolean;
  description: string;
}

export interface WidgetManifestEntry {
  /** Canonical widget type as registered in `widgets/index.ts`. */
  type: string;
  /** Top-level grouping — display | layout | input | data | control | composite | overlay | research | vertical. */
  category: string;
  /** One-line summary, < 200 chars. Long docs stay in the wiki. */
  description: string;
  /** Prop name → spec. Only LLM-relevant props; internal/passthrough props omitted. */
  props: Record<string, WidgetPropSpec>;
  /** A runnable UISpec node the LLM can lift as a starting point. */
  example: { type: string; props: Record<string, unknown>; children?: unknown };
}

export interface WidgetManifest {
  schema: 'ripple.manifest/v1';
  version: string;
  generatedAt: string;
  widgets: WidgetManifestEntry[];
}

export const manifestEntries: WidgetManifestEntry[] = [];

export function buildManifest(): WidgetManifest {
  if (manifestEntries.length === 0) {
    throw new Error('No manifest entries registered');
  }
  return {
    schema: 'ripple.manifest/v1',
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    widgets: manifestEntries,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `cd ripple && bun run check`
Expected: PASS — no errors. (TS resolves the `package.json` import via `with { type: 'json' }`.)

- [ ] **Step 3: Commit**

```bash
git add ripple/src/lib/manifest/index.ts
git commit -m "feat(ripple): add widget manifest types and aggregator skeleton"
```

---

### Task 2: Add the drift-guard test (failing)

**Files:**
- Create: `ripple/src/lib/manifest/manifest.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// ripple/src/lib/manifest/manifest.test.ts
import { describe, expect, it } from 'vitest';
import { manifestEntries, buildManifest } from './index.js';
import { getWidgetTypes } from '../widgets/index.js';

describe('widget manifest', () => {
  it('has at least one entry registered', () => {
    expect(manifestEntries.length).toBeGreaterThan(0);
  });

  it('every entry references a real widget type (no ghosts)', () => {
    const knownTypes = new Set(getWidgetTypes());
    const ghosts = manifestEntries
      .map((e) => e.type)
      .filter((t) => !knownTypes.has(t));
    expect(ghosts).toEqual([]);
  });

  it('every entry has a non-empty description under 200 chars', () => {
    for (const entry of manifestEntries) {
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeLessThan(200);
    }
  });

  it('every entry has a runnable example with matching type', () => {
    for (const entry of manifestEntries) {
      expect(entry.example.type).toBe(entry.type);
    }
  });

  it('buildManifest produces a v1 document', () => {
    const m = buildManifest();
    expect(m.schema).toBe('ripple.manifest/v1');
    expect(m.version).toBeTruthy();
    expect(m.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(m.widgets.length).toBe(manifestEntries.length);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run: `cd ripple && bun run test -- src/lib/manifest/manifest.test.ts`
Expected: FAIL on "has at least one entry registered" and "buildManifest produces a v1 document" (the latter throws because `manifestEntries.length === 0`).

- [ ] **Step 3: Commit (red commit)**

```bash
git add ripple/src/lib/manifest/manifest.test.ts
git commit -m "test(ripple): add manifest drift guard (failing)"
```

---

### Task 3: Add seed manifest entry for `metric`

**Files:**
- Create: `ripple/src/lib/manifest/entries/metric.ts`
- Modify: `ripple/src/lib/manifest/index.ts` (push the entry into `manifestEntries`)

- [ ] **Step 1: Write the entry file**

```ts
// ripple/src/lib/manifest/entries/metric.ts
import type { WidgetManifestEntry } from '../index.js';

export const metricEntry: WidgetManifestEntry = {
  type: 'metric',
  category: 'display',
  description:
    'Single KPI tile: large value with optional label, delta, and trend indicator.',
  props: {
    label: { type: 'string', required: false, description: 'Short metric name shown above the value.' },
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

- [ ] **Step 2: Register the entry in the aggregator**

Edit `ripple/src/lib/manifest/index.ts`. Replace `export const manifestEntries: WidgetManifestEntry[] = [];` with:

```ts
import { metricEntry } from './entries/metric.js';

export const manifestEntries: WidgetManifestEntry[] = [
  metricEntry,
];
```

- [ ] **Step 3: Run the test — confirm it now passes**

Run: `cd ripple && bun run test -- src/lib/manifest/manifest.test.ts`
Expected: PASS — all 5 cases green.

- [ ] **Step 4: Commit**

```bash
git add ripple/src/lib/manifest/entries/metric.ts ripple/src/lib/manifest/index.ts
git commit -m "feat(ripple): seed manifest with metric entry"
```

---

### Task 4: Add seed entries for `text`, `heading`, `flex`, `grid`

**Files:**
- Create: `ripple/src/lib/manifest/entries/text.ts`
- Create: `ripple/src/lib/manifest/entries/heading.ts`
- Create: `ripple/src/lib/manifest/entries/flex.ts`
- Create: `ripple/src/lib/manifest/entries/grid.ts`
- Modify: `ripple/src/lib/manifest/index.ts`

- [ ] **Step 1: Write `text.ts`**

```ts
// ripple/src/lib/manifest/entries/text.ts
import type { WidgetManifestEntry } from '../index.js';

export const textEntry: WidgetManifestEntry = {
  type: 'text',
  category: 'display',
  description: 'Inline text or paragraph. Use for prose, labels, captions, descriptions.',
  props: {
    content: { type: 'string', required: true, description: 'The text to display. Supports {state.path} expressions.' },
    variant: { type: '"body" | "muted" | "caption"', required: false, description: 'Visual style. Defaults to body.' },
  },
  example: { type: 'text', props: { content: 'Total revenue this quarter.', variant: 'muted' } },
};
```

- [ ] **Step 2: Write `heading.ts`**

```ts
// ripple/src/lib/manifest/entries/heading.ts
import type { WidgetManifestEntry } from '../index.js';

export const headingEntry: WidgetManifestEntry = {
  type: 'heading',
  category: 'display',
  description: 'Section title at h1-h6 levels. Use for page titles and section headers.',
  props: {
    text: { type: 'string', required: true, description: 'The heading text.' },
    level: { type: '1 | 2 | 3 | 4 | 5 | 6', required: false, description: 'Heading level. Defaults to 2.' },
  },
  example: { type: 'heading', props: { text: 'Q2 Performance', level: 2 } },
};
```

- [ ] **Step 3: Write `flex.ts`**

```ts
// ripple/src/lib/manifest/entries/flex.ts
import type { WidgetManifestEntry } from '../index.js';

export const flexEntry: WidgetManifestEntry = {
  type: 'flex',
  category: 'layout',
  description: 'Flexbox container. Lays children in a row or column with gap and alignment control.',
  props: {
    direction: { type: '"row" | "column"', required: false, description: 'Main axis. Defaults to row.' },
    gap: { type: 'number', required: false, description: 'Gap between children in tailwind spacing units (1=4px).' },
    align: { type: '"start" | "center" | "end" | "stretch"', required: false, description: 'Cross-axis alignment.' },
    justify: { type: '"start" | "center" | "end" | "between" | "around"', required: false, description: 'Main-axis distribution.' },
    wrap: { type: 'boolean', required: false, description: 'Allow children to wrap to next line.' },
  },
  example: {
    type: 'flex',
    props: { direction: 'row', gap: 4, justify: 'between' },
    children: [
      { type: 'text', props: { content: 'Left' } },
      { type: 'text', props: { content: 'Right' } },
    ],
  },
};
```

- [ ] **Step 4: Write `grid.ts`**

```ts
// ripple/src/lib/manifest/entries/grid.ts
import type { WidgetManifestEntry } from '../index.js';

export const gridEntry: WidgetManifestEntry = {
  type: 'grid',
  category: 'layout',
  description: 'CSS grid container. Lays children in evenly-sized columns. Best for KPI rows and card grids.',
  props: {
    cols: { type: 'number', required: false, description: 'Number of columns. Defaults to 2.' },
    gap: { type: 'number', required: false, description: 'Gap between cells in tailwind spacing units.' },
  },
  example: {
    type: 'grid',
    props: { cols: 3, gap: 4 },
    children: [
      { type: 'metric', props: { label: 'Users', value: 1240 } },
      { type: 'metric', props: { label: 'MRR', value: '$48k' } },
      { type: 'metric', props: { label: 'Churn', value: '2.1%' } },
    ],
  },
};
```

- [ ] **Step 5: Register the new entries**

Edit `ripple/src/lib/manifest/index.ts`. Replace the current import + array with:

```ts
import { metricEntry } from './entries/metric.js';
import { textEntry } from './entries/text.js';
import { headingEntry } from './entries/heading.js';
import { flexEntry } from './entries/flex.js';
import { gridEntry } from './entries/grid.js';

export const manifestEntries: WidgetManifestEntry[] = [
  metricEntry,
  textEntry,
  headingEntry,
  flexEntry,
  gridEntry,
];
```

- [ ] **Step 6: Run the test — confirm still green**

Run: `cd ripple && bun run test -- src/lib/manifest/manifest.test.ts`
Expected: PASS — 5 entries, all checks green.

- [ ] **Step 7: Commit**

```bash
git add ripple/src/lib/manifest/entries/ ripple/src/lib/manifest/index.ts
git commit -m "feat(ripple): seed manifest with text, heading, flex, grid"
```

---

### Task 5: Build script that writes `dist/manifest.json`

**Files:**
- Create: `ripple/scripts/build-manifest.ts`
- Modify: `ripple/package.json`

- [ ] **Step 1: Write the build script**

```ts
// ripple/scripts/build-manifest.ts
// Run after `svelte-package` to emit dist/manifest.json alongside the library.
// Invoked from the `build` npm script.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from '../src/lib/manifest/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../dist/manifest.json');

mkdirSync(dirname(outPath), { recursive: true });
const manifest = buildManifest();
writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf-8');

console.log(`✓ wrote ${outPath} (${manifest.widgets.length} widgets, v${manifest.version})`);
```

- [ ] **Step 2: Wire into package.json**

Edit `ripple/package.json`. Change line 34 from:

```json
    "build": "svelte-package",
```

to:

```json
    "build": "svelte-package && bun run scripts/build-manifest.ts",
    "build:manifest": "bun run scripts/build-manifest.ts",
```

- [ ] **Step 3: Run the build and verify the file exists**

Run: `cd ripple && bun run build`
Expected: build succeeds, last line is `✓ wrote .../dist/manifest.json (5 widgets, v0.2.0)`. Verify by reading `ripple/dist/manifest.json` — first lines should show the schema/version/widgets keys.

- [ ] **Step 4: Confirm `dist/manifest.json` is published with the npm package**

Open `ripple/package.json`. The `"files": ["dist", "!dist/**/*.test.*"]` block already includes `dist`, so `dist/manifest.json` ships with the npm package. No change needed — confirm by reading the file.

- [ ] **Step 5: Commit**

```bash
git add ripple/scripts/build-manifest.ts ripple/package.json
git commit -m "build(ripple): emit dist/manifest.json from buildManifest()"
```

---

## Phase 2: Backend Manifest Consumer

### Task 6: Add config settings for manifest URL and TTL

**Files:**
- Modify: `backend/src/pocketpaw/config.py`

- [ ] **Step 1: Locate where to add fields**

Run: `grep -n "kb_binary\|kb_scope" backend/src/pocketpaw/config.py | head -5`
Expected: a few lines showing where existing kb-related settings live. Add the new fields next to those for thematic grouping.

- [ ] **Step 2: Add the two settings**

In `backend/src/pocketpaw/config.py`, near the existing `kb_*` settings, add:

```python
    ripple_manifest_url: str = (
        "https://cdn.jsdelivr.net/npm/@ripple-ui/svelte@latest/dist/manifest.json"
    )
    ripple_manifest_ttl_seconds: int = 86400
```

- [ ] **Step 3: Verify env vars resolve**

Run: `cd backend && uv run python -c "from pocketpaw.config import get_settings; s = get_settings(); print(s.ripple_manifest_url, s.ripple_manifest_ttl_seconds)"`
Expected: prints the default URL and `86400`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/pocketpaw/config.py
git commit -m "feat(config): add ripple manifest url and ttl settings"
```

---

### Task 7: Manifest fetcher — write the failing tests

**Files:**
- Create: `backend/tests/test_ripple_manifest.py`

- [ ] **Step 1: Write the test file**

```python
# backend/tests/test_ripple_manifest.py
"""Tests for ee.ripple.manifest — fetcher, cache, formatter, fallback."""

from __future__ import annotations

import httpx
import pytest


pytestmark = pytest.mark.asyncio


VALID_MANIFEST = {
    "schema": "ripple.manifest/v1",
    "version": "0.2.0",
    "generatedAt": "2026-05-02T00:00:00.000Z",
    "widgets": [
        {
            "type": "metric",
            "category": "display",
            "description": "KPI tile.",
            "props": {
                "label": {"type": "string", "required": False, "description": "Label."},
                "value": {"type": "string | number", "required": True, "description": "Value."},
            },
            "example": {"type": "metric", "props": {"label": "MRR", "value": "$48k"}},
        }
    ],
}


@pytest.fixture(autouse=True)
def _clear_manifest_cache():
    from ee.ripple import manifest as m

    m._cache.clear()
    yield
    m._cache.clear()


async def test_fetch_success(monkeypatch):
    from ee.ripple import manifest as m

    async def fake_get(self, url, timeout):
        return httpx.Response(200, json=VALID_MANIFEST, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await m.get_manifest("https://example/manifest.json", ttl_seconds=60)
    assert result is not None
    assert result["schema"] == "ripple.manifest/v1"
    assert len(result["widgets"]) == 1


async def test_cache_hit_avoids_second_fetch(monkeypatch):
    from ee.ripple import manifest as m

    calls = {"n": 0}

    async def fake_get(self, url, timeout):
        calls["n"] += 1
        return httpx.Response(200, json=VALID_MANIFEST, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    await m.get_manifest("https://example/manifest.json", ttl_seconds=60)
    await m.get_manifest("https://example/manifest.json", ttl_seconds=60)
    assert calls["n"] == 1


async def test_cache_expiry_triggers_refetch(monkeypatch):
    from ee.ripple import manifest as m

    calls = {"n": 0}

    async def fake_get(self, url, timeout):
        calls["n"] += 1
        return httpx.Response(200, json=VALID_MANIFEST, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    await m.get_manifest("https://example/manifest.json", ttl_seconds=0)
    # ttl=0 means every call is expired — second call refetches
    await m.get_manifest("https://example/manifest.json", ttl_seconds=0)
    assert calls["n"] == 2


async def test_fetch_timeout_returns_none(monkeypatch):
    from ee.ripple import manifest as m

    async def fake_get(self, url, timeout):
        raise httpx.TimeoutException("simulated timeout")

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await m.get_manifest("https://example/manifest.json", ttl_seconds=60)
    assert result is None


async def test_fetch_4xx_returns_none(monkeypatch):
    from ee.ripple import manifest as m

    async def fake_get(self, url, timeout):
        return httpx.Response(404, text="not found", request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await m.get_manifest("https://example/manifest.json", ttl_seconds=60)
    assert result is None


async def test_malformed_json_returns_none(monkeypatch):
    from ee.ripple import manifest as m

    async def fake_get(self, url, timeout):
        return httpx.Response(200, text="not json", request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await m.get_manifest("https://example/manifest.json", ttl_seconds=60)
    assert result is None


async def test_schema_mismatch_returns_none(monkeypatch):
    from ee.ripple import manifest as m

    bad = {"schema": "ripple.manifest/v2", "version": "1", "widgets": []}

    async def fake_get(self, url, timeout):
        return httpx.Response(200, json=bad, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await m.get_manifest("https://example/manifest.json", ttl_seconds=60)
    assert result is None


async def test_missing_widgets_field_returns_none(monkeypatch):
    from ee.ripple import manifest as m

    bad = {"schema": "ripple.manifest/v1", "version": "1"}

    async def fake_get(self, url, timeout):
        return httpx.Response(200, json=bad, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    result = await m.get_manifest("https://example/manifest.json", ttl_seconds=60)
    assert result is None


def test_format_for_prompt_renders_widgets():
    from ee.ripple import manifest as m

    block = m.format_for_prompt(VALID_MANIFEST)
    assert "<ripple-widget-reference>" in block
    assert "</ripple-widget-reference>" in block
    assert "metric" in block
    assert "KPI tile." in block


def test_format_for_prompt_empty_widgets_returns_empty_string():
    from ee.ripple import manifest as m

    empty = {"schema": "ripple.manifest/v1", "version": "1", "widgets": []}
    assert m.format_for_prompt(empty) == ""
```

- [ ] **Step 2: Run the tests — confirm they all fail**

Run: `cd backend && uv run pytest tests/test_ripple_manifest.py -v`
Expected: FAIL on all cases — module `ee.ripple.manifest` does not exist yet.

- [ ] **Step 3: Commit (red)**

```bash
git add backend/tests/test_ripple_manifest.py
git commit -m "test(ripple): manifest fetcher tests (failing)"
```

---

### Task 8: Implement the manifest fetcher

**Files:**
- Create: `backend/ee/ripple/manifest.py`

- [ ] **Step 1: Write the module**

```python
# backend/ee/ripple/manifest.py
"""Fetch and cache the Ripple widget manifest from a CDN.

The manifest is generated at ripple build time and published as
`@ripple-ui/svelte/dist/manifest.json`. This module fetches it,
caches the parse result in-process for a configurable TTL, and
formats it as a markdown block suitable for system-prompt injection.

On any failure (network, timeout, parse, schema), get_manifest()
returns None — the caller is expected to fall back to a different
source (today: kb scope search).
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_FETCH_TIMEOUT_SECONDS = 5.0
_SCHEMA = "ripple.manifest/v1"

# Module-global cache: url -> (expires_at_monotonic, parsed_manifest)
_cache: dict[str, tuple[float, dict[str, Any]]] = {}


async def get_manifest(url: str, ttl_seconds: int) -> dict[str, Any] | None:
    """Fetch the manifest from `url`, with in-process TTL caching.

    Returns the parsed manifest dict on success, or None on any failure.
    """
    now = time.monotonic()
    cached = _cache.get(url)
    if cached is not None and cached[0] > now:
        return cached[1]

    parsed = await _fetch_and_validate(url)
    if parsed is None:
        return None

    _cache[url] = (now + ttl_seconds, parsed)
    return parsed


async def _fetch_and_validate(url: str) -> dict[str, Any] | None:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=_FETCH_TIMEOUT_SECONDS)
    except httpx.TimeoutException:
        logger.warning("ripple manifest fetch timed out: %s", url)
        return None
    except httpx.HTTPError as exc:
        logger.warning("ripple manifest fetch failed: %s (%s)", url, exc)
        return None

    if response.status_code >= 400:
        logger.warning("ripple manifest fetch returned %s: %s", response.status_code, url)
        return None

    try:
        parsed = response.json()
    except (json.JSONDecodeError, ValueError):
        logger.error("ripple manifest is not valid JSON: %s", url)
        return None

    if not isinstance(parsed, dict):
        logger.error("ripple manifest is not a JSON object: %s", url)
        return None
    if parsed.get("schema") != _SCHEMA:
        logger.error("ripple manifest schema mismatch (got %r): %s", parsed.get("schema"), url)
        return None
    if not isinstance(parsed.get("widgets"), list):
        logger.error("ripple manifest missing widgets array: %s", url)
        return None

    return parsed


def format_for_prompt(manifest: dict[str, Any]) -> str:
    """Render the manifest as a markdown block for system-prompt injection.

    Returns "" if the manifest has no widgets — caller treats this the same
    as a fetch failure (i.e. falls back to kb search).
    """
    widgets = manifest.get("widgets") or []
    if not widgets:
        return ""

    lines: list[str] = []
    lines.append("\n\n<ripple-widget-reference>")
    lines.append(
        "The following Ripple widgets are available. Use these props, types, "
        "and example specs when building the UI."
    )
    lines.append("")

    for w in widgets:
        wtype = w.get("type", "?")
        category = w.get("category", "?")
        desc = w.get("description", "")
        lines.append(f"### `{wtype}` ({category})")
        lines.append(desc)
        props = w.get("props") or {}
        if props:
            lines.append("")
            lines.append("**Props:**")
            for name, spec in props.items():
                req = " *(required)*" if spec.get("required") else ""
                lines.append(
                    f"- `{name}`: `{spec.get('type', '?')}`{req} — {spec.get('description', '')}"
                )
        example = w.get("example")
        if example:
            lines.append("")
            lines.append("**Example:**")
            lines.append("```json")
            lines.append(json.dumps(example, indent=2))
            lines.append("```")
        lines.append("")

    lines.append("</ripple-widget-reference>")
    return "\n".join(lines)
```

- [ ] **Step 2: Run the tests — confirm they pass**

Run: `cd backend && uv run pytest tests/test_ripple_manifest.py -v`
Expected: PASS — all 10 tests green.

- [ ] **Step 3: Lint and type check**

Run: `cd backend && uv run ruff check ee/ripple/manifest.py && uv run mypy ee/ripple/manifest.py`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/ee/ripple/manifest.py
git commit -m "feat(ripple): manifest fetcher with ttl cache and prompt formatter"
```

---

### Task 9: Wire the orchestrator (rename existing function, add new helper)

The current `_get_ripple_widget_context()` in `pockets.py:39-92` becomes the kb-search fallback under a new name. A new manifest helper is added. A new orchestrator under the original name calls manifest first, kb second.

**Files:**
- Modify: `backend/src/pocketpaw/api/v1/pockets.py:39-92`

- [ ] **Step 1: Confirm line numbers and function shape**

Run: `grep -n "_get_ripple_widget_context\|_RIPPLE_KB" backend/src/pocketpaw/api/v1/pockets.py`
Expected: lines around 35-39 (constants), 39 (function start), 92 (function end), 461 (the call site). If line numbers have drifted, adjust the edit accordingly.

- [ ] **Step 2: Rename the existing function in place**

Edit `backend/src/pocketpaw/api/v1/pockets.py`. Change the function definition on line 39 from:

```python
async def _get_ripple_widget_context(user_message: str) -> str:
    """Search the 'ripple' kb scope for widget docs relevant to the user's request.
```

to:

```python
async def _get_ripple_widget_context_via_kb(user_message: str) -> str:
    """Search the local 'ripple' kb scope for widget docs (legacy fallback path).
```

Leave the rest of the function body unchanged (the existing kb-search implementation is correct and battle-tested; do not modify its internals).

- [ ] **Step 3: Add the manifest helper and the new orchestrator**

In the same file, immediately after the renamed `_get_ripple_widget_context_via_kb` function (i.e. before `_extract_chat_id`), insert:

```python
async def _get_ripple_widget_context_via_manifest() -> str:
    """Fetch the Ripple widget manifest from CDN and render as a prompt block.

    Returns "" on any failure — caller falls back to kb search.
    """
    from ee.ripple.manifest import format_for_prompt, get_manifest
    from pocketpaw.config import get_settings

    settings = get_settings()
    manifest = await get_manifest(
        settings.ripple_manifest_url,
        ttl_seconds=settings.ripple_manifest_ttl_seconds,
    )
    if manifest is None:
        return ""
    return format_for_prompt(manifest)


async def _get_ripple_widget_context(user_message: str) -> str:
    """Get widget context for the agent: try CDN manifest first, fall back to kb."""
    block = await _get_ripple_widget_context_via_manifest()
    if block:
        return block
    return await _get_ripple_widget_context_via_kb(user_message)
```

- [ ] **Step 4: Confirm the import-time graph still works**

Run: `cd backend && uv run python -c "from pocketpaw.api.v1 import pockets; print(pockets._get_ripple_widget_context, pockets._get_ripple_widget_context_via_kb, pockets._get_ripple_widget_context_via_manifest)"`
Expected: prints three coroutine references, no `ImportError` or `AttributeError`.

- [ ] **Step 5: Run existing pockets tests for regression**

Run: `cd backend && uv run pytest tests/ -k pocket -v`
Expected: existing pocket tests pass. (The manifest fetch will fail in test environments without network; the orchestrator falls back to kb, preserving prior behavior.)

- [ ] **Step 6: Lint**

Run: `cd backend && uv run ruff check src/pocketpaw/api/v1/pockets.py`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/src/pocketpaw/api/v1/pockets.py
git commit -m "feat(pockets): inject ripple widgets from manifest, fall back to kb"
```

---

### Task 10: Integration test for the orchestrator

**Files:**
- Modify: `backend/tests/test_ripple_manifest.py` (append integration tests)

- [ ] **Step 1: Append integration cases**

Add to `backend/tests/test_ripple_manifest.py`:

```python
async def test_orchestrator_uses_manifest_when_available(monkeypatch):
    from pocketpaw.api.v1 import pockets

    async def fake_manifest():
        return "<ripple-widget-reference>FROM-MANIFEST</ripple-widget-reference>"

    async def fake_kb(_msg):
        raise AssertionError("should not fall back to kb when manifest succeeded")

    monkeypatch.setattr(pockets, "_get_ripple_widget_context_via_manifest", fake_manifest)
    monkeypatch.setattr(pockets, "_get_ripple_widget_context_via_kb", fake_kb)

    result = await pockets._get_ripple_widget_context("show me a kpi dashboard")
    assert "FROM-MANIFEST" in result


async def test_orchestrator_falls_back_to_kb_when_manifest_empty(monkeypatch):
    from pocketpaw.api.v1 import pockets

    async def fake_manifest():
        return ""

    async def fake_kb(msg):
        return f"<ripple-widget-reference>FROM-KB:{msg}</ripple-widget-reference>"

    monkeypatch.setattr(pockets, "_get_ripple_widget_context_via_manifest", fake_manifest)
    monkeypatch.setattr(pockets, "_get_ripple_widget_context_via_kb", fake_kb)

    result = await pockets._get_ripple_widget_context("show me a kpi dashboard")
    assert "FROM-KB:show me a kpi dashboard" in result


async def test_orchestrator_returns_empty_when_both_fail(monkeypatch):
    from pocketpaw.api.v1 import pockets

    async def fake_manifest():
        return ""

    async def fake_kb(_msg):
        return ""

    monkeypatch.setattr(pockets, "_get_ripple_widget_context_via_manifest", fake_manifest)
    monkeypatch.setattr(pockets, "_get_ripple_widget_context_via_kb", fake_kb)

    result = await pockets._get_ripple_widget_context("anything")
    assert result == ""
```

- [ ] **Step 2: Run all manifest tests**

Run: `cd backend && uv run pytest tests/test_ripple_manifest.py -v`
Expected: PASS — 13 tests green (10 from Task 7 + 3 new).

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_ripple_manifest.py
git commit -m "test(pockets): orchestrator manifest→kb fallback chain"
```

---

### Task 11: Smoke test against a local manifest server

**Files:** none (manual verification)

Until ripple is published with the new manifest, point the backend at a local file server.

- [ ] **Step 1: Build ripple and serve dist locally**

Run: `cd ripple && bun run build`
Then in a separate shell: `cd ripple/dist && python -m http.server 8765 --bind 127.0.0.1`
Note the PID of the http.server process so you can stop it later.

- [ ] **Step 2: Start the backend pointed at the local manifest**

In a third shell:

```bash
export POCKETPAW_RIPPLE_MANIFEST_URL=http://127.0.0.1:8765/manifest.json
export POCKETPAW_RIPPLE_MANIFEST_TTL_SECONDS=10
cd backend && uv run pocketpaw --dev
```

- [ ] **Step 3: Trigger pocket creation and inspect logs**

Send a pocket-creation request through the dashboard (or your usual test client). Confirm:
- Backend logs show NO `ripple manifest fetch failed` warning.
- The system prompt sent to the LLM contains the `<ripple-widget-reference>` block with `metric`, `text`, `heading`, `flex`, `grid` entries.
- A second request within 10s does not re-fetch (only one access log line on the local http.server).

- [ ] **Step 4: Stop the local server**

Stop the `python -m http.server` process (Ctrl-C in its shell, or kill its PID).

- [ ] **Step 5: Commit notes — only if the smoke test surfaced a fix**

If the smoke test surfaced a bug, commit the fix. Otherwise the manual test produces no artifact and no commit is needed.

---

## Out-of-plan follow-up (do NOT include in this plan's execution)

Adding manifest entries for the remaining ~75 widgets is incremental, parallelizable work that does not block this plan. Track it as a separate workstream with one task per category (display, layout, input, data, control, composite, overlay, research, vertical). The drift-guard test in Task 2 already prevents new entries from referring to non-existent widgets; coverage of the registry can be enforced later via an additional test that today would fail by design.

Once full coverage is achieved, add this case to `manifest.test.ts`:

```ts
it('every widget type has a manifest entry (full coverage)', () => {
  const entryTypes = new Set(manifestEntries.map((e) => e.type));
  const missing = getWidgetTypes().filter((t) => !entryTypes.has(t));
  expect(missing).toEqual([]);
});
```
