# Widgets Reference

Ripple includes 30+ built-in widgets organized into 7 categories. All widgets accept common props: `id`, `class`, `style`, and `onclick` (where applicable).

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
| `data` | `any[]` | `[]` | Row data array |
| `columns` | `{ header: string; accessorKey: string }[]` | `[]` | Column definitions |
| `variant` | `'default' \| 'compact' \| 'striped' \| 'minimal'` | `'default'` | Visual variant |
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

## Widget Aliases

| Alias | Maps To |
|-------|---------|
| `label` | `text` |
