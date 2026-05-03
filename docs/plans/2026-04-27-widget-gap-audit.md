# Widget Gap Audit — Ripple

**Date:** 2026-04-27
**Branch:** `feat/card-rebuild`
**Purpose:** Catalog the components, layouts, and widgets Ripple should add to be production-grade for enterprise UIs and LLM-rendered inline content.

## Legend

- **★** — Wraps a shadcn-svelte primitive that is already installed in `src/lib/components/ui/`. Cheap win.
- **NEW** — Needs a real build using existing primitives or from scratch.
- **EXT** — Needs a third-party library.

---

## Current Inventory (43 widgets)

| Category | Widgets |
|---|---|
| Layout | container, flex, grid, card, glass-card, tabs, dashboard, dashboard-slot, modal/dialog |
| Display | text, heading, image, badge, progress, avatar, metric, stat, feed, skeleton, soul-status |
| Input | button, input, select, checkbox, switch, textarea |
| Data | table, chart |
| Control | if, each |
| Overlay | confirm-dialog |
| Composite | terminal, workflow, c4 |
| Research vertical | source-card, citation, sources-bar, discover-card, follow-up, company-header, ticker, kv-table, timeline, callout, news-card, analyst-bar, range-bar |

**Installed shadcn primitives not yet exposed as widgets:** separator, alert, tooltip, accordion, sheet, popover, slider, radio-group.

---

## 1. Inputs & Forms

| Widget | Status | Notes |
|---|---|---|
| `date-picker` / `date-range` | NEW | Calendar popover; required for any scheduling/filtering UI |
| `time-picker` | NEW | Pairs with date-picker |
| `combobox` / `autocomplete` | NEW | Async option loading via `api` action |
| `multi-select` / `tag-input` | NEW | Chips with create-on-enter |
| `file-upload` / `dropzone` | NEW | Drag-drop, progress, multi-file |
| `slider` | ★ | Primitive ready |
| `radio-group` | ★ | Primitive ready |
| `number-input` / `stepper` | NEW | Increment/decrement + min/max |
| `otp-input` | NEW | Auth flows |
| `color-picker` | NEW | |
| `rich-text` / `markdown-editor` | EXT | tiptap or milkdown |
| `code-editor` | EXT | codemirror or monaco |
| `search` | NEW | Input + results dropdown + keyboard nav |
| `command-palette` | NEW | Cmd+K, fuzzy, action dispatch |
| `form` | NEW | Composed wrapper with validation, error binding, submit action |
| `filter-bar` | NEW | Composable filter chips for tables |
| `segmented` / `toggle-group` | NEW | Small but ubiquitous |

## 2. Layout & App Shell

| Widget | Status | Notes |
|---|---|---|
| `app-shell` | NEW | Sidebar + topbar + content slots |
| `sidebar` / `nav` | NEW | Collapsible, sections, active state |
| `breadcrumb` | NEW | |
| `page-header` | NEW | Title + actions + tabs slot |
| `split` / `resizable` | NEW | Draggable horizontal/vertical panes |
| `sheet` / `drawer` | ★ | Primitive ready |
| `accordion` | ★ | Primitive ready |
| `collapsible` | NEW | Or alias of single-item accordion |
| `stepper` / `wizard` | NEW | Multi-step form indicator + content |
| `master-detail` | NEW | List left, detail right with selection state |
| `empty-state` | NEW | Illustration + title + CTA |

## 3. Data & Tables

| Widget | Status | Notes |
|---|---|---|
| `data-grid` | NEW | Supersedes `table`: sort, filter, paginate, column resize, row select, virtualize |
| `kanban` | NEW | Columns + draggable cards, status binding |
| `tree` | NEW | Expand/collapse, lazy load, selection |
| `tree-table` / `nested-rows` | NEW | Common enterprise pattern |
| `list` / `virtual-list` | NEW | Large feeds without DOM blowup |
| `calendar` | NEW | Month/week views, event slots |
| `scheduler` / `gantt` | EXT | Heavier, but core enterprise |
| `pivot` | EXT | Optional, advanced |

## 4. Visualization (extending existing `chart`)

| Widget | Status | Notes |
|---|---|---|
| `sparkline` | NEW | Inline trend, no axes |
| `heatmap` | NEW | |
| `funnel` | NEW | |
| `treemap` | NEW | |
| `sankey` | EXT | |
| `gauge` | NEW | |
| `progress-ring` | NEW | Circular variant of progress |

