---
{
  "title": "Partial JSON Parser — Truncated Enum Guard for Progressive Streaming",
  "summary": "This module wraps the `partial-json` library to add a critical safety layer: enum-typed fields (`type`, `intent`, `version`, `action`, `variant`) are held back while the buffer ends inside their string value. Without this guard, progressive renders would briefly flash \"Unknown widget type\" errors as LLM output streams in character-by-character.",
  "concepts": [
    "parsePartialSpec",
    "ParseResult",
    "openEnumKeyAt",
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

The fix: for a defined set of enum-like keys, hold the value back while the buffer ends inside it.

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

The function trims, asks `openEnumKeyAt` whether the buffer ends inside an enum-key value, and if it does, parses the buffer cut just before that key (partial-json drops the dangling `,` cleanly). Otherwise it parses the whole buffer. Hard parse failures return `{ value: null }`, and `streamSpec` skips that emission.

## openEnumKeyAt: decide by position, not by value

```typescript
function openEnumKeyAt(json: string): number
```

Only the string the buffer ends inside can be truncated; every other string in the tree is complete. So the check scans quote state from the start of the buffer, honouring backslash escapes (`\"` stays inside the string, `\\"` closes it), and remembers the last two strings it saw. If the buffer ends inside a string, the string before it is a key followed by `:`, and that key is in `ENUM_KEYS`, it returns the key's opening-quote index. Otherwise -1.

Matching by value instead (is this text closed anywhere in the buffer?) gives the wrong answer when the same text is closed elsewhere: an empty `"type":"` reads as closed once any `""` appeared earlier, and a child's half-typed `"type":"flex` reads as closed after a parent's `"type":"flex"`. Both are pinned in `stream-spec.test.ts`.

## Known Gaps

- A new enum-like prop on a custom widget is not protected until its key joins `ENUM_KEYS`.
