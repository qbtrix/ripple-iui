// linkify.ts — split a plain-text string into text + URL segments so the
// Text widget can render bare URLs as clickable links. Kept pure (no Svelte,
// no DOM) so the segmentation is unit-testable on its own.

export interface TextSegment {
  /** The visible text for this segment. */
  text: string;
  /** Present when the segment is a clickable URL. */
  url?: string;
}

// http/https URLs only — the schemes a `navigate` action can safely open.
// Stops at whitespace and characters that can't appear unescaped in a URL.
const URL_REGEX = /https?:\/\/[^\s<>"'`]+/g;

// Trailing punctuation is almost always sentence punctuation, not part of
// the URL ("see https://example.com."). Trimmed off and kept as plain text.
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/**
 * Break `input` into ordered segments. Plain runs carry `text` only; URL runs
 * also carry `url`. A string with no URLs yields a single plain segment, so
 * callers can render the result uniformly.
 *
 * Bindings routinely deliver non-strings (numbers from `{state.x.score}`,
 * booleans, null) — coerce instead of crashing: `matchAll` exists only on
 * strings, and a Text widget must render whatever value it is handed.
 */
export function linkifySegments(input: string): TextSegment[] {
  if (typeof input !== 'string') {
    return [{ text: input == null ? '' : String(input) }];
  }
  if (!input) return [{ text: input }];

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of input.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({ text: input.slice(cursor, start) });
    }

    let url = match[0];
    const trailing = url.match(TRAILING_PUNCTUATION)?.[0] ?? '';
    if (trailing) url = url.slice(0, -trailing.length);

    segments.push({ text: url, url });
    if (trailing) segments.push({ text: trailing });

    cursor = start + match[0].length;
  }

  if (cursor < input.length) {
    segments.push({ text: input.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ text: input }];
}
