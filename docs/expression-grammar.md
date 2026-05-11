# Ripple Expression Grammar

Ripple specs use a small, deliberately bounded expression language. The
resolver lives in [`src/lib/core/expression-resolver.ts`](../src/lib/core/expression-resolver.ts);
the matching write-time validator (Python) is at
[`backend/ee/cloud/ripple_validator.py`](../../backend/ee/cloud/ripple_validator.py).

The two files together are the contract — anything you can write here, the
validator must accept; anything new the validator allows, the resolver
must evaluate. **Do not extend one without the other.**

## Where expressions appear

Inside any string-typed prop, surrounded by single curly braces:

```json
{ "type": "text", "props": { "text": "Hello {state.name}!" } }
```

A string with a single top-level `{…}` returns the raw evaluated value
(preserving its type — array, object, number, etc.). A string with
embedded `{…}`s is interpolated to a final string.

Strings inside the spec's `state` object are **not** expressions —
they're seed values. Write `{state.x}` only inside `props`, `bind`,
`condition`, `items`, `class`, event handler `value`/`url`/`message`/
`body`/etc.

## Supported syntax

| Form                              | Example                                                | Returns                  |
| --------------------------------- | ------------------------------------------------------ | ------------------------ |
| Path                              | `{state.user.name}`                                    | the value at the path    |
| Bracket index                     | `{state.byLang['Astro']}`, `{state.repos[0].name}`     | indexed value            |
| Loop context                      | `{item}`, `{item.title}`, `{index}`                    | per-iteration value      |
| Event payload                     | `{event}`                                              | from `on_change`/etc.    |
| Comparison                        | `{state.n > 0}`, `{state.x == 'on'}`, `{a !== b}`      | boolean                  |
| Logical                           | `{a && b}`, `{a \|\| b}`, `{!flag}`                    | boolean                  |
| Null-coalesce                     | `{state.label ?? 'Untitled'}`                          | first non-null/undefined |
| Ternary                           | `{state.ok ? 'yes' : 'no'}`                            | one of the two branches  |
| Arithmetic                        | `{state.x + 1}`, `{a * b}`, `{a / b}`                  | number (or concat)       |
| String literal                    | `'foo'`, `"foo"`                                       | the string               |
| Number literal                    | `42`, `-1.5`                                           | the number               |
| Boolean / null / undefined        | `true`, `false`, `null`, `undefined`                   | the literal              |
| **Array literal**                 | `[1, 2, 'x']`, `[state.x, state.y]`                    | array (each item evaluated) |
| **Object literal**                | `{a: 1, b: state.x}`, `{'a-b': 1}`                     | object (each value evaluated) |
| Method chain (whitelisted)        | `{state.repos.where('language', 'TS').sortBy('stars', 'desc')}` | result of the chain      |

### Whitelisted method calls

Only these methods are evaluated. Anything else returns `undefined`.

**On strings:** `toLowerCase()`, `toUpperCase()`, `trim()`,
`includes(s)`, `startsWith(s)`, `endsWith(s)`.

**On numbers:** `toFixed(n)`.

**On arrays:** `includes(v)`, `join(sep)`, `sum(field)`, `count()`,
`first()`, `last()`, `reverse()`, `limit(n)`, `where(field, value)`,
`whereIn(field, values)`, `sortBy(field, 'asc'|'desc')`.

`where('field', value)` is pass-through when `value` is `null`,
`undefined`, or `'All'` — so a "no filter" select binds directly with no
ternary fallback.

## Not supported

These produce silent runtime failures (`undefined`) and a write-time
warning from the validator:

- Arrow functions: `i => i.name`
- The `function`, `class`, `new`, `typeof`, `instanceof`, `await` keywords
- Loops: `for`, `while`
- Template literals (backticks)
- Spread: `...state.x`
- Custom methods (anything outside the whitelist above), including
  `.map`, `.filter`, `.find`, `.reduce`, `.flatMap` — use the array
  helpers (`.where`, `.sortBy`, etc.) instead.

## Why the grammar is bounded

Pockets are AI-generated. The grammar is a **contract between the LLM
and the renderer** — narrow enough that an unknown pattern is always a
spec bug, wide enough that the LLM rarely needs to invent.

Adding power to the grammar (e.g. arbitrary function calls) means the
LLM has more shapes to get wrong, the validator has more cases to
allow-list, and the security surface widens. Extend it only when the
existing primitives genuinely can't express what's needed — and update
the prompt, validator, and tests in the same change.
