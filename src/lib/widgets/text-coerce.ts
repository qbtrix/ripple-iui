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
// everything else becomes a readable string. A widget that does
// `asText(prop).trim()` can never crash the canvas on a non-string binding.
//
// Changes:
//   - 2026-09-17 (oxlint no-base-to-string sweep): objects now serialize via
//     JSON.stringify (was String(v), which rendered "[object Object]"); arrays
//     join their coerced elements with ',' — unchanged for primitive arrays,
//     readable for object arrays; circular objects fall back to
//     '[unserializable]'.

/**
 * Coerce any value to a string for safe string-method use.
 *
 * - null / undefined → '' (renders empty, never "null"/"undefined")
 * - string → itself (no allocation when already a string)
 * - array → elements coerced recursively, joined with ',' (same shape as the
 *   default Array#toString, minus "[object Object]" elements)
 * - object → JSON.stringify, so a mis-bound object renders as readable JSON
 *   instead of "[object Object]"; '[unserializable]' when it can't serialize
 *   (circular refs)
 * - everything else → String(v) (numbers, booleans, etc.)
 *
 * Use this on any value that originates from a widget prop before calling a
 * string method on it. Internal string literals don't need it.
 */
export function asText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(asText).join(',');
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return '[unserializable]';
    }
  }
  // False positive: every object shape returned above, so v is a primitive
  // (number / boolean / bigint / symbol) here and stringifies readably.
  // oxlint-disable-next-line typescript/no-base-to-string -- v is a non-object primitive here
  return String(v);
}
