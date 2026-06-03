---
{
  "title": "Partial JSON Parser — Truncated Enum Guard for Progressive Streaming",
  "summary": "This module wraps the `partial-json` library to add a critical safety layer: enum-typed fields (`type`, `intent`, `version`, `action`, `variant`) are stripped from parsed output unless their string value is provably closed in the raw buffer. Without this guard, progressive renders would briefly flash \"Unknown widget type\" errors as LLM output streams in character-by-character.",
  "concepts": [
    "parsePartialSpec",
    "ParseResult",
    "stripTruncatedEnums",
    "isStringClosed",
    "ENUM_KEYS",
    "DEFAULT_ALLOW",
    "partial-json",
    "truncated enum guard",
    "progressive rendering",
    "streaming JSON",
    "Allow flags",
    "buffer scanning"
  ],
  "categories": [
    "streaming",
    "parsing",
    "safety"
  ],
  "source_docs": [
    "1854ff087932c3a0"
  ],
  "backlinks": null,
  "word_count": 481,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/streaming/json-parse.ts` exists to solve a specific problem unique to streaming LLM output: `partial-json` correctly parses incomplete JSON by tolerating missing closing brackets and quotes — but that means a widget spec arriving as `{"type": "fl` would be parsed as `{ type: "fl" }`. The renderer would then look up `"fl"` in the widget registry, fail, and display an error.

The fix: for a defined set of enum-like keys, only pass the value through if the string is demonstrably closed in the raw buffer.

## ENUM_KEYS

```typescript
const ENUM_KEYS: ReadonlySet<string> = new Set([
  'type', 'intent', 'version', 'action', 'variant',
]);
```

These are the keys whose values must resolve to a valid member of a finite set (widget type, intent name, schema version, event action, toast variant). Text fields like `title`, `text`, or `description` are intentionally excluded — progressive text reveal is a desired feature, not a bug.

## parsePartialSpec

```typescript
export function parsePartialSpec(buffer: string, allow: number = DEFAULT_ALLOW): ParseResult
```

`DEFAULT_ALLOW` is `Allow.OBJ | Allow.ARR | Allow.STR` — objects, arrays, and strings are allowed to be incomplete; numbers, booleans, and `null` must be complete. This allows rich progressive rendering while still producing structurally useful partial documents.

The function: trims, calls `partial-json`'s `parse`, and if the result is a non-null object, passes it through `stripTruncatedEnums`. Hard parse failures (thrown by `partial-json`) return `{ value: null }` — null is always safe to render as "loading".

## stripTruncatedEnums

A recursive tree walk that removes any enum-key string value that `isStringClosed` reports as not yet terminated. Arrays are walked element-by-element; the function correctly recurses into nested child nodes.

## isStringClosed — The Subtle Part

```typescript
function isStringClosed(value: string, buffer: string): boolean
```

A naive `buffer.includes('"flex"')` check has a false-positive case:

```
{"type":"flex","children":[{"type":"flex
```

The parent's `type` is closed but the child's is not. `includes('"flex"')` returns `true` for both, so the child's truncated value would incorrectly survive the filter.

The fix: after finding the quoted pattern, the algorithm checks the character immediately following the closing quote. A valid closed string in a JSON document must be followed by `,`, `}`, `]`, or whitespace (or be at EOF). A character that continues the string — such as the still-being-typed content — does not satisfy this. The search continues to the next occurrence until a clean terminator is found or the buffer is exhausted.

## escapeForJsonString

Before scanning the buffer for `"value"`, the value itself is JSON-escaped (backslashes, quotes, newlines, tabs) so that the pattern match works on the literal bytes that appear in the raw JSON buffer, not the unescaped string value.

## Known Gaps

- The `isStringClosed` scan runs in O(n) over the full buffer for each enum-key value found in the parsed tree. For very large specs with many enum keys, this could become noticeable — but real UI specs are small relative to prose LLM output, so this is an accepted trade-off.