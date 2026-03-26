# Expressions

Ripple uses a `{expression}` syntax to create reactive bindings in props, conditions, and event handlers.

## Syntax

Expressions are wrapped in curly braces: `{expression}`. They can appear in:

- **Props**: `{ "text": "Hello {state.name}" }`
- **Conditions**: `"show": "{state.loggedIn}"`
- **Bindings**: `"bind": "{state.email}"`
- **Event values**: `"value": "{item.id}"`

## Path Resolution

Expressions resolve against a **context** containing these scopes:

| Root | Source | Example |
|------|--------|---------|
| `state` | StateManager | `{state.user.name}` |
| `data` | Data fetcher results | `{data.users}` |
| `item` | Current loop item | `{item.price}` |
| `index` | Current loop index | `{index}` |
| Custom names | `item_as` / `index_as` | `{flight.airline}` |

Paths without a known root prefix are assumed to be state paths:
- `{count}` is equivalent to `{state.count}`

### Optional Chaining

`?.` is supported and treated the same as `.` (null/undefined is handled gracefully):
- `{state.user?.name}` works safely if `user` is undefined

## Operators

### Comparison

```
{state.count > 0}
{state.count >= 10}
{item.price < 100}
{state.status == 'active'}
{state.status != null}
{state.type === 'premium'}
{state.type !== 'free'}
```

### Logical

```
{state.loggedIn && state.isAdmin}
{state.error || state.loading}
{!state.loading}
{!(state.error && state.critical)}
```

Logical operators follow JavaScript short-circuit behavior:
- `&&` returns the first falsy value, or the last value if all truthy
- `||` returns the first truthy value, or the last value if all falsy

### Ternary

```
{state.count > 0 ? 'Has items' : 'Empty'}
{state.theme == 'dark' ? '#000' : '#fff'}
```

### Grouping

Parentheses work for grouping:
```
{(state.a || state.b) && state.c}
```

## Single vs Template Expressions

**Single expression** — the entire string is one `{...}`. Returns the raw value (preserves type):
```json
{ "value": "{state.count}" }
```
If `state.count` is `42`, the prop receives the number `42`.

**Template expression** — expressions embedded in text. Always returns a string:
```json
{ "text": "You have {state.count} items" }
```
Returns `"You have 42 items"`.

## Literal Values

Inside expressions, these literals are recognized:

| Literal | Example |
|---------|---------|
| `null` | `{state.value != null}` |
| `undefined` | `{state.value != undefined}` |
| `true` / `false` | `{state.active == true}` |
| Numbers | `{state.count > 0}` |
| Strings | `{state.status == 'active'}` (single or double quotes) |

## Usage in Conditions

The `show` and `condition` props accept expressions that evaluate to boolean:

```json
{
  "type": "text",
  "show": "{state.items.length > 0}",
  "props": { "text": "Items found!" }
}
```

```json
{
  "type": "if",
  "condition": "{state.loggedIn && state.isAdmin}",
  "children": [...],
  "else_children": [...]
}
```

Curly braces in `show`/`condition` are optional — both `{state.count > 0}` and `state.count > 0` work.

## Usage in Event Handlers

Expression resolution happens at event invocation time, so values are always current:

```json
{
  "on_click": {
    "action": "api",
    "url": "/api/items/{state.selectedId}",
    "method": "DELETE"
  }
}
```

```json
{
  "on_click": {
    "action": "set",
    "target": "selectedItem",
    "value": "{item.id}"
  }
}
```

## API

```typescript
import {
  evaluateExpression,
  resolveString,
  resolveObject,
  resolveValue,
  evaluateCondition,
  hasExpressions,
  type ResolverContext
} from '@ripple-ui/svelte';

const ctx: ResolverContext = {
  state: { count: 5, name: 'Alice' },
  data: {},
  item: { id: 1 }
};

evaluateExpression('state.count > 0', ctx);       // true
resolveString('{state.name}', ctx);                // 'Alice'
resolveString('Hello {state.name}!', ctx);         // 'Hello Alice!'
evaluateCondition('{state.count > 0}', ctx);       // true
hasExpressions('Hello {state.name}');              // true
hasExpressions('plain text');                      // false
```
