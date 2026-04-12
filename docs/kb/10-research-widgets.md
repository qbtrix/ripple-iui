# Ripple Research & Domain Widgets — source cards, citations, timelines, tickers, news

Specialized widgets for research interfaces, financial data, and content-heavy layouts.

## source-card

Displays a research source with title, origin, and optional link. Use for search results, bibliography entries.

**Props:**
- `title`: string (required)
- `source`: string (required) — origin name
- `color`: string (default: primary theme color)
- `favicon`: string (icon URL)
- `url`: string (link to source)

**Events:** `onclick`

## citation

Inline citation reference with numbered badge. Use for footnotes, references within text.

**Props:**
- `source`: string (required) — citation source name
- `number`: number (citation index)
- `color`: string (default: primary theme color)
- `favicon`: string (icon URL)
- `url`: string (link)

**Events:** `onclick`

## sources-bar

Horizontal bar showing source references with copy/share actions. Use at top or bottom of research views.

**Props:**
- `sources`: array of { name, color?, favicon?, url? }
- `count`: number (total source count)
- `label`: string (default: "sources")
- `share`: boolean (default: true) — show share button
- `copy`: boolean (default: true) — show copy button

**Events:** `onclick`

## discover-card

Content discovery card with image, title, description. Use for recommendations, related content.

**Props:**
- `title`: string (required)
- `description`: string
- `image`: string (URL)
- `source`: string (origin name)
- `url`: string (link)

**Events:** `onclick`

## follow-up

Text input for follow-up questions. Use at the end of research results or chat responses.

**Props:**
- `placeholder`: string (default: "Ask follow-up")
- `submitLabel`: string (default: "Send")
- `event`: string (default: "follow-up") — event name emitted on submit

**Events:** `onsubmit` (fires with the typed text)

**Example:**
```json
{
  "type": "follow-up",
  "props": { "placeholder": "Ask a follow-up question...", "submitLabel": "Ask" }
}
```

## company-header

Company profile header with logo, ticker, price, and tags. Use for financial/company research pages.

**Props:**
- `name`: string (required)
- `ticker`: string (stock symbol)
- `exchange`: string (e.g. "NYSE", "NASDAQ")
- `description`: string
- `logo`: string (image URL)
- `domain`: string (website)
- `tags`: string array (e.g. ["SaaS", "Enterprise"])
- `price`: string
- `change`: string (e.g. "+2.50")
- `changePercent`: string (e.g. "+1.8%")
- `marketCap`: string (e.g. "$45B")

**Example:**
```json
{
  "type": "company-header",
  "props": {
    "name": "Stripe",
    "ticker": "STRP",
    "exchange": "NYSE",
    "description": "Financial infrastructure for the internet",
    "logo": "https://cdn.simpleicons.org/stripe/white",
    "tags": ["Fintech", "Payments", "SaaS"],
    "price": "$74.30",
    "change": "+2.15",
    "changePercent": "+2.98%",
    "marketCap": "$91B"
  }
}
```

## ticker

Stock/crypto ticker strip showing multiple symbols with prices. Use for financial dashboards.

**Props:**
- `items`: array of { symbol, price, change, changePercent? }

**Example:**
```json
{
  "type": "ticker",
  "props": {
    "items": [
      { "symbol": "AAPL", "price": "$189.50", "change": "+2.30", "changePercent": "+1.2%" },
      { "symbol": "GOOGL", "price": "$141.20", "change": "-1.10", "changePercent": "-0.8%" },
      { "symbol": "MSFT", "price": "$378.90", "change": "+5.60", "changePercent": "+1.5%" }
    ]
  }
}
```

## kv-table

Key-value pair table for displaying attributes. Use for specifications, metadata, company details.

**Props:**
- `rows`: array of { key, value }
- `columns`: 1 | 2 (default: 1) — single or two-column layout
- `striped`: boolean (default: true) — alternating row colors

**Example:**
```json
{
  "type": "kv-table",
  "props": {
    "columns": 2,
    "rows": [
      { "key": "Founded", "value": "2010" },
      { "key": "Employees", "value": "8,000+" },
      { "key": "Headquarters", "value": "San Francisco, CA" },
      { "key": "Revenue", "value": "$16.5B (2025)" },
      { "key": "CEO", "value": "Patrick Collison" },
      { "key": "Funding", "value": "$8.7B total" }
    ]
  }
}
```

## timeline

Vertical timeline of events with color-coded types. Use for company history, milestones, changelog.

**Props:**
- `events`: array of { date, title, detail?, type?, color? }
  - `type`: "default" | "success" | "warning" | "error" | "info"
- `maxItems`: number (limit displayed events)

**Example:**
```json
{
  "type": "timeline",
  "props": {
    "events": [
      { "title": "Series A", "date": "Jan 2024", "detail": "Raised $5M from Sequoia", "type": "success" },
      { "title": "Product Launch", "date": "Jun 2024", "detail": "Launched v1.0 to public", "type": "info" },
      { "title": "Security Incident", "date": "Sep 2024", "detail": "API keys exposed, patched in 2h", "type": "error" },
      { "title": "100K Users", "date": "Jan 2025", "detail": "Organic growth milestone", "type": "success" }
    ]
  }
}
```

## callout

Highlighted callout box for important information. Use for warnings, tips, key insights.

**Props:**
- `text`: string (required)
- `title`: string
- `variant`: "info" | "success" | "warning" | "insight" (default: "info")

**Example:**
```json
{
  "type": "callout",
  "props": {
    "title": "Key Insight",
    "text": "Revenue grew 40% YoY while customer acquisition cost dropped 15%, suggesting strong product-market fit.",
    "variant": "insight"
  }
}
```

## news-card

News article card with headline, source, time, and sentiment. Use for news feeds, press coverage.

**Props:**
- `headline`: string (required)
- `source`: string (required) — news outlet name
- `time`: string (e.g. "2 hours ago")
- `sentiment`: "bullish" | "bearish" | "neutral"
- `image`: string (URL)
- `url`: string (article link)

**Events:** `onclick`

**Example:**
```json
{
  "type": "news-card",
  "props": {
    "headline": "Stripe launches new AI-powered fraud detection",
    "source": "TechCrunch",
    "time": "3 hours ago",
    "sentiment": "bullish",
    "url": "https://techcrunch.com/..."
  }
}
```

## analyst-bar

Analyst consensus bar showing buy/hold/sell distribution. Use for financial research.

**Props:**
- `buy`: number (default: 0)
- `hold`: number (default: 0)
- `sell`: number (default: 0)
- `consensus`: string (e.g. "Strong Buy")
- `target`: string (price target, e.g. "$85.00")

**Example:**
```json
{
  "type": "analyst-bar",
  "props": { "buy": 18, "hold": 5, "sell": 2, "consensus": "Strong Buy", "target": "$85.00" }
}
```

## range-bar

Horizontal range indicator showing current value within min/max bounds. Use for price ranges, 52-week highs/lows.

**Props:**
- `min`: number (required)
- `max`: number (required)
- `current`: number (required)
- `label`: string
- `minLabel`: string (custom label for min)
- `maxLabel`: string (custom label for max)
- `currentLabel`: string (custom label for current)
- `color`: string (default: primary theme color)

**Example:**
```json
{
  "type": "range-bar",
  "props": { "min": 52.10, "max": 95.80, "current": 74.30, "label": "52-Week Range", "minLabel": "$52.10", "maxLabel": "$95.80" }
}
```
