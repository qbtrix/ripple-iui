# Ripple Input Widgets — button, input, select, checkbox, switch

Input widgets accept user interaction. They support `bind` for two-way state binding and event handlers for actions.

## button

Clickable button with variants. The primary action trigger.

**Props:**
- `label`: string (default: "Button") — button text
- `variant`: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" (default: "default")
- `size`: "default" | "sm" | "lg" | "icon" (default: "default")
- `disabled`: boolean

**Events:** `on_click`

**Example — simple action:**
```json
{
  "type": "button",
  "props": { "label": "Save Changes" },
  "on_click": { "action": "api", "url": "/api/save", "method": "POST", "body": { "name": "{state.name}" } }
}
```

**Example — chained actions (set state + show toast):**
```json
{
  "type": "button",
  "props": { "label": "Reset", "variant": "outline" },
  "on_click": [
    { "action": "set", "target": "count", "value": 0 },
    { "action": "toast", "message": "Counter reset!", "variant": "success" }
  ]
}
```

## input

Single-line text input with label. Use for names, emails, numbers, passwords, search fields.

**Props:**
- `value`: string or number
- `placeholder`: string
- `type`: "text" | "email" | "password" | "number" | "tel" | "url" (default: "text")
- `label`: string (optional label above the input)
- `disabled`: boolean

**Events:** `on_change` (fires with the new value)
**Bind:** `bind` for two-way state binding — `"{state.fieldName}"`

**Example — form field with binding:**
```json
{
  "type": "input",
  "props": { "label": "Email Address", "placeholder": "you@example.com", "type": "email" },
  "bind": "{state.email}"
}
```

**Example — search input with on_change:**
```json
{
  "type": "input",
  "props": { "placeholder": "Search...", "type": "text" },
  "bind": "{state.query}",
  "on_change": { "action": "api", "url": "/api/search?q={state.query}", "method": "GET" }
}
```

## select

Dropdown select with single value. Use for categories, filters, options.

**Props:**
- `value`: string (selected value)
- `placeholder`: string (default: "Select...")
- `options`: array of strings or { value, label } objects
- `label`: string (optional label above the select)
- `disabled`: boolean

**Events:** `on_change`
**Bind:** `"{state.fieldName}"`

**Example — filter dropdown:**
```json
{
  "type": "select",
  "props": {
    "label": "Status Filter",
    "placeholder": "All statuses",
    "options": [
      { "value": "all", "label": "All" },
      { "value": "active", "label": "Active" },
      { "value": "inactive", "label": "Inactive" }
    ]
  },
  "bind": "{state.statusFilter}"
}
```

## checkbox

Boolean toggle with optional label. Use for settings, agreements, multi-select options.

**Props:**
- `checked`: boolean
- `label`: string
- `disabled`: boolean

**Events:** `on_change` (fires with boolean)
**Bind:** `"{state.fieldName}"`

**Example:**
```json
{
  "type": "checkbox",
  "props": { "label": "I agree to the terms", "checked": false },
  "bind": "{state.agreed}"
}
```

## switch

Toggle switch with label. Similar to checkbox but different visual style. Use for on/off settings.

**Props:**
- `checked`: boolean
- `label`: string
- `disabled`: boolean

**Events:** `on_change`
**Bind:** `"{state.fieldName}"`

**Example:**
```json
{
  "type": "switch",
  "props": { "label": "Enable notifications", "checked": true },
  "bind": "{state.notifications}"
}
```

## Complete Form Example

```json
{
  "version": "1.0",
  "state": { "name": "", "email": "", "role": "", "newsletter": false },
  "ui": {
    "type": "card",
    "props": { "title": "Create Account" },
    "children": [
      {
        "type": "flex",
        "props": { "direction": "column", "gap": "12px" },
        "children": [
          { "type": "input", "props": { "label": "Full Name", "placeholder": "John Doe" }, "bind": "{state.name}" },
          { "type": "input", "props": { "label": "Email", "type": "email", "placeholder": "john@example.com" }, "bind": "{state.email}" },
          {
            "type": "select",
            "props": {
              "label": "Role",
              "options": ["Developer", "Designer", "Manager", "Other"]
            },
            "bind": "{state.role}"
          },
          { "type": "switch", "props": { "label": "Subscribe to newsletter" }, "bind": "{state.newsletter}" },
          {
            "type": "button",
            "props": { "label": "Create Account" },
            "on_click": [
              {
                "action": "api",
                "url": "/api/users",
                "method": "POST",
                "body": { "name": "{state.name}", "email": "{state.email}", "role": "{state.role}", "newsletter": "{state.newsletter}" }
              },
              { "action": "toast", "message": "Account created!", "variant": "success" }
            ]
          }
        ]
      }
    ]
  }
}
```
