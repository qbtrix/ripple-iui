# Remove `feed` Widget — Design

**Date:** 2026-05-05
**Status:** Approved
**Author:** session brainstorm

## Problem

`feed` and `timeline` are two widgets that solve the same problem: vertical list of dated/timed events with status-typed dots. Side-by-side comparison:

| Feature | `feed` | `timeline` |
|---|---|---|
| Dot + label | yes | yes |
| Time/date | yes (`time`) | yes (`date`) |
| Status types (success/warning/error/info) | yes | yes |
| Custom dot color | yes | yes |
| `maxItems` truncation | yes | yes (with `+N more` hint) |
| Connecting rail between dots | no | yes |
| Title + detail | no | yes |

`timeline` is a strict superset of `feed`. The only thing `feed` did that `timeline` doesn't do today is *render densely* — `feed` had 5px row padding and no rail, suitable for a compact "5 most recent activities" panel. `timeline` has 16px between events and a connecting rail, which reads as a milestone log.

The two-component split has caused agent failures in production: agents emit `feed` items with `{title, description}` (social-feed prior) instead of `{text}`, and the backend has hand-curated alias tables to rewrite the wrong keys (see `backend/ee/ripple/manifest.py`). Reducing surface area is the cleanest fix.

## Design

### Add `density` prop to `Timeline`

Single new prop on `Timeline.svelte`:

```ts
density?: 'comfortable' | 'compact'  // default: 'comfortable'
```

When `density === 'compact'`:

- `.rtl-content` bottom-padding: 16px → 4px
- `.rtl-line` (connecting rail): hidden via `display: none`
- `.rtl-dot`: 8px → 6px, drop `box-shadow: 0 0 0 2px var(--card)` (the ring only reads with a rail)
- `.rtl-title`: 13px → 12px
- `.rtl-date` styling preserved (uppercase + tabular nums still distinguishes it from title)

`comfortable` is the default and matches today's behavior pixel-for-pixel — existing usages do not change.

### Manifest update

`src/lib/manifest/entries/timeline.ts` gains:

- `density` prop documented as optional `'comfortable' | 'compact'`, default `'comfortable'`.
- A second compact example showing 3 short events suitable for an activity stream, so agents have a template for the dense use case.

### Files removed (Ripple)

Delete:
- `src/lib/widgets/display/Feed.svelte`
- `src/lib/manifest/entries/feed.ts`

Edit:
- `src/lib/widgets/display/index.ts` — drop `Feed` re-export.
- `src/lib/widgets/index.ts` — drop `Feed` import; remove the three registry entries `feed`, `activity-feed`, `activity`; drop `Feed` from the bottom re-export list.
- `src/lib/manifest/index.ts` — drop `feedEntry` import and its entry in the manifest array.
- `src/lib/schema/widget-types.ts` — remove `'feed'` from the `display` category list.
- `src/lib/intent/DashboardRenderer.svelte` — delete the `case 'feed':` branch.
- `src/lib/manifest/manifest.test.ts` — drop any feed-specific assertions; add an assertion that `timeline.props.density` is documented.

No registry aliases preserved. The break is intentional — preserving aliases would let agent-emitted specs continue using the old `{text, time}` shape forever, which is the opposite of the goal.

### Fixtures and demos updated (Ripple)

- `src/lib/streaming/fixtures/nested-dashboard.json` — convert the nested `feed` node to `timeline` with `density: 'compact'`. **The fixture currently uses the wrong prop shape** (`items: [{title, timestamp}]` — neither matches today's feed nor timeline). Convert to canonical `events: [{date, title}]`. This is a bug fix on the side.
- `src/lib/manifest/entries/section.ts` — child example switches from `feed` to `timeline` (compact, 1–2 sample events).
- `src/lib/manifest/entries/tabs.ts` — second tab panel switches from `feed` to `timeline` (compact, 2 sample events).
- `src/routes/+page.svelte` — four `feed` usages (lines 409, 451, 461, 471) convert to `timeline` (compact). Item shape changes from `{text, time, type}` to `{title: <was text>, date: <was time>, type}`.
- `src/routes/showcase/+page.svelte` — delete `feedSpec` (line 799) and `activityFeedSpec` (line 1741) constants; remove their two registry rows (lines 4187, 4271). The existing `Timeline` showcase row covers both.

### Files removed/edited (Backend — `D:\paw\backend\ee\ripple`)

`manifest.py`:
- Delete the `"feed"` entry from `_KNOWN_ITEM_ALIASES` (lines 100–103).
- The header comment block above stays — it's general doc about why aliases exist, and `timeline` still has one entry.

`_design.py`:
- Line 23 (WIDGET_CATALOG): drop `feed,` from the display row.
- Lines 167–169 (WIDGET SPEC TOOL RULE): remove the `feed` example of "guessing prop names from the widget name has shipped broken UIs" — keep the `timeline` example.
- Line 181: `get_widget_spec(types=["feed", "timeline", "stat", "sources-bar"])` → `get_widget_spec(types=["timeline", "stat", "sources-bar", "gauge"])` (replace removed token with another non-free-list type so the example still demonstrates batching).
- Line 194 (CANONICAL SHAPES intro): drop `feed,` from the "stat, feed, timeline, gantt..." list.
- Line 241 (tabs example in CANONICAL SHAPES): replace `{ "type": "feed", "props": { "items": [...] } }` with `{ "type": "timeline", "props": { "density": "compact", "events": [...] } }`.
- Line 328: rewrite "list / board / feed paired with no controls" → "list / board / timeline paired with no controls".
- Line 332: drop "notes feed," from the example list (the rule reads fine without).
- Line 348: rewrite "(kanban, table, feed, calendar, chart)" → "(kanban, table, timeline, calendar, chart)".
- Line 502: rewrite "kanban: ≥3 cards across columns, otherwise a `feed` reads better" → "kanban: ≥3 cards across columns, otherwise a `timeline` reads better".
- Line 513: drop "a notes feed they'll write into," from the example clause.
- Line 520: rewrite "(steps, feed, table, comparison-table, source-card)" → "(steps, timeline, table, comparison-table, source-card)".

`_inline.py` line 63: the word "feeds" is unrelated English ("every action feeds back into the next turn"). **No change.**

`_pockets.py` line 661: drop ", and feed item" from "every chart point, table row, metric, kanban card, and feed item in...". The sentence reads fine without.

No Python tests reference `feed` per current repo state. If `pytest backend/ee/ripple` reveals anything during implementation, the plan handles it then.

## Out of scope

- No data migration for existing serialized specs in user databases. Specs that still contain `type: "feed"` will render as `[unknown widget]` after this lands. If product cares about graceful degradation for old saved specs, that is a separate work item.
- No changes to `soul-status`, `quote`, `highlight`, or any other display widget.
- No new Timeline features beyond `density`. No grouping headers, no avatars, no actor+action shape — those were considered and rejected as YAGNI.

## Verification

- `bun run check` passes (TypeScript / svelte-check).
- `bun run test` passes (manifest test still asserts widget catalog shape).
- Dev server (`bun run dev`) renders `/` (homepage demos) and `/showcase` without "unknown widget" warnings, and the four converted `+page.svelte` panels visually match the old Feed density.
- `python -m pytest backend/ee/ripple` passes (whatever exists).
- Visual sanity: at least one Timeline rendered with `density: 'compact'` reads as a tight activity stream, distinct from the milestone-log default.
