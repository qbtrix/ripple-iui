# Widgets Reference

Ripple ships 150+ built-in widgets across nine categories. Every widget accepts the common props `id`, `class`, `style`, and (where applicable) `onclick`.

> **Canonical schema lives in [`dist/manifest.json`](../dist/manifest.json).** The manifest is generated from the same TypeScript prop declarations the runtime consumes, so it's always in sync. This page covers the high-traffic widgets in detail and lists the rest by category — refer to the manifest for full prop tables and runnable examples for everything else. The dev server also serves the manifest at `http://localhost:5174/manifest.json`.

---

## Layout Widgets

### `container`

Basic div wrapper. Renders children inside a `<div>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | `''` | CSS class names |
| `style` | `Record<string, string>` | — | Inline styles |

### `flex`

Flexbox layout container.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'row' \| 'column' \| 'row-reverse' \| 'column-reverse'` | `'row'` | Flex direction |
| `justify` | `'start' \| 'end' \| 'center' \| 'between' \| 'around' \| 'evenly'` | `'start'` | Justify content |
| `align` | `'start' \| 'end' \| 'center' \| 'baseline' \| 'stretch'` | `'stretch'` | Align items |
| `gap` | `number \| string` | — | Gap between items. Numbers are multiplied by 4px |
| `wrap` | `boolean \| 'wrap' \| 'nowrap' \| 'wrap-reverse'` | `false` | Flex wrap |
| `variant` | `'default' \| 'divided' \| 'compact'` | `'default'` | Layout variant. `divided` adds separators between children |

### `grid`

CSS Grid layout container.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `number \| string` | `1` | Number of columns, or a CSS grid-template-columns value |
| `rows` | `number \| string` | — | Number of rows, or a CSS grid-template-rows value |
| `gap` | `number \| string` | — | Gap between cells. Numbers are multiplied by 4px |

### `card`

Semantic card with optional header and content area. Wraps shadcn Card.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Card header title |
| `description` | `string` | — | Card header description |
| `variant` | `'default' \| 'selected' \| 'muted'` | `'default'` | Visual variant. `selected` shows a ring |

### `tabs`

Tab interface with automatic content switching.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `{ value: string; label: string }[]` | `[]` | Tab definitions |
| `defaultValue` | `string` | First tab | Initially selected tab |
| `value` | `string` | — | Controlled active tab |

**Events:** `onchange` fires with the new tab value.

### `dashboard`

Auto-fill grid layout with optional drag-to-swap via Swapy.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columnMin` | `string` | `'240px'` | Minimum column width for auto-fill |
| `gap` | `string` | `'12px'` | Gap between slots |
| `swappable` | `boolean` | `true` | Enable drag-to-swap |

### `dashboard-slot`

A slot inside a `dashboard`. Required for Swapy drag support.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slotId` | `string` | — | Unique slot identifier (required) |
| `itemId` | `string` | — | Unique item identifier (required) |
| `span` | `number \| 'auto'` | `1` | Column span |

### Layout gotchas

Two traps that bite when building master-detail (list + detail) layouts. Both hit a real deployment.

**1. Independent column scroll needs a fixed height, not `max-height`.** A CSS grid's implicit row stays `max-content`, so `max-height` clips the box but the columns never scroll on their own — the whole page scrolls as one. To make a grid's columns scroll independently, set a *fixed* `height` + `overflow: hidden` on the grid, and `overflow-y: auto` + `min-height: 0` on each column child. `grid`, `flex`, and `card` all accept a `style: Record<string, string>` passthrough (merged into the computed style in `Grid.svelte` line 46, `Flex.svelte` line 65, `Card.svelte` line 64) even though `style` isn't listed in their manifest prop tables.

```jsonc
{
  "type": "grid",
  "props": {
    "columns": "320px 1fr",
    "gap": "0px",
    "style": { "height": "calc(100vh - 64px)", "overflow": "hidden" }
  },
  "children": [
    { "type": "flex", "props": { "direction": "column",
      "style": { "overflow-y": "auto", "min-height": "0" } }, "children": [ /* list */ ] },
    { "type": "flex", "props": { "direction": "column",
      "style": { "overflow-y": "auto", "min-height": "0" } }, "children": [ /* detail */ ] }
  ]
}
```

