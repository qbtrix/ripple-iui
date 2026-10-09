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

### `illustration`

A small animated SVG drawing the model writes. The widget never renders the string: it parses it with `DOMParser` and rebuilds an allowlisted copy with `createElementNS`, dropping anything else silently. Display only: no bind, no events.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `svg` | `string` | (required) | SVG markup, root `<svg viewBox='...'>`. Attributes in single quotes so the JSON needs no escaping |
| `title` | `string` | (required) | Accessible name (the art is `role="img"`) |
| `caption` | `string` | — | Line under the art |
| `max_height` | `number` | `320` | Height cap in px, clamped to 80..640 |

- Allowed elements: `svg g defs title desc path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath mask symbol use animate animateTransform animateMotion mpath set`. No filters, `<image>`, `<style>`, `<a>`, `<foreignObject>` or scripts.
- References only as `url(#id)` and `href='#id'` on `use`/`mpath` (use plain `href`; `xlink:href` needs an `xmlns:xlink` declaration or the markup fails to parse). No `style` attribute, no `on*` handlers. Animations may only target presentation attributes (`fill`, `opacity`, `transform`, `cx`, `d`, ...).
- Caps: 24,000 chars, 400 elements, depth 24, 40 animation elements, every `dur` at least 0.5s, `repeatCount` at most 1000 or `indefinite`, at most 40 `use` elements and no `use` pointing at another `use` or a group holding one. Past a cap, or while the markup is still streaming in, the widget shows a quiet placeholder at `max_height`.
- Ids are prefixed per instance (and so are their `url(#..)`, `href` and `begin`/`end` refs), so two cards never collide.
- Under `prefers-reduced-motion` the art starts paused; animated art gets a small pause/play button.
- Text is kept readable. Write label text with `fill='currentColor'`: it is the card's text colour, so it reads in light and dark. Any other `text`/`tspan` fill (or none, which SVG draws black) that falls under 3:1 contrast against what it sits on, a solid shape under it or else the card, is swapped for the card's text or background colour, whichever reads better. It runs again when the theme changes. `url(#..)` fills and `currentColor` are never changed.
- Hosts that want to refuse a card instead of rendering a cleaned one call `checkIllustrationSvg(markup)` from `@ripple-ui/svelte`; the lists are data in `@ripple-ui/core/manifest` (`ILLUSTRATION_*`). The contract is the illustration design doc of 2026-10-09.

```json
{ "type": "illustration", "props": { "title": "Sun rising over two hills", "svg": "<svg viewBox='0 0 200 120'><circle cx='100' cy='110' r='18' fill='#ffb703'><animate attributeName='cy' from='110' to='48' dur='3s' fill='freeze'/></circle></svg>" } }
```

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
| `icon` | choice icon key | none | Flow choice cards only: the tile icon (keys below) |
| `description` | `string` | none | Flow choice cards only: a one-line hint under the label |

**Events:** `onclick`

**Choice cards in a flow step.** When a flow `select` step's buttons each emit
`flow.next` or `flow.submit` with `value.selection`, SelectLayout renders them as
choice cards (OptionList `layout: 'cards'`): a tile per option with an icon, the
label and the `description` hint, selected in the accent with a check. Each tile
wraps a real radio input (checkbox when the step has `selection: 'multiple'`).
Click, Enter or Space picks and advances the flow once; the arrow keys move the
selection without advancing. The grid is container-query sized: one column,
two from 480px, three when there are 3 or 6 short options. `icon` must be one of
these keys, anything else is ignored: work, school, creative, gaming, everyday, travel, light, home, budget, mid, premium, power, food, veg, meat, fish, sweet, coffee, drinks, culture, outdoors, relax, shopping, morning, afternoon, evening, night, solo, couple, family, group, days, quick. Without a valid key the icon is
guessed from the label, then the hint; no match means no icon. Set
`display: { layout: 'list' }` on the step to keep the one-column rows.

