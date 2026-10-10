---
title: State and expressions
description: Where a spec keeps its data, how inputs bind to it, and the expression language that reads it.
order: 2
---

A spec carries its own state. Widgets read it through expressions in braces, inputs write to it through `bind`, and actions change it. When a value changes, only the parts of the UI that read it update.

## Initial state

Put the starting values in `state`. Pass `state` to the component to override some of them:

```svelte
<Ripple {spec} state={{ user: { name: 'Ada' } }} />
```

The prop's values are merged over `spec.state`, so the prop wins.

## Paths

Every read and write uses a dot path:

```
count               -> state.count
user.profile.name   -> state.user.profile.name
items.0.selected    -> state.items[0].selected
```

Writing to a path that doesn't exist yet creates the objects along the way, so setting `a.b.c` on empty state gives `{ a: { b: { c: ... } } }`.

## Binding inputs

`bind` connects a widget to a state path in both directions. The widget shows the value, and editing the widget writes it back:

```ripple
{
  "version": "1.0",
  "state": { "email": "", "subscribe": false },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "12px" },
    "children": [
      { "type": "input", "bind": "email", "props": { "label": "Email", "placeholder": "you@example.com" } },
      { "type": "checkbox", "bind": "subscribe", "props": { "label": "Send me the newsletter" } },
      { "type": "text", "props": { "text": "{state.subscribe ? 'Subscribed as ' + state.email : 'Not subscribed'}" } }
    ]
  }
}
```

`bind: "email"` and `bind: "{state.email}"` mean the same thing. The short form is easier for a model to get right.

Widgets don't all expose their value the same way. Inputs and selects take `value` and fire `onchange`; checkboxes and switches take `checked`; a wizard binds its `currentStep`; a popover binds `open`. Ripple looks up each widget's binding contract and wires the right prop and event, so a spec always writes plain `bind`.

## Expressions

Any string in `props`, `show`, `condition`, `items`, `class`, `bind`, or an action's values can hold an expression in braces.

When the whole string is one expression, the result keeps its type. If `state.count` is `42`, then `"value": "{state.count}"` passes the number `42`.

When an expression sits inside other text, the result is always a string: `"You have {state.count} items"` becomes `"You have 42 items"`.

Strings inside the spec's `state` object are not expressions. They are plain starting values.

### What an expression can read

| Root | What it is | Example |
|---|---|---|
| `state` | The spec's state | `{state.user.name}` |
| `data` | Data the host passed in | `{data.users}` |
| `item`, `index` | The current `each` item and its index | `{item.price}` |
| your loop names | Set with `item_as` and `index_as` | `{flight.airline}` |
| `event` | The value a widget event carried, inside an action | `{event}` |

A path with no known root is read from state, so `{count}` is `{state.count}`. Optional chaining (`state.user?.name`) is accepted and behaves like `.`; a missing value gives `undefined` instead of an error.

### Syntax

| Form | Example |
|---|---|
| Path | `{state.user.name}` |
| Bracket index | `{state.byLang['Astro']}`, `{state.repos[0].name}` |
| Comparison | `{state.n > 0}`, `{state.x == 'on'}`, `{a !== b}` |
| Logical | `{a && b}`, `{a \|\| b}`, `{!flag}` |
| Null coalescing | `{state.label ?? 'Untitled'}` |
| Ternary | `{state.ok ? 'yes' : 'no'}` |
| Arithmetic | `{state.x + 1}`, `{a * b}`, `{a / b}` |
| Grouping | `{(state.subtotal + state.shipping) * (1 + state.tax / 100)}` |
| Literals | `'text'`, `"text"`, `42`, `-1.5`, `true`, `false`, `null`, `undefined` |
| Array literal | `[1, 2, 'x']`, `[state.x, state.y]` |
| Object literal | `{a: 1, b: state.x}` |
| Method chain | `{state.repos.where('language', 'TS').sortBy('stars', 'desc')}` |

