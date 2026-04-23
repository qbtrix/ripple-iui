---
{
  "title": "Ripple Research \u0026 Domain Widgets",
  "summary": "A comprehensive collection of specialized UI widgets designed for research interfaces, financial data visualization, and content-heavy layouts. Includes 15+ reusable components for displaying sources, citations, financial information, timelines, and news content.",
  "concepts": [
    "source-card",
    "citation",
    "sources-bar",
    "discover-card",
    "follow-up",
    "company-header",
    "ticker",
    "kv-table",
    "timeline",
    "callout",
    "news-card",
    "analyst-bar",
    "range-bar",
    "research widgets",
    "financial data",
    "component props",
    "UI components"
  ],
  "categories": [
    "UI Components",
    "Research Tools",
    "Financial Data Visualization",
    "Content Display",
    "Widget Documentation",
    "Ripple Framework"
  ],
  "source_docs": [
    "6a0eea240ac102df"
  ],
  "backlinks": null,
  "word_count": 480,
  "compiled_at": "2026-04-11T12:37:52Z",
  "compiled_with": "claude-haiku-4-5-20251001",
  "version": 1
}
---

# Ripple Research & Domain Widgets — source cards, citations, timelines, tickers, news

Specialized widgets for research interfaces, financial data, and content-heavy layouts.

## source-card

Displays a research source with title, snippet, and URL. Use for search results, bibliography entries.

**Props:**
- `title`: string
- `snippet`: string (description/excerpt)
- `url`: string
- `favicon`: string (icon URL)
- `domain`: string

## citation

Inline citation reference. Use for footnotes, references within text.

**Props:**
- `number`: number (citation index)
- `title`: string
- `url`: string

## sources-bar

Horizontal scrollable bar of source thumbnails. Use at top/bottom of research views.

**Props:**
- `sources`: array of { title, url, favicon, domain }

## discover-card

Content discovery card with image, title, description. Use for recommendations, related content.

**Props:**
- `title`: string
- `description`: string
- `image`: string (URL)
- `category`: string

## follow-up

Suggested follow-up questions or actions. Use at the end of research results.

**Props:**
- `questions`: array of strings

## company-header

Company profile header with logo, name, ticker, price. Use for financial/company pages.

**Props:**
- `name`: string
- `ticker`: string
- `logo`: string (URL)
- `price`: string
- `change`: string

## ticker

Stock/crypto ticker display with price and change. Use for financial dashboards.

**Props:**
- `symbol`: string
- `price`: string | number
- `change`: string
- `direction`: "up" | "down"

## kv-table

Key-value pair table for displaying attributes. Use for specifications, metadata, details.

**Props:**
- `items`: array of { key, value } or object

**Example:**
```json
{
  "type": "kv-table",
  "props": {
    "items": [
      { "key": "Founded", "value": "2020" },
      { "key": "Employees", "value": "150" },
      { "key": "Headquarters", "value": "San Francisco, CA" },
      { "key": "Revenue", "value": "$12M ARR" }
    ]
  }
}
```

## timeline

Vertical timeline of events. Use for history, milestones, changelog.

**Props:**
- `items`: array of { title, date, description }

**Example:**
```json
{
  "type": "timeline",
  "props": {
    "items": [
      { "title": "Series A", "date": "2024-01", "description": "Raised $5M" },
      { "title": "Product Launch", "date": "2024-06", "description": "Launched v1.0" },
      { "title": "100K Users", "date": "2025-01", "description": "Hit milestone" }
    ]
  }
}
```

## callout

Highlighted callout box for important information. Use for warnings, tips, key insights.

**Props:**
- `title`: string
- `text`: string
- `variant`: "info" | "warning" | "error" | "success"

**Example:**
```json
{
  "type": "callout",
  "props": {
    "title": "Important",
    "text": "This action cannot be undone. Please review before proceeding.",
    "variant": "warning"
  }
}
```

## news-card

News article card with headline, source, date. Use for news feeds, press coverage.

**Props:**
- `headline`: string
- `source`: string
- `date`: string
- `url`: string
- `image`: string (URL)

## analyst-bar

Analyst consensus bar (buy/hold/sell). Use for financial research.

**Props:**
- `buy`: number
- `hold`: number
- `sell`: number

## range-bar

Horizontal range indicator (min/max with current value marker). Use for price ranges, metrics within bounds.

**Props:**
- `min`: number
- `max`: number
- `current`: number
- `label`: string