/**
 * @file editor/core/editable.ts
 * @description L1 (PURE TS, zero Svelte/rune imports) "which prop is editable"
 *   policy for the Ripple visual editor (SP-1b). Two layers, deliberately split
 *   so the LOGIC is testable with synthetic data while the catalog binding is
 *   testable against ground truth:
 *
 *   1. PURE RESOLVER over a catalog-entry-like object (no manifest dependency):
 *      - `resolvePrimaryTextProp(entry)`  -> the single prop to inline-edit.
 *      - `resolveEditableTextProps(entry)` -> ordered list of string props for
 *        the inspector (primary first).
 *      Both walk `TEXT_PROP_PRIORITY` and return the first / all candidate
 *      prop name(s) the entry DECLARES as a string-typed prop. Data-driven:
 *      the mapping falls out of the catalog, it is not hand-guessed.
 *
 *   2. CATALOG BINDING (the only import — the pure-TS widget manifest):
 *      - `primaryTextProp(type)` / `editableTextProps(type)` apply the resolver
 *        to the real widget catalog, so `heading -> text`, `button -> label`,
 *        `badge -> text`, `alert -> title`, etc. fall out automatically and a
 *        new widget is picked up the moment it lands in the manifest.
 *
 *   Plus the INLINE-EDIT eligibility gate: `INLINE_TEXT_WIDGETS` /
 *   `isInlineTextWidget(type)`. The double-click contenteditable path reads an
 *   element's textContent, so it is only correct for SINGLE-TEXT widgets where
 *   textContent === the primary prop (heading / text / badge / button). Every
 *   other widget (cards, composites, multi-text widgets like alert/metric) is
 *   edited via the inspector's per-prop fields, never via textContent.
 *
 *   The manifest is pure TS (verified: zero `svelte` imports), so importing it
 *   here keeps this module grep-clean for runes/Svelte (Decision 6). If the
 *   manifest's bundle weight ever matters for `@ripple-ui/svelte/editor`, swap
 *   the import for a generated slim `type -> props` map — the resolver and every
 *   caller stay unchanged.
 * @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
 */
import { manifestEntries } from '../../manifest/index.js';

/**
 * Candidate text-prop names in priority order. For a given widget the FIRST
 * candidate it actually declares (as a string-typed prop in the catalog) is its
 * primary inline-editable prop. Ordered so the most "headline" text wins: a
 * heading's `text`, a button's `label`, an alert's `title` beat secondary copy
 * like `description`. `value` sits late and is only reached by widgets whose
 * value is string-ish (stat / metric) — numeric-only `value` props are filtered
 * out by the string-type check, so a slider never becomes "text editable".
 */
export const TEXT_PROP_PRIORITY = [
  'text',
  'label',
  'title',
  'content',
  'heading',
  'value',
  'description',
] as const;

/**
 * Minimal shape this module needs from a catalog prop spec — a structural
 * subset of the manifest's `WidgetPropSpec`, so a real manifest entry upcasts to
 * `CatalogEntryLike` without a cast.
 */
export interface CatalogPropSpec {
  /** Declared TS-ish type string, e.g. `"string"` or `'number | string'`. */
  type?: string;
}

/** Minimal shape this module needs from a catalog entry (a manifest entry). */
export interface CatalogEntryLike {
  type: string;
  props?: Record<string, CatalogPropSpec> | null;
}

/**
 * A prop is "text-ish" if its declared catalog type mentions `string`. This
 * keeps numeric-only props (`level: "1 | 2 | …"`, a numeric `value`) out of the
 * editable set while still admitting `value: "number | string"`.
 */
function isStringProp(spec: CatalogPropSpec | undefined): boolean {
  return !!spec && typeof spec.type === 'string' && /string/i.test(spec.type);
}

/**
 * The primary text prop to inline-edit for a catalog entry: the first
 * `TEXT_PROP_PRIORITY` candidate the entry declares as a string-typed prop, or
 * null when the widget has no editable text prop. Pure — unit-tested with
 * synthetic entries, no manifest needed.
 */
export function resolvePrimaryTextProp(
  entry: CatalogEntryLike | null | undefined,
  priority: readonly string[] = TEXT_PROP_PRIORITY
): string | null {
  const props = entry?.props;
  if (!props) return null;
  for (const cand of priority) {
    if (isStringProp(props[cand])) return cand;
  }
  return null;
}

