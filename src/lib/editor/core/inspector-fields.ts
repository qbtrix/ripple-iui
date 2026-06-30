/**
 * @file editor/core/inspector-fields.ts
 * @description L1 (PURE TS, zero Svelte/DOM) manifest-driven field inference for
 *   the Ripple visual editor's properties panel (`RippleInspector`). Given a
 *   node, it reads the widget manifest's prop specs and derives a typed, editable
 *   field per prop — `select` (from a union-literal type), `number`, `boolean`,
 *   `textarea`, or `text` — so the inspector edits the FULL editable surface of a
 *   widget (not just its text props), and auto-tracks the manifest: a new
 *   widget/prop becomes editable the moment it lands. Props the inspector can't
 *   safely edit inline (arrays/objects/functions like table `columns`) classify
 *   as `readonly` and are omitted from the editable set.
 *
 *   Pure: the brain is here so it is unit-testable over synthetic specs; the
 *   `.svelte` panel is a thin view that renders these fields and routes edits
 *   back through the shared `EditorOps` seam (Decision 6 — L1 logic, L2 render).
 * @created 2026-06-29 (editor chrome — properties panel)
 */
import { manifestEntries } from '../../manifest/index.js';
import type { UINode } from '../../schema/ui-spec.js';

export type FieldKind = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'readonly';

export interface InspectorField {
  /** Prop name on the node (also the op `prop`). */
  prop: string;
  /** Display label (the prop name; humanization is a view concern). */
  label: string;
  kind: FieldKind;
  /** Current value (from `node.props[prop]`, falling back to the spec default). */
  value: unknown;
  /** Options for `kind === 'select'`. */
  options?: string[];
  /** True when a `select`'s options are numeric literals (coerce to Number on set). */
  numeric?: boolean;
  /** Spec description, surfaced as a field hint/title. */
  description?: string;
}

/** Runtime shape of a manifest prop spec (a structural subset). */
interface PropSpec {
  type?: string;
  required?: boolean;
  description?: string;
  default?: unknown;
}
interface EntryLike {
  type: string;
  props?: Record<string, PropSpec> | null;
}

const CATALOG: Map<string, EntryLike> = new Map(
  manifestEntries.map((e): [string, EntryLike] => [e.type, e as EntryLike])
);

/** Manifest entry for a widget type, or null when unknown. */
export function inspectorCatalogEntry(type: string): EntryLike | null {
  return CATALOG.get(type) ?? null;
}

/** Prose props that read better as a multi-line textarea than a single-line input. */
const TEXTAREA_PROPS: ReadonlySet<string> = new Set(['description', 'content', 'body', 'markdown']);

/**
 * Extract the option list from a union-literal manifest type string. Two forms:
 *   - quoted-literal union  `"'sm' | 'md' | 'lg'"` or `'"a" | "b"'` → ['sm','md','lg']
 *   - numeric-literal union `'1 | 2 | 3'`                           → ['1','2','3']
 * Returns [] for anything that isn't a PURE literal union (so `number | string`,
 * `string`, `Record<…>` are not mistaken for enums).
 */
export function parseEnumOptions(typeStr: string | undefined): string[] {
  if (!typeStr) return [];
  const t = typeStr.trim();
  const quoted = t.match(/(['"])(?:(?!\1).)*\1/g);
  if (quoted) {
    // Pure quoted union only: removing the literals + pipes must leave nothing.
    const rest = t.replace(/(['"])(?:(?!\1).)*\1/g, '').replace(/\|/g, '').trim();
    return rest === '' ? quoted.map((x) => x.slice(1, -1)) : [];
  }
  if (/^\d+(\s*\|\s*\d+)*$/.test(t)) return t.split('|').map((x) => x.trim());
  return [];
}

/** True when every option is a bare integer literal (→ coerce the set value to Number). */
function optionsAreNumeric(options: string[]): boolean {
  return options.length > 0 && options.every((o) => /^\d+$/.test(o));
}

/** Classify a manifest prop `type` string into an editable field kind. */
export function inferFieldKind(typeStr: string | undefined): FieldKind {
  if (!typeStr) return 'readonly';
  const t = typeStr.trim();
  if (parseEnumOptions(t).length >= 1) return 'select';
  if (/^number$/i.test(t)) return 'number';
  if (/^boolean$/i.test(t)) return 'boolean';
  // Plain string (incl. `string | number`), but not collections/callables/objects.
  if (/string/i.test(t) && !/\[\]|Record|=>|[{}]/.test(t)) return 'text';
  return 'readonly';
}

/** Coerce a raw control value to the field's model type before it becomes a prop. */
export function coerceFieldValue(kind: FieldKind, raw: unknown, numeric = false): unknown {
  if (kind === 'number' || (kind === 'select' && numeric)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (kind === 'boolean') return raw === true || raw === 'true' || raw === 'on';
  return raw == null ? '' : String(raw);
}

/**
 * Derive the ordered, editable inspector fields for a node from its manifest
 * entry. `readonly` props (collections/objects) are omitted. The value comes
 * from the node when set, else the spec default, else an empty value for the kind.
 */
export function inferFields(
  node: UINode | null | undefined,
  entry?: EntryLike | null
): InspectorField[] {
  if (!node) return [];
  const e = entry ?? inspectorCatalogEntry(node.type);
  const specs = e?.props;
  if (!specs) return [];
  const current = (node.props ?? {}) as Record<string, unknown>;
  const fields: InspectorField[] = [];

  for (const [prop, spec] of Object.entries(specs)) {
    let kind = inferFieldKind(spec?.type);
    if (kind === 'readonly') continue;
    if (kind === 'text' && TEXTAREA_PROPS.has(prop)) kind = 'textarea';

    const fallback = spec?.default ?? (kind === 'boolean' ? false : kind === 'number' ? 0 : '');
    const value = prop in current ? current[prop] : fallback;

    const field: InspectorField = { prop, label: prop, kind, value, description: spec?.description };
    if (kind === 'select') {
      field.options = parseEnumOptions(spec?.type);
      field.numeric = optionsAreNumeric(field.options);
    }
    fields.push(field);
  }
  return fields;
}