**2. The `master-detail` widget gives you scroll + sticky for free — until you need custom list cards.** Its list pane and detail pane are each `overflow-auto`, so you get independent scroll and a sticky detail with no extra CSS, and its `detail` prop takes a full custom spec for a rich detail panel. But its *master list items* are not custom-templatable — only `valueKey` / `labelKey` / `descriptionKey` / `badgeKey`. The moment you want a bespoke list card (a score ring, custom badges), you can't express it through `master-detail`, so use `master-detail` when the list items are simple. If you need custom list cards, hand-roll a grid and apply the fixed-height + overflow recipe above — a hand-rolled master-detail with no bounded height scrolls as one page (the exact bug from trap 1).

---

## Display Widgets

### `text`

Text paragraph or inline span.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | `''` | Text content (supports expressions) |
| `size` | `'xs' \| 'sm' \| 'base' \| 'lg' \| 'xl' \| '2xl' \| '3xl'` | `'base'` | Font size |
| `weight` | `'normal' \| 'medium' \| 'semibold' \| 'bold'` | `'normal'` | Font weight |
| `color` | `string` | — | Text color (hex or rgb) |
| `inline` | `boolean` | `false` | Render as `<span>` instead of `<p>` |

### `heading`

Semantic heading element (h1-h6).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | `''` | Heading text |
| `level` | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | `2` | Heading level |

### `image`

Image display with fit and rounding controls.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | `''` | Image URL |
| `alt` | `string` | `''` | Alt text |
| `width` | `number \| string` | — | Width (px or CSS value) |
| `height` | `number \| string` | — | Height (px or CSS value) |
| `fit` | `'contain' \| 'cover' \| 'fill' \| 'none' \| 'scale-down'` | `'cover'` | Object fit |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Border radius |

### `badge`

Small label/tag component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | `''` | Badge text |
| `variant` | `'default' \| 'secondary' \| 'destructive' \| 'outline' \| 'success' \| 'warning'` | `'default'` | Badge style |

### `progress`

Progress bar.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Current value |
| `max` | `number` | `100` | Maximum value |
| `color` | `string` | — | Bar color override |
| `variant` | `'default' \| 'thin' \| 'thick'` | `'default'` | Height variant |

### `avatar`

User avatar with image and fallback.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | Avatar image URL |
| `alt` | `string` | `''` | Alt text |
| `fallback` | `string` | `'?'` | Fallback text when image fails |

### `metric`

Numeric metric display with optional trend badge.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Metric label (required) |
| `value` | `string \| number` | — | Metric value (required) |
| `trend` | `string` | — | Trend text (e.g. `'+12%'`). Prefix determines color: `+` green, `-` red |
| `description` | `string` | — | Additional description |
| `variant` | `'default' \| 'compact' \| 'horizontal'` | `'default'` | Layout direction |

### `feed`

Activity feed / event log.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `FeedItem[]` | `[]` | Feed entries (required) |
| `maxItems` | `number` | — | Limit visible items |

**FeedItem:**
```typescript
interface FeedItem {
  text: string;                    // Entry text
  time?: string;                   // Timestamp
  dot?: string;                    // Custom dot color (CSS color)
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
}
```

---

## Input Widgets