/**
 * All editable text props for a catalog entry, in priority order (primary
 * first). Drives the inspector, which renders one field per returned prop.
 * Pure — same contract as `resolvePrimaryTextProp`.
 */
export function resolveEditableTextProps(
  entry: CatalogEntryLike | null | undefined,
  priority: readonly string[] = TEXT_PROP_PRIORITY
): string[] {
  const props = entry?.props;
  if (!props) return [];
  return priority.filter((cand) => isStringProp(props[cand]));
}

// --------------------------------------------------------------------------
// Catalog binding — the manifest is the source of truth for type -> props.
// --------------------------------------------------------------------------

const CATALOG: Map<string, CatalogEntryLike> = new Map(
  manifestEntries.map((e): [string, CatalogEntryLike] => [e.type, e])
);

/** Catalog entry for a widget type, or null if the type is unknown. */
export function catalogEntry(type: string): CatalogEntryLike | null {
  return CATALOG.get(type) ?? null;
}

/** Primary inline-editable text prop for a widget type (catalog-derived). */
export function primaryTextProp(type: string): string | null {
  return resolvePrimaryTextProp(CATALOG.get(type));
}

/** Ordered editable text props for a widget type (catalog-derived). */
export function editableTextProps(type: string): string[] {
  return resolveEditableTextProps(CATALOG.get(type));
}

// --------------------------------------------------------------------------
// Inline-edit eligibility — the contenteditable (textContent) path.
// --------------------------------------------------------------------------

/**
 * Widgets whose rendered textContent equals their primary text prop, so the
 * double-click contenteditable path can safely round-trip text -> prop. Kept
 * deliberately small and explicit: every other widget edits via the inspector's
 * per-prop fields (which never read textContent and so are safe for composites
 * and multi-text widgets). Each entry is asserted to have a primary text prop in
 * the catalog by `editable.test.ts`, so this set cannot silently drift from the
 * manifest. SP-1c's widget codemod (id forwarding) can grow this set later.
 */
export const INLINE_TEXT_WIDGETS: ReadonlySet<string> = new Set([
  'heading',
  'text',
  'badge',
  'button',
]);

/**
 * True when `type` may be inline-edited via the contenteditable path: it is in
 * the single-text allow-list AND the catalog confirms it has a primary text
 * prop. Belt-and-suspenders so a typo in the set can't enable an un-editable
 * widget.
 */
export function isInlineTextWidget(type: string): boolean {
  return INLINE_TEXT_WIDGETS.has(type) && primaryTextProp(type) !== null;
}

/**
 * Normalize text harvested from a contenteditable element before it becomes a
 * prop value: collapse the non-breaking spaces (U+00A0) a browser injects, then
 * trim. Pure and tiny so the commit path stays predictable; richer
 * normalization (or a TipTap rich-text upgrade) is a future slice, not v1.
 */
export function normalizeInlineText(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\u00a0/g, ' ').trim();
}

// --------------------------------------------------------------------------
// Rich-HTML edit eligibility \u2014 the TipTap path (editor chrome PIECE 1).
// --------------------------------------------------------------------------

/**
 * The single prop a rich-text widget stores its authored HTML in. The inline
 * editor seeds TipTap from `node.props.html` and commits `editor.getHTML()` back
 * to the same prop. Kept as a named constant so the editor never hard-codes the
 * magic string.
 */
export const RICH_TEXT_PROP = 'html' as const;

/**
 * Widgets edited via the TipTap RICH-HTML path rather than the plain
 * contenteditable text path: their primary content is structural HTML (stored in
 * `RICH_TEXT_PROP`), so double-click mounts a TipTap StarterKit editor in place
 * and commits `getHTML()`. Deliberately separate from `INLINE_TEXT_WIDGETS`
 * (which round-trips textContent) \u2014 a rich widget would lose its markup through
 * the textContent path.
 */
export const RICH_TEXT_WIDGETS: ReadonlySet<string> = new Set(['richtext']);

/**
 * True when `type` should be edited through the TipTap rich-HTML path. Belt-and-
 * suspenders mirror of `isInlineTextWidget`: membership in the rich allow-list.
 */
export function isRichTextWidget(type: string): boolean {
  return RICH_TEXT_WIDGETS.has(type);
}
