# UISpec Reference (v1.0)

The UISpec is the low-level specification format for Ripple. It gives you full control over the widget tree, layout, and interactions.

## Top-Level Structure

```typescript
interface UISpec {
  version: '1.0';                              // Schema version
  state?: Record<string, any>;                 // Initial state values
  data?: Record<string, DataFetcher>;          // Named data fetchers
  ui: UINode;                                  // The root widget tree (required)
  theme?: ThemeOverrides;                      // Color/appearance overrides
  meta?: { title?: string; description?: string };
}
```

## UINode

Every node in the widget tree is a `UINode`:

```typescript
interface UINode {
  type: string;                                // Widget type (e.g. 'flex', 'button', 'text')
  id?: string;                                 // Unique identifier
  props?: Record<string, any>;                 // Widget-specific properties
  children?: UINode[];                         // Child nodes
  bind?: string;                               // Two-way state binding (e.g. '{state.name}')
  show?: string;                               // Conditional visibility expression
  class?: string;                              // CSS class names
  style?: Record<string, string>;              // Inline CSS styles

  // Event handlers (single or array for chaining)
  on_click?: EventHandler | EventHandler[];
  on_change?: EventHandler | EventHandler[];
  on_submit?: EventHandler | EventHandler[];
  on_focus?: EventHandler | EventHandler[];
  on_blur?: EventHandler | EventHandler[];

  // Control flow (for 'each' widget)
  items?: string;                              // Data source path
  item_as?: string;                            // Loop variable name (default: 'item')
  index_as?: string;                           // Index variable name (default: 'index')

  // Control flow (for 'if' widget)
  condition?: string;                          // Boolean expression
  else_children?: UINode[];                    // Rendered when condition is false
}
```

## DataFetcher

Configure remote data loading:

```typescript
interface DataFetcher {
  url: string;                                 // API endpoint
  method?: 'GET' | 'POST';                     // HTTP method (default: 'GET')
  depends_on?: string[];                       // State paths that trigger refetch
  refresh_interval?: number;                   // Auto-refresh in seconds
  headers?: Record<string, string>;            // Request headers
  body?: Record<string, any>;                  // Request body (for POST)
  transform?: string;                          // Transform function name
}
```

## Complete Example

```json
{
  "version": "1.0",
  "state": {
    "selectedTab": "overview",
    "searchQuery": "",
    "items": [
      { "name": "Alpha", "status": "active", "value": 42 },
      { "name": "Beta", "status": "pending", "value": 17 }
    ]
  },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": 4 },
    "children": [
      {
        "type": "heading",
        "props": { "text": "Dashboard", "level": 1 }
      },
      {
        "type": "input",
        "props": { "placeholder": "Search...", "label": "Search" },
        "bind": "{state.searchQuery}",
        "on_change": { "action": "set", "target": "searchQuery" }
      },
      {
        "type": "tabs",
        "props": {
          "tabs": [
            { "value": "overview", "label": "Overview" },
            { "value": "details", "label": "Details" }
          ]
        },
        "bind": "{state.selectedTab}",
        "on_change": { "action": "set", "target": "selectedTab" },
        "children": [
          {
            "type": "table",
            "props": {
              "data": "{state.items}",
              "columns": [
                { "header": "Name", "accessorKey": "name" },
                { "header": "Status", "accessorKey": "status" },
                { "header": "Value", "accessorKey": "value" }
              ]
            }
          }
        ]
      },
      {
        "type": "if",
        "condition": "{state.searchQuery != ''}",
        "children": [
          {
            "type": "text",
            "props": { "text": "Searching for: {state.searchQuery}", "size": "sm" }
          }
        ],
        "else_children": [
          {
            "type": "text",
            "props": { "text": "Type to search", "size": "sm", "color": "#888" }
          }
        ]
      }
    ]
  },
  "theme": {
    "colors": {
      "primary": "#3b82f6"
    },
    "mode": "dark"
  }
}
```

## Validation

```typescript
import { parseUISpec, safeParseUISpec } from '@ripple-ui/svelte';

// Throws ZodError on invalid input
const spec = parseUISpec(jsonInput);

// Returns { success, data, error }
const result = safeParseUISpec(jsonInput);
if (result.success) {
  // result.data is a valid UISpec
}
```