> **Binding contract.** Each input below uses a specific prop / event
> pair for two-way `bind`. The runtime source of truth is
> `src/lib/core/widget-bind-contract.ts`; see
> [State Management → Per-widget bind contract](./state-management.md#per-widget-bind-contract)
> for the full table and how to register a new one.

### `button`

Interactive button.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `'Button'` | Button text |
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `'default'` | Button style |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | Button size |
| `disabled` | `boolean` | `false` | Disabled state |

**Events:** `onclick`

### `input`

Text input field with optional label.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| number` | `''` | Current value |
| `placeholder` | `string` | `''` | Placeholder text |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url'` | `'text'` | Input type |
| `disabled` | `boolean` | `false` | Disabled state |
| `label` | `string` | — | Label text |

**Events:** `onchange` fires with the input value on each keystroke.

**Binding:** Use `bind: '{state.path}'` and `on_change: { action: 'set', target: 'path' }` for two-way binding.

### `select`

Dropdown select menu.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | Currently selected value |
| `placeholder` | `string` | `'Select...'` | Placeholder text |
| `options` | `(string \| { value: string; label: string })[]` | `[]` | Option list |
| `label` | `string` | — | Label text |
| `disabled` | `boolean` | `false` | Disabled state |

**Events:** `onchange` fires with the selected value.

### `checkbox`

Checkbox control with optional label.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | `false` | Checked state |
| `disabled` | `boolean` | `false` | Disabled state |
| `label` | `string` | — | Label text |

**Events:** `onchange` fires with the new boolean value.

**Binding:** Use `bind: '{state.path}'` — the bound value is passed as `checked`.

### `switch`

Toggle switch with optional label.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | `false` | Checked state |
| `disabled` | `boolean` | `false` | Disabled state |
| `label` | `string` | — | Label text |

**Events:** `onchange` fires with the new boolean value.

**Binding:** Use `bind: '{state.path}'` — the bound value is passed as `checked`.

---

## Data Widgets

### `table`

Data table with columns, variants, and row click support.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rows` | `Array<Record<string, unknown>>` | `[]` | Row objects (canonical name; `data` is also accepted as an alias) |
| `columns` | `Array<{ header?: string; accessorKey?: string; sortable?: boolean }>` | `[]` | Column definitions. `key`/`label` are accepted as aliases for `accessorKey`/`header` |
| `variant` | `'default' \| 'compact' \| 'striped' \| 'minimal'` | `'default'` | Visual variant |
| `sortable` | `boolean` | `false` | Enable click-to-sort headers |
| `searchable` | `boolean` | `false` | Show a search input that filters across visible columns |
| `pageSize` | `number` | — | Paginate; click prev/next to walk pages |
| `statusKey` | `string` | — | Column key for colored status dot |
| `onRowClick` | `EventHandler \| EventHandler[]` | — | Row click handler. Provides `item` and `index` in context |

### `chart`

Chart visualization powered by ECharts. Dynamically imported for code-splitting.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `{ label: string; value: number }[]` | — | Data points (required) |
| `type` | `'bar' \| 'line' \| 'pie' \| 'area' \| 'donut'` | `'bar'` | Chart type |
| `title` | `string` | — | Chart title |
| `height` | `number` | `200` | Chart height in pixels |
| `colors` | `string[]` | — | Custom color palette |
| `tooltip` | `boolean` | `true` | Show tooltips on hover |

---

## Control Flow Widgets

### `if`

Conditional rendering. Not a visible widget — controls which children render.

| Node Prop | Type | Description |
|-----------|------|-------------|
| `condition` | `string` | Boolean expression (e.g. `'{state.loggedIn}'`) |
| `children` | `UINode[]` | Rendered when condition is true |
| `else_children` | `UINode[]` | Rendered when condition is false |

### `each`

Loop iteration. Not a visible widget — repeats children for each item.

| Node Prop | Type | Description |
|-----------|------|-------------|
| `items` | `string` | Data source path (e.g. `'{state.users}'`, `'data.results'`) |
| `item_as` | `string` | Variable name for current item (default: `'item'`) |
| `index_as` | `string` | Variable name for current index (default: `'index'`) |
| `children` | `UINode[]` | Template rendered for each item |

Inside children, use `{item.field}` or `{yourAlias.field}` to access loop data.

---

## Composite Widgets

Composite widgets are typed full-pane layouts — emit ONE node and the whole pattern (header + body + actions) renders. Reach for them before rebuilding the same shape out of `flex` + `card` + inputs.

### Composite layouts (refer to manifest for full prop schema)

| Widget | When to use |
|--------|-------------|
| `comparison-layout` | Side-by-side comparison of 2–6 items with hero cards, section-tab feature grid, Card/Table view toggle |
| `entity-detail` | Record / profile / entity page — header, properties, tabs |
| `form-layout` | Multi-section form with grouped fields, validation, and a submit/cancel action row |
| `wizard-layout` | Multi-step setup or onboarding flow with stepper, per-step body, and Back/Next actions |
| `checklist-layout` | Launch checklist / pre-flight / runbook with grouped items, completion progress, and per-item details |
| `report-layout` | Long-form report with sections, embedded data widgets, and callouts |
| `invoice-layout` | Invoice / quote / receipt with line items, computed totals, and download actions |
| `order-status` | Multi-step shipment tracking with stepper, ETA, embedded `map` widget when geo data is supplied, and event timeline |
| `exec-dashboard` / `ops-dashboard` / `analytics-dashboard` / `pipeline-dashboard` / `project-dashboard` | Pre-composed dashboard variants for common business surfaces |

For prop tables and runnable examples, see [`dist/manifest.json`](../dist/manifest.json) or call `get_widget_spec` from your agent.

### `terminal`

Terminal/code output display with optional interactive input.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lines` | `TermLine[]` | `[]` | Terminal output lines |
| `interactive` | `boolean` | `false` | Show command input at bottom |
| `maxHeight` | `string` | `'300px'` | Max height before scrolling |
| `title` | `string` | — | Terminal title bar text |

**TermLine:**
```typescript
interface TermLine {
  text: string;                              // Line content
  type?: 'stdout' | 'stderr' | 'info' | 'command';  // Line type (affects color)
  timestamp?: string;                        // Optional timestamp
}
```

**Events:** `oncommand` fires with the command string when submitted (interactive mode).

---

## Other categories

The remaining widgets are documented in the [`docs/kb/`](./kb/) knowledge-base files (covering layout, display, input, data, control flow, composites, research, universal-spec) and exhaustively in `dist/manifest.json`. Highlights:

- **Overlay** — `alert`, `callout`, `tooltip`, `popover`, `dropdown-menu`, `toast`, `command-palette`, `context-menu`, `notification-center`, `error-state`, `coachmark`, `confirm-dialog`
- **Research** — `source-card`, `citation`, `sources-bar`, `discover-card`, `follow-up`, `kv-table`, `news-card`, `ticker`, `company-header`, `analyst-bar`, `range-bar`
- **Vertical / enterprise** — `pricing-table`, `settings-list`, `comment-thread`, `audit-log`, `api-key`, `people-picker`, `permission-matrix`, `org-chart`, `invoice-lines`, `bulk-action-bar`, `saved-views`
- **Extra layout** — `accordion`, `split`, `master-detail`, `app-shell`, `sidebar`, `breadcrumb`, `page-header`, `hero`, `section`, `collapsible`, `glass-card`
- **Extra data** — `data-grid`, `kanban`, `gantt`, `calendar`, `timeline`, `tree`, `tree-table`, `virtual-list`, `sparkline`, `gauge`, `funnel`, `heatmap`, `sankey`, `treemap`, `map`
- **Extra input** — `textarea`, `combobox`, `multi-select`, `radio-group`, `slider`, `rating`, `date-picker`, `time-picker`, `number-input`, `segmented`, `color-picker`, `file-upload`, `form`, `filter-bar`, `search`, `location-picker`

## Widget Aliases

The widget registry accepts several common aliases — pick whichever reads better in your spec.

| Alias | Maps To |
|-------|---------|
| `label` | `text` |
| `comparison`, `comparison-table` | `ComparisonTable` |
| `comparison-cards`, `compare` | `comparison-layout` |
| `dialog` | `modal` |
| `divider` | `separator` |
| `banner` | `alert` |
| `dropdown`, `menu` | `dropdown-menu` |
| `pricing`, `plans` | `pricing-table` |
| `audit` | `audit-log` |
| `comments` | `comment-thread` |
| `nav` | `sidebar` |
| `shell` | `app-shell` |
| `breadcrumbs` | `breadcrumb` |
| `list-detail` | `master-detail` |
| `filters` | `filter-bar` |
| `autocomplete` | `combobox` |
| `multiselect`, `tag-input` | `multi-select` |
| `datepicker`, `date` | `date-picker` |
| `timepicker`, `time` | `time-picker` |
| `fileupload`, `dropzone` | `file-upload` |
| `data-table`, `datatable` | `table` |
| `vlist`, `list` | `virtual-list` |
| `treeview` | `tree` |
| `treetable`, `nested-rows` | `tree-table` |
| `board` | `kanban` |
| `gantt-chart`, `roadmap` | `gantt` |
| `geo-map`, `tracking-map`, `route-map` | `map` |
| `geo-picker`, `pick-location` | `location-picker` |
| `notifications`, `inbox` | `notification-center` |
| `cmdk`, `command` | `command-palette` |
| `record-detail`, `entity-page` | `entity-detail` |
| `quote-layout`, `receipt` | `invoice-layout` |
| `shipment-tracker`, `order-tracking` | `order-status` |
| `wizard` | `wizard-layout` |
| `checklist` | `checklist-layout` |
| `report` | `report-layout` |
| `frame`, `nested-spec` | `ripple-frame` |
| `tour` | `coachmark` |
