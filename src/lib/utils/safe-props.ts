/**
 * @file safe-props.ts
 * @description Defensive guards for widget props consumed as arrays/objects.
 *
 * Ripple specs are LLM-generated. The expression resolver silently returns
 * `undefined` (or a literal string) when it can't parse a fragment — so a
 * `prop.map(...)` call on the receiving widget will throw and crash the
 * entire panel. These helpers absorb that failure mode: if the prop isn't
 * the expected shape we return a safe empty value and warn once.
 *
 * Pattern in widgets:
 *   const safeOptions = $derived(safeArray(options, { widget: 'select', key: 'options' }));
 *   const safeData    = $derived(safeObject(data,    { widget: 'kvtable', key: 'data' }));
 *
 * The `widget` / `key` context is what makes the warnings useful — without
 * them you only see a stack trace deep inside Svelte runtime.
 */

interface Ctx {
  widget?: string;
  key?: string;
}

const warnedRefs = new WeakSet<object>();
const warnedPrimitives = new Set<string>();

function describe(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (typeof v === 'object') {
    const name = (v as { constructor?: { name?: string } })?.constructor?.name ?? 'Object';
    return `${name} (not array)`;
  }
  if (typeof v === 'string') return `string (${JSON.stringify(v.slice(0, 40))}${v.length > 40 ? '…' : ''})`;
  return typeof v;
}

/**
 * Detail payload of the `ripple:bad-prop` CustomEvent fired on
 * `document` whenever a defensive guard hits a non-conforming prop.
 *
 * Host applications can listen for these to pipe spec-quality
 * problems into Sentry / Datadog / a dashboard:
 *
 *     document.addEventListener('ripple:bad-prop', (e) => {
 *       const d = (e as CustomEvent<RippleBadPropDetail>).detail;
 *       sendTelemetry('ripple.bad_prop', d);
 *     });
 *
 * The same dedupe rules that throttle console warnings also throttle
 * events, so listeners get one signal per unique offending value.
 */
export interface RippleBadPropDetail {
  widget?: string;
  key?: string;
  expected: 'array' | 'object' | 'function';
  receivedType: string;
  /** Best-effort sample of the bad value for inspection; primitives
   *  pass through, objects are stringified with a short cap. */
  sample: unknown;
}

const EVENT_NAME = 'ripple:bad-prop';

function shortSample(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object') {
    try {
      const s = JSON.stringify(v);
      return s.length > 200 ? s.slice(0, 200) + '…' : s;
    } catch {
      return String(v).slice(0, 200);
    }
  }
  if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v;
  return v;
}

function dispatchBadProp(v: unknown, expected: 'array' | 'object' | 'function', ctx?: Ctx): void {
  if (typeof document === 'undefined') return;
  try {
    const detail: RippleBadPropDetail = {
      widget: ctx?.widget,
      key: ctx?.key,
      expected,
      receivedType: describe(v),
      sample: shortSample(v)
    };
    document.dispatchEvent(new CustomEvent<RippleBadPropDetail>(EVENT_NAME, { detail }));
  } catch {
    // Defensive: never let telemetry break the renderer.
  }
}

function warnOnce(v: unknown, expected: 'array' | 'object' | 'function', ctx?: Ctx): void {
  // Dedupe: object refs via WeakSet, primitives via stringified key.
  if (v !== null && typeof v === 'object') {
    if (warnedRefs.has(v as object)) return;
    warnedRefs.add(v as object);
  } else {
    const tag = `${ctx?.widget ?? '?'}:${ctx?.key ?? '?'}:${describe(v)}`;
    if (warnedPrimitives.has(tag)) return;
    warnedPrimitives.add(tag);
  }
  const where = ctx ? `<${ctx.widget ?? '?'}> prop "${ctx.key ?? '?'}"` : 'prop';
  // eslint-disable-next-line no-console
  console.warn(
    `[Ripple] ${where} expected ${expected}, got ${describe(v)} — using empty fallback. ` +
      `Likely cause: the spec expression could not be evaluated by the resolver.`,
    v
  );
  dispatchBadProp(v, expected, ctx);
}

/** Coerce to array. Returns [] for non-arrays and warns once with context. */
export function safeArray<T = unknown>(v: unknown, ctx?: Ctx): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v !== undefined && v !== null && ctx) warnOnce(v, 'array', ctx);
  return [];
}

/** Coerce to plain object. Returns {} for non-objects and warns once. */
export function safeObject<T extends Record<string, unknown> = Record<string, unknown>>(
  v: unknown,
  ctx?: Ctx
): T {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) return v as T;
  if (v !== undefined && v !== null && ctx) warnOnce(v, 'object', ctx);
  return {} as T;
}

/** Coerce to function. Returns a no-op for non-functions and warns once. */
export function safeFn<F extends (...args: never[]) => unknown>(v: unknown, ctx?: Ctx): F {
  if (typeof v === 'function') return v as F;
  if (v !== undefined && v !== null && ctx) warnOnce(v, 'function', ctx);
  return ((..._args: never[]) => undefined) as F;
}

/**
 * Coerce a single choice-widget option into the canonical
 * `{value, label}` shape. Accepts:
 *
 *   - a primitive (string / number) — used as both value and label,
 *   - an object with `value` and `label` (passed through),
 *   - an object with one of the common alias keys: value ← `id`/`key`,
 *     label ← `name`/`title`/`text`.
 *
 * This is what lets a `workspace.members` `$source` (which returns
 * `{id, name, email, ...}`) bind directly to a `<select>` / `<radio-group>`
 * / `<segmented>` / `<combobox>` / `<multi-select>` without a manual
 * mapping step the resolver couldn't express anyway.
 *
 * Pass-through extra fields are preserved so widgets that look at e.g.
 * `description` or `disabled` keep working.
 */
export interface CanonicalOption {
  value: string | number;
  label: string;
  [k: string]: unknown;
}

export function toCanonicalOption(raw: unknown): CanonicalOption | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string' || typeof raw === 'number') {
    return { value: raw, label: String(raw) };
  }
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const value = (o.value ?? o.id ?? o.key) as string | number | undefined;
  const labelRaw = o.label ?? o.name ?? o.title ?? o.text ?? value;
  if (value === undefined || value === null) return null;
  const label = labelRaw === undefined || labelRaw === null ? String(value) : String(labelRaw);
  return { ...o, value, label };
}

/**
 * Map an unknown options array into canonical `{value, label}` shape,
 * dropping any item that can't be coerced. Use in choice widgets:
 *
 *     const normalized = $derived(canonicalOptions(options, { widget: 'select', key: 'options' }));
 */
export function canonicalOptions(v: unknown, ctx?: Ctx): CanonicalOption[] {
  return safeArray(v, ctx)
    .map((item) => toCanonicalOption(item))
    .filter((o): o is CanonicalOption => o !== null);
}
