# Ripple Layout Widgets — flex, grid, card, tabs, container, dashboard, glass-card

Layout widgets control how child widgets are arranged on screen. They all accept `children`.

## flex

Flexbox container. The primary layout widget for stacking items vertically or horizontally.

**Props:**
- `direction`: "row" | "column" | "row-reverse" | "column-reverse" (default: "row")
- `justify`: "start" | "end" | "center" | "between" | "around" | "evenly"
- `align`: "start" | "end" | "center" | "baseline" | "stretch"
- `gap`: number (multiplied by 4px) or string (e.g. "16px", "1rem")
- `wrap`: boolean | "wrap" | "nowrap" | "wrap-reverse"
- `variant`: "default" | "divided" (adds borders between children) | "compact" (removes gaps)

**Supports:** children

**Example — vertical stack with spacing:**
```json
{
  "type": "flex",
  "props": { "direction": "column", "gap": "16px" },
  "children": [
    { "type": "heading", "props": { "text": "Title", "level": 2 } },
    { "type": "text", "props": { "text": "Description here" } }
  ]
}
```

**Example — horizontal row with space-between:**
```json
{
  "type": "flex",
  "props": { "direction": "row", "justify": "between", "align": "center" },
  "children": [
    { "type": "text", "props": { "text": "Left side" } },
    { "type": "badge", "props": { "text": "Status", "variant": "success" } }
  ]
}
```

## grid

CSS grid layout. Best for dashboards, card grids, equal-width columns.

**Props:**
- `columns`: number (creates repeat(n, 1fr)) or string (e.g. "1fr 2fr 1fr")
- `rows`: number or string
- `gap`: number (multiplied by 4px) or string

**Supports:** children

**Example — 3-column dashboard:**
```json
{
  "type": "grid",
  "props": { "columns": 3, "gap": "12px" },
  "children": [
    { "type": "metric", "props": { "label": "Revenue", "value": "$45,230", "trend": "+12%" } },
    { "type": "metric", "props": { "label": "Users", "value": "1,234", "trend": "+5%" } },
    { "type": "metric", "props": { "label": "Orders", "value": "89", "trend": "-3%" } }
  ]
}
```

## card

Bordered container with optional title and description. Use for grouping related content.

**Props:**
- `title`: string (optional header)
- `description`: string (optional subtitle below title)
- `variant`: "default" | "selected" (blue ring) | "muted" (muted background)

**Supports:** children, on_click

**Example:**
```json
{
  "type": "card",
  "props": { "title": "Revenue Overview", "description": "Last 30 days" },
  "children": [
    { "type": "chart", "props": { "type": "line", "data": [...] } }
  ]
}
```

## tabs

Tabbed content switcher. Each child renders in the corresponding tab.

**Props:**
- `tabs`: array of strings or { value, label } objects
- `defaultValue`: string (initially selected tab value)
- `value`: string (controlled tab value)

**Supports:** children (one per tab), on_change

**Example:**
```json
{
  "type": "tabs",
  "props": {
    "tabs": ["Overview", "Details", "Settings"],
    "defaultValue": "Overview"
  },
  "children": [
    { "type": "text", "props": { "text": "Overview content" } },
    { "type": "text", "props": { "text": "Details content" } },
    { "type": "text", "props": { "text": "Settings content" } }
  ]
}
```

## container

Simple div wrapper. Use when you need a plain container with click handling or custom styling.

**Props:** none (just a wrapper)
**Supports:** children, on_click, class, style

## dashboard

Auto-fill grid layout for dashboard widgets. Uses CSS auto-fill with minimum column width.

**Props:**
- `columnMin`: string (default "240px") — minimum column width
- `gap`: string (default "12px")

**Supports:** children (typically dashboard-slot widgets)

## dashboard-slot

Child of dashboard. Controls column spanning for individual widgets.

**Props:**
- `slotId`: string (required)
- `itemId`: string (required)
- `span`: number | "auto" (default 1) — columns to span

**Supports:** children

## glass-card

Glass morphism effect card with blur and tint.

**Props:**
- `title`: string
- `description`: string
- `opacity`: number 0-100 (default 38)
- `blur`: number in px (default 8)
- `tint`: color string (default "#000000")
- `borderGlow`: boolean (default true)

**Supports:** children, on_click
