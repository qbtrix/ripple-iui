# Remove Feed Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the `feed` widget from Ripple and the backend prompt files, after extending `Timeline` with a `density: 'compact'` prop that covers Feed's tight activity-stream layout.

**Architecture:** Single net-new prop on Timeline (`density`), no new components. Feed deletion is mechanical: remove from registry/exports/manifest, convert all in-tree usages to compact Timeline, strip references from the backend prompt corpus. Manifest tests gate that the registry stays consistent.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vitest (manifest tests only), Bun. Backend touches are pure-text Python prompt files (no runtime path).

**Spec:** [`../specs/2026-05-05-remove-feed-widget-design.md`](../specs/2026-05-05-remove-feed-widget-design.md)

---

## File Map

**Ripple — modified:**
- `src/lib/widgets/research/Timeline.svelte` — add `density` prop + compact CSS
- `src/lib/manifest/entries/timeline.ts` — document `density`, add compact example
- `src/lib/widgets/display/index.ts` — drop `Feed` re-export
- `src/lib/widgets/index.ts` — drop `Feed` import + 3 registry entries + re-export
- `src/lib/manifest/index.ts` — drop `feedEntry`
- `src/lib/schema/widget-types.ts` — drop `'feed'` from display category
- `src/lib/intent/DashboardRenderer.svelte` — drop `case 'feed'`
- `src/lib/manifest/entries/section.ts` — child example: feed → compact timeline
- `src/lib/manifest/entries/tabs.ts` — second tab panel: feed → compact timeline
- `src/lib/streaming/fixtures/nested-dashboard.json` — feed → compact timeline (also fixes wrong prop shape)
- `src/routes/+page.svelte` — 4 `feed` usages → compact timeline
- `src/routes/showcase/+page.svelte` — drop `feedSpec`, `activityFeedSpec`, and their two registry rows

**Ripple — deleted:**
- `src/lib/widgets/display/Feed.svelte`
- `src/lib/manifest/entries/feed.ts`

**Backend — modified (prompt corpus only, no runtime path):**
- `backend/ee/ripple/manifest.py` — drop `"feed"` alias entry
- `backend/ee/ripple/_design.py` — replace 9 in-text mentions of `feed`
- `backend/ee/ripple/_pockets.py` — drop "and feed item" phrase

---

## Task 1: Add `density` prop to Timeline

**Files:**
- Modify: `src/lib/widgets/research/Timeline.svelte`

- [ ] **Step 1: Replace Timeline.svelte with the density-aware version**

Open `src/lib/widgets/research/Timeline.svelte` and replace its full contents with:

