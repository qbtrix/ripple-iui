// text-coerce.ts — the single coercion idiom for prop-derived string values.
//
// Why this file exists: pocket bindings ({state.x.score}, day counts, booleans,
// null) routinely hand a widget a non-string where the prop type says `string`.
// Any widget that then calls a string method (.trim / .split / .toLowerCase /
// .matchAll / .startsWith / ...) throws, and because NodeRenderer has no error
// boundary, ONE throwing widget takes down the entire pocket canvas. Two live
// crashes today proved the shape: Text's linkifySegments called .matchAll on a
// number; Badge called text?.trim() on a number.
//
// The fix is one consistent idiom, not N ad-hoc guards. Route every
// prop-derived string operation through asText(): null/undefined become '',
// everything else becomes String(v). A widget that does `asText(prop).trim()`
// can never crash the canvas on a non-string binding.

/**
 * Coerce any value to a string for safe string-method use.
 *
 * - null / undefined → '' (renders empty, never "null"/"undefined")
 * - string → itself (no allocation when already a string)
 * - everything else → String(v) (numbers, booleans, etc.)
 *
 * Use this on any value that originates from a widget prop before calling a
 * string method on it. Internal string literals don't need it.
 */
export function asText(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}