## 5. Overlays & Feedback

| Widget | Status | Notes |
|---|---|---|
| `toast` | NEW | Registry-listening widget; events already emit `toast` |
| `tooltip` | ★ | Primitive ready |
| `popover` | ★ | Primitive ready |
| `hover-card` | NEW | Rich preview on hover (links, users) |
| `dropdown-menu` | NEW | |
| `context-menu` | NEW | Right-click |
| `alert` / `banner` | ★ | Primitive ready |
| `notification-center` | NEW | Inbox panel |
| `loading` / `spinner` | NEW | Small primitive |
| `error-state` | NEW | Empty-state's sibling for failures |
| `coachmark` / `tour` | EXT | Onboarding overlays |

## 6. Inline / Micro Components (LLM-friendly, drop-in)

| Widget | Status | Notes |
|---|---|---|
| `chip` / `tag` | NEW | Closeable, color variants (vs static badge) |
| `kbd` | NEW | Keyboard shortcut display |
| `code` | NEW | Inline code + copy |
| `code-block` | NEW | Syntax highlight + copy + language |
| `markdown` | NEW | Render markdown with widget-aware links |
| `diff` | NEW | Text/code diff inline |
| `copy` | NEW | Copy-to-clipboard pill |
| `mention` / `pill` | NEW | @user with hover-card |
| `link-preview` | NEW | Rich URL card |
| `trend` / `delta` | NEW | Colored ▲ +12.4% |
| `status-dot` | NEW | Colored dot + label |
| `avatar-group` | NEW | Stacked avatars + overflow count |
| `rating` | NEW | Stars |
| `qr` | NEW | |
| `icon` | NEW | First-class icon widget (lucide) |
| `separator` | ★ | Primitive ready |

## 7. Enterprise Verticals

| Widget | Status | Notes |
|---|---|---|
| `org-chart` | NEW | Could share infra with c4/workflow graph |
| `audit-log` | NEW | Actor + action + diff timeline |
| `activity-feed` | NEW | Overlap with `feed` — extend or alias |
| `comment-thread` | NEW | Nested replies, mentions |
| `people-picker` | NEW | Combobox specialized for users with avatars |
| `permission-matrix` | NEW | Role × permission grid |
| `bulk-action-bar` | NEW | Appears on row selection |
| `saved-views` | NEW | Table view switcher |
| `pricing-table` | NEW | Tier compare |
| `invoice-lines` | NEW | Billing rows + totals |
| `api-key` / `secret-reveal` | NEW | Masked + copy + rotate |
| `settings-list` | NEW | Labeled rows with controls |

---

## Recommended Sequencing

### Wave 1 — Quick wins (1–2 days)

Wire the 8 ★ primitives and ship the inline micro-components. Massive coverage for LLM-rendered output with near-zero net-new code.

- ★ `separator`, `alert`, `tooltip`, `accordion`, `sheet`, `popover`, `slider`, `radio-group`
- NEW (small): `toast`, `dropdown-menu`, `chip`, `icon`, `kbd`, `status-dot`, `trend`, `markdown`, `code-block`, `loading`, `empty-state`

### Wave 2 — Enterprise readiness (1–2 weeks)

Unlocks dashboards, CRUD apps, and admin panels.

- `data-grid`, `kanban`, `tree`, `list`/`virtual-list`
- `combobox`, `multi-select`, `date-picker`, `time-picker`, `file-upload`, `command-palette`, `form`, `filter-bar`
- `app-shell`, `sidebar`, `breadcrumb`, `page-header`, `split`, `stepper`, `master-detail`

### Wave 3 — Opportunistic / heavy

Build when a real use case lands.

- Visualizations: `sparkline`, `heatmap`, `funnel`, `treemap`, `gauge`, `progress-ring`
- Heavy editors: `rich-text`, `code-editor` (EXT)
- Scheduler / `gantt`, `pivot` (EXT)
- Enterprise verticals: `org-chart`, `audit-log`, `comment-thread`, `permission-matrix`, `pricing-table`, `invoice-lines`, `api-key`, `settings-list`, `people-picker`, `bulk-action-bar`, `saved-views`

---

## Totals

- **~70 widgets** identified across 7 categories
- **8** are free wins from already-installed shadcn primitives
- **~10 more** are small inline components that fit Wave 1
- **~17** are core enterprise widgets in Wave 2
- The remainder is Wave 3 / opportunistic