```svelte
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface TimelineEvent {
    /** Date or time label */
    date: string;
    /** Event title */
    title: string;
    /** Optional detail text */
    detail?: string;
    /** Dot color or event type */
    type?: 'default' | 'success' | 'warning' | 'error' | 'info';
    /** Custom dot color */
    color?: string;
  }

  interface Props {
    events: TimelineEvent[];
    /** Max events to show before truncating */
    maxItems?: number;
    /** Visual density. 'compact' hides the rail, tightens spacing — use for activity streams. */
    density?: 'comfortable' | 'compact';
    class?: string;
  }

  let {
    events = [],
    maxItems,
    density = 'comfortable',
    class: className,
  }: Props = $props();

  const visible = $derived(maxItems ? events.slice(0, maxItems) : events);

  const typeColors: Record<string, string> = {
    default: 'var(--muted-foreground)',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  };

  function dotColor(ev: TimelineEvent): string {
    if (ev.color) return ev.color;
    return typeColors[ev.type ?? 'default'];
  }
</script>

<div class={cn('rtl', density === 'compact' && 'rtl--compact', className)}>
  {#each visible as ev, i}
    <div class="rtl-item">
      <div class="rtl-rail">
        <span class="rtl-dot" style="background:{dotColor(ev)}"></span>
        {#if i < visible.length - 1}
          <span class="rtl-line"></span>
        {/if}
      </div>
      <div class="rtl-content">
        <span class="rtl-date">{ev.date}</span>
        <span class="rtl-title">{ev.title}</span>
        {#if ev.detail}
          <p class="rtl-detail">{ev.detail}</p>
        {/if}
      </div>
    </div>
  {/each}
  {#if maxItems && events.length > maxItems}
    <div class="rtl-more">+{events.length - maxItems} more</div>
  {/if}
</div>

<style>
  .rtl {
    display: flex;
    flex-direction: column;
  }
  .rtl-item {
    display: flex;
    gap: 12px;
    min-height: 0;
  }
  .rtl-rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 12px;
    flex-shrink: 0;
    padding-top: 4px;
  }
  .rtl-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 2px var(--card);
  }
  .rtl-line {
    width: 1.5px;
    flex: 1;
    background: var(--border);
    min-height: 12px;
  }
  .rtl-content {
    padding-bottom: 16px;
    min-width: 0;
  }
  .rtl-date {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
  }
  .rtl-title {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--foreground);
    line-height: 1.35;
  }
  .rtl-detail {
    font-size: 12px;
    color: var(--muted-foreground);
    line-height: 1.45;
    margin: 3px 0 0;
  }
  .rtl-more {
    font-size: 11px;
    color: var(--muted-foreground);
    padding-left: 24px;
    font-weight: 500;
  }

  /* Compact density — activity-stream layout. No rail, tighter rows, smaller dot. */
  .rtl--compact .rtl-rail { padding-top: 6px; }
  .rtl--compact .rtl-dot {
    width: 6px;
    height: 6px;
    box-shadow: none;
  }
  .rtl--compact .rtl-line { display: none; }
  .rtl--compact .rtl-content { padding-bottom: 4px; }
  .rtl--compact .rtl-title { font-size: 12px; }
</style>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no errors related to Timeline.

- [ ] **Step 3: Commit**

```bash
git add src/lib/widgets/research/Timeline.svelte
git commit -m "feat(timeline): add density prop with compact variant"
```

---

## Task 2: Document `density` in the Timeline manifest entry

**Files:**
- Modify: `src/lib/manifest/entries/timeline.ts`

- [ ] **Step 1: Replace timeline.ts with the density-aware entry**

Open `src/lib/manifest/entries/timeline.ts` and replace contents with:

```ts
import type { WidgetManifestEntry } from '../index.js';

export const timelineEntry: WidgetManifestEntry = {
  type: 'timeline',
  category: 'research',
  description:
    'Vertical timeline with typed events, dates, and optional details. Use `density: "compact"` for tight activity streams; default reads as a milestone log.',
  props: {
    events: {
      type: 'Array<{ date: string; title: string; detail?: string; type?: "default" | "success" | "warning" | "error" | "info"; color?: string }>',
      required: true,
      description: 'Timeline events.',
    },
    maxItems: { type: 'number', required: false, description: 'Truncate after N events.' },
    density: {
      type: '"comfortable" | "compact"',
      required: false,
      description:
        'Visual density. "comfortable" (default) shows a connecting rail and roomy spacing — milestones/roadmap. "compact" hides the rail and tightens rows — activity streams ("Deploy succeeded · 2m ago").',
    },
  },
  example: {
    type: 'timeline',
    props: {
      events: [
        { date: 'Q1 2026', title: 'Product Launch', detail: 'Shipped new ML features.', type: 'success' },
        { date: 'Q2 2025', title: 'Series B Funding', detail: '$50M raised from leading VCs.', type: 'success' },
        { date: 'Q4 2024', title: 'Market Expansion', detail: 'Entered 5 new countries.', type: 'info' },
      ],
    },
  },
};
```

- [ ] **Step 2: Run manifest tests**

Run: `bun run test`
Expected: all tests in `manifest.test.ts` pass — `description` still under 200 chars, `example.type === 'timeline'`, no `on_*` keys in props.

- [ ] **Step 3: Commit**

```bash
git add src/lib/manifest/entries/timeline.ts
git commit -m "docs(manifest): document timeline density prop"
```

---

## Task 3: Convert in-tree manifest examples (section, tabs)

**Files:**
- Modify: `src/lib/manifest/entries/section.ts`
- Modify: `src/lib/manifest/entries/tabs.ts`

- [ ] **Step 1: Update section.ts**

Replace the `children` block in `src/lib/manifest/entries/section.ts`:

```ts
  children: [
    {
      type: 'timeline',
      props: {
        density: 'compact',
        events: [
          { date: '2m ago', title: 'Deploy succeeded', type: 'success' },
          { date: '14m ago', title: 'PR merged', type: 'info' },
        ],
      },
    },
  ],