```json
{
  "flowId": "main_use", "intent": "select", "title": "What will you use it for most?",
  "ui": { "type": "flex", "props": { "direction": "column" }, "children": [
    { "type": "button", "props": { "label": "Work and study", "icon": "work", "description": "Docs, email, video calls" },
      "on_click": { "action": "emit", "target": "flow.next", "value": { "selection": { "id": "work", "label": "Work and study" } } } },
    { "type": "button", "props": { "label": "Gaming", "icon": "gaming", "description": "Recent games at good frame rates" },
      "on_click": { "action": "emit", "target": "flow.next", "value": { "selection": { "id": "gaming", "label": "Gaming" } } } }
  ] }
}
```

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
| `comparison-layout` | "Which should I pick": 2–6 items, a `winner` best-pick card with its reason, `picks` tags, features by `kind` with the best cell marked per `better`, each price's difference from the winner, a per-item card or table view. Binds `chosen` (the item id); `on_choose` gets `{id, name, product_id?}` |
| `entity-detail` | Record / profile / entity page — header, properties, tabs |
| `form-layout` | Multi-section form with grouped fields, validation, and a submit/cancel action row |
| `wizard-layout` | Multi-step setup or onboarding flow with stepper, per-step body, and Back/Next actions |
| `checklist-layout` | Launch checklist / pre-flight / runbook with grouped items, completion progress, and per-item details |
| `report-layout` | Long-form report with sections, embedded data widgets, and callouts |
| `invoice-layout` | Invoice / quote / receipt with line items, computed totals, and download actions |
| `order-status` | Multi-step shipment tracking with stepper, ETA, embedded `map` widget when geo data is supplied, and event timeline. Delivery or pickup (`ready-for-pickup`, `picked-up`) pipeline; the final step shows done. A polled `tracker` glides between positions |
| `itinerary` | Day-by-day trip plan: route strip, planned spend vs `budget`, collapsible days with a time rail of `stops` (tick one, add one), transport `legs` and `packing`. Bind `days` |
| `booking` | Table or service booking in stages (what, when, details, review) on store `services` and `days`; pre-selects the slot nearest `preferred`, fires `on_book`, binds `selection` |
| `menu-order` | Order from a menu inside a chat card: browse (featured pick, photo cards), customise (option tiles with icons inferred from names, or an `icon` key from `OPTION_ICONS`), details, review. Binds `cart`; emits `on_checkout` with the cart. Ordering shows only when the server sets `checkout: true` |
| `growth-projection` | Savings growth from `initial`, monthly `deposit`, `rate` (% a year) and `years`: final balance, deposits-vs-growth chart, yearly table, optional `goal` and `inflation`, sliders to retune. Bind `deposit` |
| `bill-split` | Split a bill with tip: `subtotal` (before tip and tax), optional `tax` (on top, shared in proportion), `tip_percent` with chips (`tip_options`) and a custom box, `people` `{ id, name, extras? }` (2 to 12; `extras` is what a person had on top, e.g. drinks). Cents-exact shares that add up to the total, a card per person, bill / tip / total row. Bind `value` `{ subtotal, tip_percent, people }` |
| `recipe` | One dish: photo or kind icon, meta chips, a servings stepper that rescales numeric `qty` (1.5 cups prints 1½), tickable `ingredients`, numbered `steps` with timers and tips, kcal and protein per serving. Bind `servings` |
| `meal-plan` | A week from one `recipes` library: `days` of meals by slot (cards below 720px, a days-by-slots grid above), swap per meal, protein and calories per day against `goal`, a shopping list summed per ingredient and scaled to `people`, grouped by aisle. Opening a meal shows its recipe. Bind `people` |
| `interval-workout` | Interval workout timer: `exercises` (name, cue, kind), `workSec`, `restSec`, `rounds`. Counts work and rest down in seconds on a ring, shows current and next exercise, back/pause/next, session progress by round; pauses on a hidden tab. Binds `workSec` (applies from the next interval) |
| `board-game` | Tic-tac-toe or connect-four against a built-in computer: `game`, `player` (X or O, red or yellow), `first` (player or computer), `difficulty` (easy random, medium wins or blocks, hard searches ahead and is unbeatable at tic-tac-toe), `best_of` (1, 3, 5; omit for open-ended). Detects wins and draws, strikes the winning line or glows the winning four, keeps the score; Rematch and New series; arrow keys and Enter play it. Binds `value` (`{ board, turn, result, series }`); emits `on_complete` once per finished series with `{ winner, series }` |
| `flashcard-deck` | Study deck of `cards` (front, back, hint, category): flip, mark Got it or Missed it, progress dots, then a score screen listing missed cards with Practise missed (re-deals only those) and Restart. Binds `score`; emits `on_complete` with `{ score, total }` |
| `exec-dashboard` | KPI dashboard from raw `rows` plus `measures` (sum, avg, count) and `dimensions`: it computes the KPIs with trends, a column chart along `x` (stacked by `split`), a breakdown and a filtered table with totals. A filter chip recomputes every number. Binds `filters`; `on_filter` gets `{key, value}`. Prebuilt `kpis`/`primaryChart`/`table` still work |
| `ops-dashboard` / `analytics-dashboard` / `pipeline-dashboard` / `project-dashboard` | Pre-composed dashboard variants for common business surfaces |

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
| `reservation`, `appointment` | `booking` |
| `food-menu`, `order-menu` | `menu-order` |
| `workout-timer`, `interval-timer`, `hiit-timer` | `interval-workout` |
| `flashcards`, `study-deck`, `flip-cards` | `flashcard-deck` |
| `tic-tac-toe`, `connect-four` | `board-game` (the alias picks `game` when it is missing) |
| `wizard` | `wizard-layout` |
| `checklist` | `checklist-layout` |
| `trip-plan`, `travel-itinerary` | `itinerary` |
| `savings-projection`, `compound-interest` | `growth-projection` |
| `split-bill`, `bill-splitter` | `bill-split` |
| `recipe-card` | `recipe` |
| `meal-planner`, `weekly-meal-plan` | `meal-plan` |
| `report` | `report-layout` |
| `frame`, `nested-spec` | `ripple-frame` |
| `tour` | `coachmark` |
