// json-parse.ts — Thin wrapper over partial-json that drops truncated values
// for enum-like keys so progressive renders never surface "Unknown widget type"
// or invalid intent names. Text content streams progressively (Allow.STR stays on).
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
  /** Parsed value with truncated enum values stripped. null on hard parse failure. */
  value: unknown;
}

/**
 * Parses a partial JSON buffer and scrubs truncated enum-key values.
 *
 * The core idea: partial-json will happily return `{ type: "fl" }` when
 * the buffer still reads `{"type": "fl`. That would cause NodeRenderer
 * to paint a red "Unknown widget type" error. We detect whether the
 * string value is closed (has its terminating quote) by scanning the raw
 * buffer. If not closed, we drop the field from the output tree.
 */
export function parsePartialSpec(buffer: string, allow: number = DEFAULT_ALLOW): ParseResult {
  const trimmed = buffer.trim();
  if (trimmed.length === 0) return { value: null };

  try {
    const value = parse(trimmed, allow);
    if (value == null || typeof value !== 'object') return { value };
    return { value: stripTruncatedEnums(value, buffer) };
  } catch {
    return { value: null };
  }
}

function stripTruncatedEnums(value: unknown, buffer: string): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripTruncatedEnums(v, buffer));
  }

  const result: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (ENUM_KEYS.has(key) && typeof v === 'string') {
      if (!isStringClosed(v, buffer)) continue;
    }
    result[key] = stripTruncatedEnums(v, buffer);
  }
  return result;
}

/**
 * A string value is "closed" if the buffer contains the value wrapped in
 * matching quotes somewhere. If the same raw text appears both truncated
 * and complete in the buffer (rare), we err on the side of keeping it —
 * finding any closed occurrence is enough.
 */
function isStringClosed(value: string, buffer: string): boolean {
  const escaped = escapeForJsonString(value);
  return buffer.includes(`"${escaped}"`);
}

function escapeForJsonString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