```

- [ ] **Step 2: Update tabs.ts**

In `src/lib/manifest/entries/tabs.ts`, replace the `feed` panel (the second `children` element starting `{ type: 'feed', ... }`) with:

```ts
      // Panel 1 — content for the "activity" tab.
      {
        type: 'timeline',
        props: {
          density: 'compact',
          events: [
            { date: '2m ago', title: 'Deploy succeeded', type: 'info' },
            { date: '14m ago', title: 'New PR opened', type: 'info' },
          ],
        },
      },
```

- [ ] **Step 3: Run manifest tests**

Run: `bun run test`
Expected: all tests pass. Examples still type-check against `WidgetManifestEntry`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/manifest/entries/section.ts src/lib/manifest/entries/tabs.ts
git commit -m "refactor(manifest): convert section/tabs feed examples to compact timeline"
```

---

## Task 4: Convert nested-dashboard fixture (also fixes wrong prop shape)

**Files:**
- Modify: `src/lib/streaming/fixtures/nested-dashboard.json`

- [ ] **Step 1: Replace the feed node with a compact timeline**

In `src/lib/streaming/fixtures/nested-dashboard.json`, replace the entire object that starts at `"type": "feed"` (currently lines 60–68) with:

```json
          {
            "type": "timeline",
            "props": {
              "density": "compact",
              "events": [
                { "date": "2m ago", "title": "New order #1204" },
                { "date": "14m ago", "title": "Refund processed" },
                { "date": "1h ago", "title": "Inventory low: Widget Pro" }
              ]
            }
          }
```

(The previous shape used `items: [{title, timestamp}]` which matches neither feed nor timeline — this also fixes that bug.)

- [ ] **Step 2: Validate JSON**

Run: `bun -e "console.log(JSON.parse(require('fs').readFileSync('src/lib/streaming/fixtures/nested-dashboard.json', 'utf8')).ui.children.length)"`
Expected: prints `5` (no parse error).

- [ ] **Step 3: Commit**

```bash
git add src/lib/streaming/fixtures/nested-dashboard.json
git commit -m "fix(fixtures): convert nested-dashboard feed to compact timeline"
```

---

## Task 5: Convert routes/+page.svelte demos

**Files:**
- Modify: `src/routes/+page.svelte` (4 sites: lines 409, 451, 461, 471)

- [ ] **Step 1: Replace the "How it works" feed (line ~409)**

Replace:

```svelte
        {
          type: 'feed', props: {
            items: [
              { text: 'Each call clears the previous timer via clearTimeout', type: 'info' },
              { text: 'A new timer is set with the specified delay', type: 'info' },
              { text: 'The function only fires after the caller stops for delay ms', type: 'success' },
              { text: 'Closures preserve the timer reference between calls', type: 'default' },
            ]
          }
        },
```

With:

```svelte
        {
          type: 'timeline', props: {
            density: 'compact',
            events: [
              { date: '1.', title: 'Each call clears the previous timer via clearTimeout', type: 'info' },
              { date: '2.', title: 'A new timer is set with the specified delay', type: 'info' },
              { date: '3.', title: 'The function only fires after the caller stops for delay ms', type: 'success' },
              { date: '4.', title: 'Closures preserve the timer reference between calls', type: 'default' },
            ]
          }
        },
```

- [ ] **Step 2: Replace Day 1 itinerary feed (line ~451)**

Replace:

```svelte
            {
              type: 'feed', props: {
                items: [
                  { text: 'Fushimi Inari — walk the thousand torii gates (early morning)', type: 'success', time: '7:00' },
                  { text: 'Nishiki Market — street food and local ingredients', type: 'info', time: '11:00' },
                  { text: 'Kiyomizu-dera — panoramic views of the city', type: 'success', time: '14:00' },
                  { text: 'Gion district — evening walk, spot maiko', type: 'default', time: '18:00' },
                ]
              }
            },
```

With:

```svelte
            {
              type: 'timeline', props: {
                density: 'compact',
                events: [
                  { date: '7:00', title: 'Fushimi Inari — walk the thousand torii gates (early morning)', type: 'success' },
                  { date: '11:00', title: 'Nishiki Market — street food and local ingredients', type: 'info' },
                  { date: '14:00', title: 'Kiyomizu-dera — panoramic views of the city', type: 'success' },
                  { date: '18:00', title: 'Gion district — evening walk, spot maiko', type: 'default' },
                ]
              }
            },
```

- [ ] **Step 3: Replace Day 2 itinerary feed (line ~461)**

Replace:

```svelte
            {
              type: 'feed', props: {
                items: [
                  { text: 'Arashiyama Bamboo Grove — arrive before crowds', type: 'success', time: '7:30' },
                  { text: 'Tenryu-ji temple and garden', type: 'info', time: '10:00' },
                  { text: 'Monkey Park Iwatayama — hilltop views', type: 'default', time: '13:00' },
                  { text: 'Togetsukyo Bridge — sunset photos', type: 'success', time: '17:00' },
                ]
              }
            },
```

With:

```svelte
            {
              type: 'timeline', props: {
                density: 'compact',
                events: [
                  { date: '7:30', title: 'Arashiyama Bamboo Grove — arrive before crowds', type: 'success' },
                  { date: '10:00', title: 'Tenryu-ji temple and garden', type: 'info' },
                  { date: '13:00', title: 'Monkey Park Iwatayama — hilltop views', type: 'default' },
                  { date: '17:00', title: 'Togetsukyo Bridge — sunset photos', type: 'success' },
                ]
              }
            },
```

- [ ] **Step 4: Replace Day 3 itinerary feed (line ~471)**

Replace:

```svelte
            {
              type: 'feed', props: {
                items: [
                  { text: 'Kinkaku-ji (Golden Pavilion)', type: 'success', time: '8:30' },
                  { text: 'Ryoan-ji — famous rock garden', type: 'info', time: '10:30' },
                  { text: 'Philosopher\'s Path — peaceful canal walk', type: 'default', time: '13:00' },
                  { text: 'Pontocho alley — farewell dinner', type: 'success', time: '18:30' },
                ]
              }
            },
```

With:

```svelte
            {
              type: 'timeline', props: {
                density: 'compact',
                events: [
                  { date: '8:30', title: 'Kinkaku-ji (Golden Pavilion)', type: 'success' },
                  { date: '10:30', title: 'Ryoan-ji — famous rock garden', type: 'info' },
                  { date: '13:00', title: 'Philosopher\'s Path — peaceful canal walk', type: 'default' },
                  { date: '18:30', title: 'Pontocho alley — farewell dinner', type: 'success' },
                ]
              }
            },
```

- [ ] **Step 5: Type-check**

Run: `bun run check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "refactor(playground): convert feed demos to compact timeline"
```

---

## Task 6: Drop `feedSpec` and `activityFeedSpec` from the showcase

**Files:**
- Modify: `src/routes/showcase/+page.svelte`

- [ ] **Step 1: Delete the `feedSpec` constant (lines 799–812)**

Remove this block:

```ts
  const feedSpec = {
    version: '1.0' as const,
    ui: {
      type: 'feed',
      props: {
        items: [
          { text: 'Deployment completed successfully', time: '2m ago', type: 'success' },
          { text: 'Database migration started', time: '5m ago', type: 'info' },
          { text: 'High memory usage detected', time: '12m ago', type: 'warning' },
          { text: 'Build failed on main branch', time: '18m ago', type: 'error' },
        ]
      }
    }
  };
```

- [ ] **Step 2: Delete the `activityFeedSpec` constant (lines 1741–1753)**

Remove this block:

```ts
  const activityFeedSpec = {
    version: '1.0' as const,
    ui: {
      type: 'activity-feed',
      props: {
        items: [
          { id: 1, actor: 'Ada', action: 'opened pull request', target: '#142', timestamp: '2 min ago' },
          { id: 2, actor: 'Bob', action: 'merged', target: '#138', timestamp: '14 min ago' },
          { id: 3, actor: 'Carol', action: 'commented on', target: '#142', timestamp: '20 min ago' }
        ]
      }
    }
  };
```

- [ ] **Step 3: Remove the two registry rows (lines 4187 and 4271)**

Remove the line `{ label: 'Feed', spec: feedSpec },` and the line `{ label: 'Activity Feed', spec: activityFeedSpec },` from their respective registry arrays.

- [ ] **Step 4: Type-check**

