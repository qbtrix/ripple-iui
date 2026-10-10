// json-parse.ts — Thin wrapper over partial-json that drops truncated values
// for enum-like keys so progressive renders never surface "Unknown widget type"
// or invalid intent names. Text content streams progressively (Allow.STR stays
// on), except that a half-written expression at the end of a string value is
// held back: `"Card 1 of {state.ca` parses as "Card 1 of", never as source.
//
// Only the string the buffer ends inside can be truncated, so the check is by
// position, not by value: a matching closed value elsewhere in the buffer (an
// earlier `""`, a parent `"type":"flex"`) says nothing about the trailing one.
// Closed strings are never touched, so a literal brace in a finished string
// shows as written.
// Created: 2026-04-16

import { parse, Allow } from 'partial-json';

const ENUM_KEYS: ReadonlySet<string> = new Set([
  'type',
  'intent',
  'version',
  'action',
  'variant',
]);

export const DEFAULT_ALLOW = Allow.OBJ | Allow.ARR | Allow.STR;

export interface ParseResult {
  /** Parsed value with a truncated enum value dropped. null on hard parse failure. */
  value: unknown;
}

/**
 * Parses a partial JSON buffer, dropping a truncated enum-key value and a
 * trailing half-written expression.
 *
 * partial-json happily returns `{ type: "fl" }` for `{"type": "fl`, which
 * would make NodeRenderer paint a red "Unknown widget type" card, and
 * `{ text: "{state.bi" }` for `{"text": "{state.bi`, which the resolver can't
 * match (no closing brace) and would print as source. We parse the buffer cut
 * at the point `cutAt` finds instead.
 */
export function parsePartialSpec(buffer: string, allow: number = DEFAULT_ALLOW): ParseResult {
  const trimmed = buffer.trim();
  if (trimmed.length === 0) return { value: null };

  try {
    const cut = cutAt(trimmed);
    return { value: parse(cut < 0 ? trimmed : trimmed.slice(0, cut), allow) };
  } catch {
    return { value: null };
  }
}

/**
 * Where to cut `json` before parsing, or -1. Only applies when `json` ends
 * inside a string:
 * - the value of an enum key: cut before the key, so the field is absent until
 *   its closing quote arrives;
 * - any other value holding an expression opener with no `}` after it: cut at
 *   that `{` (the first one after the string's last `}`, the same span the
 *   resolver's `\{[^}]+\}` would take once it closes), keeping the text before.
 * A truncated property name needs no rule: partial-json drops it whole, cut
 * or not. Quote state is scanned from the start, honouring backslash escapes.
 */
function cutAt(json: string): number {
  let inString = false;
  let escaped = false;
  let openAt = -1; // opening quote of the latest string
  let closeAt = -1; // closing quote of the latest closed string
  let prevOpenAt = -1; // opening quote of the string before the latest
  let prevCloseAt = -1;
  let braceAt = -1; // first `{` after the last `}` in the latest string

  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') {
        inString = false;
        closeAt = i;
      } else if (c === '{') {
        if (braceAt < 0) braceAt = i;
      } else if (c === '}') braceAt = -1;
    } else if (c === '"') {
      inString = true;
      prevOpenAt = openAt;
      prevCloseAt = closeAt;
      openAt = i;
      braceAt = -1;
    }
  }

  if (!inString) return -1;

  // `"key"` `:` `"...`: the previous string is this value's key.
  const isEnumValue =
    prevOpenAt >= 0 &&
    /^\s*:\s*$/.test(json.slice(prevCloseAt + 1, openAt)) &&
    ENUM_KEYS.has(JSON.parse(json.slice(prevOpenAt, prevCloseAt + 1)));
  return isEnumValue ? prevOpenAt : braceAt;
}