`&&` and `||` short-circuit the way JavaScript does: `&&` returns the first falsy value, `||` the first truthy one. A method call binds tighter than any operator, so `{state.total / state.items.count()}` and `{state.items.count() > 0}` work as you'd expect.

### Methods

Only these methods run. Any other call returns `undefined`.

- **Strings:** `toLowerCase()`, `toUpperCase()`, `trim()`, `includes(s)`, `startsWith(s)`, `endsWith(s)`
- **Numbers:** `toFixed(n)`
- **Arrays:** `includes(v)`, `join(sep)`, `sum(field)`, `count()`, `first()`, `last()`, `reverse()`, `limit(n)`, `where(field, value)`, `whereIn(field, values)`, `sortBy(field, 'asc' | 'desc')`

`where(field, value)` returns the whole array when `value` is `null`, `undefined` or `'All'`. A filter select bound to "All" needs no ternary:

```ripple
{
  "version": "1.0",
  "state": {
    "lang": "All",
    "repos": [
      { "name": "atlas", "language": "TS", "stars": 420 },
      { "name": "harbor", "language": "Go", "stars": 310 },
      { "name": "lumen", "language": "TS", "stars": 95 }
    ]
  },
  "ui": {
    "type": "flex",
    "props": { "direction": "column", "gap": "12px" },
    "children": [
      {
        "type": "select",
        "bind": "lang",
        "props": {
          "label": "Language",
          "options": [
            { "value": "All", "label": "All" },
            { "value": "TS", "label": "TypeScript" },
            { "value": "Go", "label": "Go" }
          ]
        }
      },
      {
        "type": "text",
        "props": { "text": "{state.repos.where('language', state.lang).count()} repos, {state.repos.where('language', state.lang).sum('stars')} stars" }
      }
    ]
  }
}
```

### What an expression can't do

These return `undefined`:

- Arrow functions (`i => i.name`) and the keywords `function`, `class`, `new`, `typeof`, `instanceof`, `await`
- Loops (`for`, `while`)
- Template literals (backticks) and spread (`...state.x`)
- Any method outside the list above, including `.map`, `.filter`, `.find` and `.reduce`. Use `where`, `sortBy` and the other array helpers instead.

The language is small on purpose. A model writes these expressions, and a narrow grammar means an unknown pattern is always a bug in the spec rather than code that runs.

## Conditions

`show` on any node and `condition` on an `if` node take an expression and render when it is truthy. The braces are optional there, so `"show": "state.count > 0"` and `"show": "{state.count > 0}"` are the same.

## Expressions in actions

Values in an action are resolved when the action runs, not when the spec renders, so they always see current state:

```json
{ "on_click": { "action": "set", "target": "selected", "value": "{item.id}" } }
```

## Reading state from code

The component builds a `StateManager` for you. You can use the same class directly, for example in a test:

```ts
import { createStateManager } from '@ripple-ui/svelte';

const state = createStateManager({ count: 0, user: { name: 'Ada' } });

state.get('user.name');            // 'Ada'
state.set('count', 1);
state.update('count', (n) => (n as number) + 1);
state.has('count');                // true
state.delete('user.name');
state.reset({ fresh: true });      // replace everything
const stop = state.subscribe((path, value) => console.log(path, value));
```

`state.state` is a Svelte `$state` proxy, so reading it inside `$derived` or `$effect` tracks the read. To get notified of every change from outside a component, pass `onStateChange` to `<Ripple>`.

The expression functions are exported too, for hosts that want to evaluate an expression outside a render:

```ts
import { resolveString, evaluateCondition, hasExpressions } from '@ripple-ui/svelte';

const ctx = { state: { count: 5, name: 'Ada' } };
resolveString('Hello {state.name}!', ctx);    // 'Hello Ada!'
resolveString('{state.count}', ctx);          // 5
evaluateCondition('{state.count > 0}', ctx);  // true
hasExpressions('plain text');                 // false
```