Run: `bun run check`
Expected: no "Cannot find name 'feedSpec'" or 'activityFeedSpec' errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/showcase/+page.svelte
git commit -m "refactor(showcase): drop feed and activity-feed specs"
```

---

## Task 7: Drop the `'feed'` branch from DashboardRenderer

**Files:**
- Modify: `src/lib/intent/DashboardRenderer.svelte` (lines 191–200)

- [ ] **Step 1: Delete the `case 'feed':` block**

Remove these lines:

```ts
        case 'feed': {
          const fd = widget.data;
          // Handle AI spec format: { items: [{text, time, type}] }
          if (fd && typeof fd === 'object' && !Array.isArray(fd) && fd.items) {
            node.props.items = fd.items;
          } else {
            node.props.items = fd;
          }
          break;
        }
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/intent/DashboardRenderer.svelte
git commit -m "refactor(dashboard): drop feed widget data adapter"
```

---

## Task 8: Drop Feed from registry, exports, manifest, schema

**Files:**
- Modify: `src/lib/widgets/display/index.ts`
- Modify: `src/lib/widgets/index.ts`
- Modify: `src/lib/manifest/index.ts`
- Modify: `src/lib/schema/widget-types.ts`

- [ ] **Step 1: Drop `Feed` from `display/index.ts`**

Open `src/lib/widgets/display/index.ts` and delete the line:

```ts
export { default as Feed } from './Feed.svelte';
```

- [ ] **Step 2: Drop `Feed` from `widgets/index.ts`**

In `src/lib/widgets/index.ts`:

(a) Remove `Feed` from the import on line 5 — `import { Text, Heading, ..., Stat, Feed, SoulStatus, ... }` becomes `import { Text, Heading, ..., Stat, SoulStatus, ... }`.

(b) Remove these three registry entries (lines ~84–86):

```ts
  feed: Feed,
  'activity-feed': Feed,
  activity: Feed,
```

(c) Remove `Feed` from the bottom re-export list on line ~283 — `Text, Heading, ..., Stat, Feed, SoulStatus, ...` becomes `Text, Heading, ..., Stat, SoulStatus, ...`.

- [ ] **Step 3: Drop `feedEntry` from manifest index**

In `src/lib/manifest/index.ts`:

(a) Remove the import on line 56:

```ts
import { feedEntry } from './entries/feed.js';
```

(b) Remove `feedEntry,` from the `manifestEntries` array on line ~293.

- [ ] **Step 4: Drop `'feed'` from widget-types**

In `src/lib/schema/widget-types.ts` line 26, remove `'feed', ` from the display category list. The line becomes:

```ts
  display: ['text', 'heading', 'image', 'badge', 'progress', 'avatar', 'metric', 'stat', 'soul-status'],
```

- [ ] **Step 5: Type-check**

Run: `bun run check`
Expected: no errors.

- [ ] **Step 6: Run manifest tests**

Run: `bun run test`
Expected: pass — `manifestEntries` still references only registered widgets, no ghost types.

- [ ] **Step 7: Commit**

```bash
git add src/lib/widgets/display/index.ts src/lib/widgets/index.ts src/lib/manifest/index.ts src/lib/schema/widget-types.ts
git commit -m "refactor(ripple): drop feed from registry, manifest, and schema"
```

---

## Task 9: Delete Feed source files

**Files:**
- Delete: `src/lib/widgets/display/Feed.svelte`
- Delete: `src/lib/manifest/entries/feed.ts`

- [ ] **Step 1: Delete the files**

```bash
rm src/lib/widgets/display/Feed.svelte
rm src/lib/manifest/entries/feed.ts
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no errors.

- [ ] **Step 3: Run manifest tests**

Run: `bun run test`
Expected: all manifest tests pass.

- [ ] **Step 4: Build the library**

Run: `bun run build`
Expected: clean build, `dist/` populated, no warnings about missing Feed.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib/widgets/display/Feed.svelte src/lib/manifest/entries/feed.ts
git commit -m "refactor(ripple): delete Feed widget and manifest entry"
```

---

## Task 10: Drop `feed` alias from backend manifest.py

**Files:**
- Modify: `D:/paw/backend/ee/ripple/manifest.py` (lines 100–103)

- [ ] **Step 1: Remove the `"feed"` entry from the alias table**

In `_KNOWN_ITEM_ALIASES`, replace:

```python
_KNOWN_ITEM_ALIASES: dict[str, dict[str, dict[str, str]]] = {
    # `feed` items: agents emit `title` / `description` (social-feed prior)
    # instead of the manifest's `text`. `description` has no clean target
    # so we only alias `title -> text` and warn on `description`.
    "feed": {"items": {"title": "text"}},
    # `timeline` events: agents emit `description` (universal name)
    # instead of the manifest's `detail`. Clean rename.
    "timeline": {"events": {"description": "detail"}},
}
```

With:

```python
_KNOWN_ITEM_ALIASES: dict[str, dict[str, dict[str, str]]] = {
    # `timeline` events: agents emit `description` (universal name)
    # instead of the manifest's `detail`. Clean rename.
    "timeline": {"events": {"description": "detail"}},
}
```

- [ ] **Step 2: Run backend tests for the ripple module**

Run: `cd D:/paw/backend && uv run pytest ee/ripple -v 2>&1 | tail -30`
Expected: pass (no test references `feed`; if any do, follow up before moving on).

- [ ] **Step 3: Commit (in backend repo)**

```bash
cd D:/paw/backend
git add ee/ripple/manifest.py
git commit -m "refactor(ee/ripple): drop feed alias entry"
```

---

## Task 11: Strip `feed` mentions from backend `_design.py`

**Files:**
- Modify: `D:/paw/backend/ee/ripple/_design.py`

- [ ] **Step 1: WIDGET_CATALOG (line 23)**

Replace:

```
display     heading, text, badge, metric, stat, progress, progress-ring,
            avatar, image, feed, markdown, code-block, code, kbd, icon,
