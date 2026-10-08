// json-parse.ts — Thin wrapper over partial-json that drops truncated values
// for enum-like keys so progressive renders never surface "Unknown widget type"
// or invalid intent names. Text content streams progressively (Allow.STR stays on).
//
// Only the string the buffer ends inside can be truncated, so the check is by
// position, not by value: a matching closed value elsewhere in the buffer (an
// earlier `""`, a parent `"type":"flex"`) says nothing about the trailing one.
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
 * Parses a partial JSON buffer, dropping a truncated enum-key value.
 *
 * partial-json happily returns `{ type: "fl" }` for `{"type": "fl`, which
 * would make NodeRenderer paint a red "Unknown widget type" card. When the
 * buffer ends inside the value of an enum key, we parse the buffer cut just
 * before that key instead, so the field is absent until its closing quote
 * arrives.
 */
export function parsePartialSpec(buffer: string, allow: number = DEFAULT_ALLOW): ParseResult {
  const trimmed = buffer.trim();
  if (trimmed.length === 0) return { value: null };

  try {
    const cut = openEnumKeyAt(trimmed);
    return { value: parse(cut < 0 ? trimmed : trimmed.slice(0, cut), allow) };
  } catch {
    return { value: null };
  }
}

/**
 * If `json` ends inside the string value of an enum key, the index of that
 * key's opening quote; otherwise -1. Quote state is scanned from the start,
 * honouring backslash escapes.
 */
function openEnumKeyAt(json: string): number {
  let inString = false;
  let escaped = false;
  let openAt = -1; // opening quote of the latest string
  let closeAt = -1; // closing quote of the latest closed string
  let prevOpenAt = -1; // opening quote of the string before the latest
  let prevCloseAt = -1;

  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') {
        inString = false;
        closeAt = i;
      }
    } else if (c === '"') {
      inString = true;
      prevOpenAt = openAt;
      prevCloseAt = closeAt;
      openAt = i;
    }
  }

  // Still open, and the previous string is its key: `"key"` `:` `"...`
  if (!inString || prevOpenAt < 0) return -1;
  if (!/^\s*:\s*$/.test(json.slice(prevCloseAt + 1, openAt))) return -1;
  return ENUM_KEYS.has(JSON.parse(json.slice(prevOpenAt, prevCloseAt + 1))) ? prevOpenAt : -1;
}
