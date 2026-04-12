---
{
  "title": "Ripple Display Widgets — Read-Only Content Components",
  "summary": "Display widgets are read-only components that render content without accepting user input. They support dynamic values through expressions and include text, heading, image, badge, progress, avatar, metric, and feed widgets.",
  "concepts": [
    "display widgets",
    "read-only components",
    "expressions",
    "text",
    "heading",
    "image",
    "badge",
    "progress",
    "avatar",
    "metric",
    "feed",
    "KPI",
    "dashboard",
    "activity timeline",
    "status indicators"
  ],
  "categories": [
    "UI Components",
    "Display Widgets",
    "Frontend Development",
    "Ripple Framework",
    "Content Rendering"
  ],
  "source_docs": [
    "97d6741517542988"
  ],
  "backlinks": null,
  "word_count": 591,
  "compiled_at": "2026-04-11T12:36:42Z",
  "compiled_with": "claude-haiku-4-5-20251001",
  "version": 1
}
---

# Ripple Display Widgets — text, heading, image, badge, progress, avatar, metric, feed

Display widgets show read-only content. They don't accept user input but support expressions for dynamic values.

## text

Renders text content. Supports inline or block mode.

**Props:**
- `text`: string (required) — supports expressions: `"Count: {state.count}"`
- `size`: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" (default: "base")
- `weight`: "normal" | "medium" | "semibold" | "bold" (default: "normal")
- `color`: hex or rgb string (e.g. "#ff0000", "rgb(255,0,0)")
- `inline`: boolean (default false) — renders as `<span>` instead of `<p>`

**Example:**
```json
{ "type": "text", "props": { "text": "Total: {state.items.length} items", "size": "lg", "weight": "bold" } }
```

## heading

Semantic heading element (h1-h6).

**Props:**
- `text`: string (required)
- `level`: 1 | 2 | 3 | 4 | 5 | 6 (default: 2)

**Example:**
```json
{ "type": "heading", "props": { "text": "Dashboard", "level": 1 } }
```

## image

Displays an image with sizing and fit controls.

**Props:**
- `src`: string URL (required)
- `alt`: string (accessibility text)
- `width`: number (px) or string
- `height`: number (px) or string
- `fit`: "contain" | "cover" | "fill" | "none" | "scale-down" (default: "cover")
- `rounded`: "none" | "sm" | "md" | "lg" | "xl" | "full" (default: "md")

**Example:**
```json
{ "type": "image", "props": { "src": "https://example.com/photo.jpg", "alt": "Team photo", "width": 400, "rounded": "lg" } }
```

## badge

Small label for status, tags, or categories.

**Props:**
- `text`: string (required)
- `variant`: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" (default: "default")

**Example:**
```json
{ "type": "badge", "props": { "text": "Active", "variant": "success" } }
```

## progress

Progress bar with optional custom color.

**Props:**
- `value`: number (default: 0)
- `max`: number (default: 100)
- `color`: string (CSS color)
- `variant`: "default" | "thin" | "thick" (default: "default")

**Example:**
```json
{ "type": "progress", "props": { "value": 73, "max": 100, "color": "#22c55e" } }
```

## avatar

Circular image with fallback text.

**Props:**
- `src`: string (image URL)
- `alt`: string
- `fallback`: string (shown when image fails, default: "?")

**Example:**
```json
{ "type": "avatar", "props": { "src": "https://example.com/avatar.jpg", "fallback": "JD" } }
```

## metric

Key metric display with label, value, and optional trend. Use for KPIs, stats, dashboards.

**Props:**
- `label`: string (required) — metric name
- `value`: string or number (required) — the main value
- `trend`: string — e.g. "+12%", "-3.5%". Auto-colored: + is green, - is red.
- `description`: string — extra context below the value
- `variant`: "default" | "compact" | "horizontal" (default: "default")

**Example — dashboard metrics:**
```json
{
  "type": "grid",
  "props": { "columns": 3, "gap": "12px" },
  "children": [
    { "type": "metric", "props": { "label": "Revenue", "value": "$45,230", "trend": "+12.5%" } },
    { "type": "metric", "props": { "label": "Customers", "value": "1,234", "trend": "+5.2%" } },
    { "type": "metric", "props": { "label": "Churn Rate", "value": "2.1%", "trend": "-0.3%", "description": "vs last month" } }
  ]
}
```

## feed

Activity feed / timeline with colored status dots.

**Props:**
- `items`: array of FeedItem (required)
  - `text`: string (required)
  - `time`: string (optional timestamp)
  - `type`: "default" | "success" | "warning" | "error" | "info" (determines dot color)
- `maxItems`: number (limit displayed items)

**Example:**
```json
{
  "type": "feed",
  "props": {
    "items": [
      { "text": "Deployment completed", "time": "2 min ago", "type": "success" },
      { "text": "Build started", "time": "5 min ago", "type": "info" },
      { "text": "Test failed: auth module", "time": "12 min ago", "type": "error" }
    ]
  }
}
```