```

With:

```
display     heading, text, badge, metric, stat, progress, progress-ring,
            avatar, image, markdown, code-block, code, kbd, icon,
```

- [ ] **Step 2: WIDGET SPEC TOOL RULE (lines 167–169)**

Replace:

```
Guessing prop names from the widget
name has shipped broken UIs to production (e.g. `feed` items with
`title`/`description` instead of `text`; `timeline` events with
`description` instead of `detail` — both render as empty rows).
```

With:

```
Guessing prop names from the widget
name has shipped broken UIs to production (e.g. `timeline` events with
`description` instead of `detail` — render as empty rows).
```

- [ ] **Step 3: Batch example (line 181)**

Replace:

```
in one call: `get_widget_spec(types=["feed", "timeline", "stat",
"sources-bar"])` is one round-trip — there is no excuse to skip it.
```

With:

```
in one call: `get_widget_spec(types=["timeline", "stat", "sources-bar",
"gauge"])` is one round-trip — there is no excuse to skip it.
```

- [ ] **Step 4: CANONICAL SHAPES intro (line 194)**

Replace:

```
For every other widget — stat, feed, timeline, gantt, calendar,
```

With:

```
For every other widget — stat, timeline, gantt, calendar,
```

- [ ] **Step 5: Tabs example inside CANONICAL SHAPES (line 241)**

Replace:

```
    "children": [
      { "type": "text", "props": { "text": "Overview content" } },
      { "type": "feed", "props": { "items": [...] } }
    ]
```

With:

```
    "children": [
      { "type": "text", "props": { "text": "Overview content" } },
      { "type": "timeline", "props": { "density": "compact", "events": [...] } }
    ]
```

- [ ] **Step 6: Empty-state principle (line 328)**

Replace:

```
  (b) Provide IN-CANVAS controls to add / remove / edit. A bound
      list / board / feed paired with no controls and no items is the
      worst possible first impression.
```

With:

```
  (b) Provide IN-CANVAS controls to add / remove / edit. A bound
      list / board / timeline paired with no controls and no items is the
      worst possible first impression.
```

- [ ] **Step 7: Mutable-pocket example list (line 332)**

Replace:

```
This applies to every app pocket, regardless of widget — kanban,
table-as-list, notes feed, calendar of events, calculator history,
form draft, anything user-mutable.
```

With:

```
This applies to every app pocket, regardless of widget — kanban,
table-as-list, calendar of events, calculator history,
form draft, anything user-mutable.
```

- [ ] **Step 8: Read-only widget list (line 348)**

Replace:

```
when the widget is purely read-only (kanban, table, feed, calendar,
chart) do you compose external CONTROLS around it.
```

With:

```
when the widget is purely read-only (kanban, table, timeline, calendar,
chart) do you compose external CONTROLS around it.
```

- [ ] **Step 9: Density caps — kanban (line 502)**

Replace:

```
   - kanban: ≥3 cards across columns, otherwise a `feed` reads better.
```

With:

```
   - kanban: ≥3 cards across columns, otherwise a `timeline` reads better.
```

- [ ] **Step 10: Work-surface example (line 513)**

Replace:

```
   work surface (a todo table they'll fill in, a notes feed they'll
   write into), an empty `data: []` seeded by `state` is correct;
```

With:

```
   work surface (a todo table they'll fill in, a notes timeline they'll
   write into), an empty `data: []` seeded by `state` is correct;
