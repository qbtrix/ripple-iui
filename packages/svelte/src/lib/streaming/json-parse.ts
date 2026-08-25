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
 * A string value is "closed" if the buffer contains the escaped value
 * wrapped in matching quotes AND followed by a valid JSON structural
 * character (comma, close-brace, close-bracket, whitespace, or EOF).
 *
 * The structural-char check matters when a parent carries the same
 * string value that's still being typed out in a nested child. Example
 * buffer:
 *   `{"type":"flex","children":[{"type":"flex`
 *
 * A naive `includes('"flex"')` returns true (the parent closed it), so
 * the still-open child `type` would be kept instead of stripped. Verifying
 * the closing quote is followed by a JSON separator fixes the false
 * positive.
 */
function isStringClosed(value: string, buffer: string): boolean {
  const escaped = escapeForJsonString(value);
  const pattern = `"${escaped}"`;
  let from = 0;
  while (true) {
    const idx = buffer.indexOf(pattern, from);
    if (idx === -1) return false;
    const after = buffer[idx + pattern.length];
    if (
      after === undefined ||
      after === ',' ||
      after === '}' ||
      after === ']' ||
      after === ' ' ||
      after === '\n' ||
      after === '\r' ||
      after === '\t'
    ) {
      return true;
    }
    from = idx + 1;
  }
}

function escapeForJsonString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
