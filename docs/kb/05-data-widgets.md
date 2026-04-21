# Ripple Data Widgets — table and chart

Data widgets display structured data. These are the most complex widgets with rich configuration options.

## table

Data table with auto-column detection, status indicators, and row click handling.

**Props:**
- `data` or `rows`: array of objects (required — either key works)
- `columns`: array of column definitions (auto-detected from first row if omitted)
  - Column format: `{ "key": "fieldName", "label": "Display Name" }` or `{ "accessorKey": "fieldName", "header": "Display Name" }`
- `variant`: "default" | "compact" | "striped" | "minimal"
- `statusKey`: string — field name whose value determines a status dot color

**Events:** `on_click` on row (the clicked row object is passed as event data)

**Example — basic table:**
```json
{
  "type": "table",
  "props": {
    "columns": [
      { "key": "name", "label": "Name" },
      { "key": "email", "label": "Email" },
      { "key": "status", "label": "Status" }
    ],
    "rows": [
      { "name": "Alice Chen", "email": "alice@example.com", "status": "Active" },
      { "name": "Bob Smith", "email": "bob@example.com", "status": "Pending" },
      { "name": "Carol Wu", "email": "carol@example.com", "status": "Active" }
    ]
  }
}
```

**Example — compact table with status dots and row click:**
```json
{
  "type": "table",
  "props": {
    "variant": "compact",
    "statusKey": "status",
    "columns": [
      { "key": "symbol", "label": "Symbol" },
      { "key": "price", "label": "Price" },
      { "key": "change", "label": "Change" },
      { "key": "status", "label": "Status" }
    ],
    "rows": [
      { "symbol": "AAPL", "price": "$189.50", "change": "+2.3%", "status": "up" },
      { "symbol": "GOOGL", "price": "$141.20", "change": "-0.8%", "status": "down" }
    ]
  },
  "on_click": { "action": "set", "target": "selectedStock", "value": "{item.symbol}" }
}
```

**Rules:**
- Always provide at least 2 rows of data
- Column auto-detection works if you omit columns — keys from the first row object are used

## chart

Visualizes data as bar, line, pie, area, sparkline, candlestick, heatmap, gauge, or radar charts.

**Props:**
- `data`: array of DataPoint (required)
  - DataPoint: `{ "label": "string", "value": number }` (basic format)
  - Candlestick: `{ "label": "string", "open": number, "close": number, "high": number, "low": number }`
  - Multi-series: additional numeric keys beyond "value" become separate series
- `type`: "bar" | "line" | "pie" | "donut" | "area" | "sparkline" | "candlestick" | "heatmap" | "gauge" | "radar" (default: "bar")
- `title`: string (optional chart title)
- `height`: number in pixels (default: 200)
- `colors`: array of color strings
- `tooltip`: boolean (default: true)

**Example — bar chart:**
```json
{
  "type": "chart",
  "props": {
    "type": "bar",
    "title": "Monthly Revenue",
    "height": 300,
    "data": [
      { "label": "Jan", "value": 4200 },
      { "label": "Feb", "value": 3800 },
      { "label": "Mar", "value": 5100 },
      { "label": "Apr", "value": 4700 },
      { "label": "May", "value": 6200 }
    ]
  }
}
```

**Example — line chart with multiple series:**
```json
{
  "type": "chart",
  "props": {
    "type": "line",
    "title": "Sales vs Expenses",
    "data": [
      { "label": "Q1", "sales": 12000, "expenses": 8000 },
      { "label": "Q2", "sales": 15000, "expenses": 9500 },
      { "label": "Q3", "sales": 18000, "expenses": 11000 },
      { "label": "Q4", "sales": 22000, "expenses": 13000 }
    ]
  }
}
```

**Example — pie chart:**
```json
{
  "type": "chart",
  "props": {
    "type": "pie",
    "title": "Traffic Sources",
    "data": [
      { "label": "Organic", "value": 45 },
      { "label": "Paid", "value": 25 },
      { "label": "Social", "value": 20 },
      { "label": "Referral", "value": 10 }
    ]
  }
}
```

**Example — sparkline (inline mini chart, no axes):**
```json
{
  "type": "chart",
  "props": {
    "type": "sparkline",
    "height": 36,
    "data": [
      { "label": "1", "value": 23420 },
      { "label": "2", "value": 23485 },
      { "label": "3", "value": 23510 },
      { "label": "4", "value": 23680 },
      { "label": "5", "value": 23710 }
    ]
  }
}
```

**Rules:**
- Always provide at least 3 data points
- Sparklines are best at 24-48px height, inline next to metrics
- For multi-series, use consistent keys across all data points
- Candlestick charts need open/close/high/low fields