```

- [ ] **Step 11: Structure-over-prose list (line 520)**

Replace:

```
   `text` describing items, stop — convert it to a typed widget (steps,
   feed, table, comparison-table, source-card).
```

With:

```
   `text` describing items, stop — convert it to a typed widget (steps,
   timeline, table, comparison-table, source-card).
```

- [ ] **Step 12: Verify no `feed` mentions remain in `_design.py`**

Run: `grep -n "\bfeed\b" D:/paw/backend/ee/ripple/_design.py || echo "clean"`
Expected: prints `clean`.

- [ ] **Step 13: Commit (in backend repo)**

```bash
cd D:/paw/backend
git add ee/ripple/_design.py
git commit -m "docs(ee/ripple): strip feed widget references from design prompts"
```

---

## Task 12: Drop "and feed item" from `_pockets.py`

**Files:**
- Modify: `D:/paw/backend/ee/ripple/_pockets.py` (line 661)

- [ ] **Step 1: Replace the phrase**

Find the line containing:

```
4. Every chart point, table row, metric, kanban card, and feed item in
```

Replace with:

```
4. Every chart point, table row, metric, and kanban card in
```

- [ ] **Step 2: Verify no `feed` mentions remain in `_pockets.py`**

Run: `grep -n "\bfeed\b" D:/paw/backend/ee/ripple/_pockets.py || echo "clean"`
Expected: prints `clean`.

(Note: `_inline.py` line 63 contains the unrelated phrase "feeds back into the next turn" — leave it alone. Confirm with `grep -n "\bfeed" D:/paw/backend/ee/ripple/_inline.py`; only that one match should appear.)

- [ ] **Step 3: Commit (in backend repo)**

```bash
cd D:/paw/backend
git add ee/ripple/_pockets.py
git commit -m "docs(ee/ripple): drop feed-item example from pockets prompt"
```

---

## Task 13: Final verification

- [ ] **Step 1: Search the Ripple codebase for stragglers**

Run, in `D:/paw/ripple`:

```bash
grep -rn "\bfeed\b\|activity-feed" src/ --include="*.ts" --include="*.svelte" --include="*.json" || echo "clean"
```

Expected: prints `clean`. If anything turns up, convert it to `timeline` (compact) or remove and amend the most recent commit.

- [ ] **Step 2: Type-check + tests + build**

Run, sequentially in `D:/paw/ripple`:

```bash
bun run check
bun run test
bun run build
```

Expected: all three pass with no errors or warnings about Feed.

- [ ] **Step 3: Visual smoke-test**

Run: `bun run dev`

Open in browser:
- `http://localhost:5173/` — the four converted demo pockets ("How it works" debounce explainer, three Kyoto itinerary tabs) render as compact timelines with date/time on the left, title on the right. Activity-stream density (no rail).
- `http://localhost:5173/showcase` — search the showcase. `Feed` and `Activity Feed` rows are gone; `Timeline` row still works.

If any panel shows "unknown widget" or visibly broken layout, capture which one and fix before continuing.

- [ ] **Step 4: Backend prompt-corpus sanity**

Run, in `D:/paw/backend`:

```bash
grep -rn "\bfeed\b" ee/ripple/ || echo "clean"
```

Expected: prints `clean` (or only `_inline.py:63` matching `"feeds back"` — the unrelated English usage).

If `pytest ee/ripple` exists, run it:

```bash
uv run pytest ee/ripple -v 2>&1 | tail -30
```

Expected: pass. (No tests are expected to reference `feed`; if any do, fix.)

- [ ] **Step 5: Final summary commit (Ripple, optional)**

If any straggler edits were needed in Step 1, commit them:

```bash
cd D:/paw/ripple
git add -A
git commit -m "refactor(ripple): clean up remaining feed references"
```

---

## Self-Review Notes

- **Spec coverage:** All 11 spec items (Timeline density variant, 9 Ripple file changes, 3 backend file changes) map to Tasks 1–12. Task 13 covers the spec's verification section.
- **Type consistency:** `density: 'comfortable' | 'compact'` is used identically across Timeline.svelte (Task 1), the manifest entry (Task 2), and every example (Tasks 3–6, 11). Item shape `{ date, title, type? }` is used consistently in all conversions.
- **No placeholders:** Every replacement is shown in full. No "similar to above" — Tasks 5 and 11 each repeat the code per replacement.
