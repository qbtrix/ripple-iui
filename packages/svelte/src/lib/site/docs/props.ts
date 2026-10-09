// site/docs/props.ts — Reads a widget's props table (the manifest's TypeScript-ish
// type strings) into the controls the /docs props configurator offers, applies
// edited values to an example spec, and finds the variant-like props that get a
// row of live previews. Browser-safe and pure: no manifest import.
//
// The parser is deliberately conservative. It models string, number, boolean,
// literal unions and their nullable forms; anything else (arrays, objects,
// UISpec, EventAction, generics, functions) returns null and the prop is simply
// not offered. It never throws, whatever the type string holds.

export type PropControl =
	| { kind: 'string' }
	| { kind: 'number' }
	| { kind: 'boolean' }
	| { kind: 'enum'; options: (string | number)[] };

export interface ConfigurableProp {
	name: string;
	description: string;
	control: PropControl;
}

export interface VariantAxis {
	name: string;
	options: (string | number)[];
}

type Spec = Record<string, unknown> & { ui?: unknown };
type Node = { type?: unknown; props?: Record<string, unknown>; [k: string]: unknown };

const OPEN = '([{<';
const CLOSE = ')]}>';

/** Split `s` on `sep` where it sits outside brackets and quotes. Null when the brackets do not balance. */
export function splitTop(s: string, sep: string): string[] | null {
	const out: string[] = [];
	let depth = 0;
	let quote = '';
	let start = 0;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (quote) {
			if (ch === quote) quote = '';
		} else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
		else if (OPEN.includes(ch)) depth++;
		else if (CLOSE.includes(ch) && !(ch === '>' && s[i - 1] === '=')) depth--;
		else if (ch === sep && depth === 0) {
			out.push(s.slice(start, i).trim());
			start = i + 1;
		}
		if (depth < 0) return null;
	}
	if (depth !== 0 || quote) return null;
	out.push(s.slice(start).trim());
	return out;
}

const STRING_LIT = /^(["'])([^"'\\]*)\1$/;
const NUMBER_LIT = /^-?\d+(\.\d+)?$/;

/** The control for one prop type string, or null when it is not one we can model. */
export function parsePropType(type: unknown): PropControl | null {
	if (typeof type !== 'string') return null;
	const members = splitTop(type.trim(), '|')
		?.filter(Boolean)
		.filter((m) => m !== 'null' && m !== 'undefined');
	if (!members?.length) return null;

	const literals: (string | number)[] = [];
	const keywords = new Set<string>();
	for (const m of members) {
		const str = STRING_LIT.exec(m);
		if (str) literals.push(str[2]);
		else if (NUMBER_LIT.test(m)) literals.push(Number(m));
		else if (m === 'string' || m === 'number' || m === 'boolean') keywords.add(m);
		else if (m === 'true' || m === 'false') keywords.add('boolean');
		else return null;
	}

	if (keywords.has('boolean')) return keywords.size === 1 && !literals.length ? { kind: 'boolean' } : null;
	// Free text covers string | number and literal unions widened with `string`.
	if (keywords.has('string')) return { kind: 'string' };
	if (keywords.has('number')) return literals.every((l) => typeof l === 'number') ? { kind: 'number' } : null;
	const options = [...new Set(literals)];
	return options.length > 1 ? { kind: 'enum', options } : null;
}

/** Props wired to state or actions rather than appearance; editing them in a preview means nothing. */
const SKIP = new Set(['bind']);

/** Every prop the configurator can offer, in table order. */
export function configurableProps(rows: { name: string; type: string; description: string }[]): ConfigurableProp[] {
	return rows.flatMap((r) => {
		const control = SKIP.has(r.name) ? null : parsePropType(r.type);
		return control ? [{ name: r.name, description: r.description, control }] : [];
	});
}

/** The example spec with its root node's props replaced in place (key order kept); undefined and '' values are dropped. */
export function applyProps(spec: Spec, values: Record<string, unknown>): Spec {
	const node = (spec.ui ?? {}) as Node;
	const props = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined && v !== ''));
	const has = Object.keys(props).length > 0;
	const ui: Node = {};
	for (const [k, v] of Object.entries(node)) {
		if (k !== 'props') ui[k] = v;
		else if (has) ui.props = props;
	}
	if (has && !('props' in node)) ui.props = props;
	return { ...spec, ui };
}

/** Prop names that read as a visual variant axis. */
export const VARIANT_NAMES = ['variant', 'size', 'tone', 'kind'] as const;

/** The variant-like props that are literal unions, in VARIANT_NAMES order. */
export function variantAxes(rows: { name: string; type: string }[]): VariantAxis[] {
	return VARIANT_NAMES.flatMap((name) => {
		const row = rows.find((r) => r.name === name);
		const control = row && parsePropType(row.type);
		return control?.kind === 'enum' ? [{ name, options: control.options }] : [];
	});
}

/** The example spec with one prop set, for a variant preview. */
export function withProp(spec: Spec, name: string, value: unknown): Spec {
	const node = (spec.ui ?? {}) as Node;
	return applyProps(spec, { ...node.props, [name]: value });
}

/**
 * The field names of an object type, or of the item in an array of objects:
 * `Array<{ id: string; label?: string }>` gives id and label?. Empty when the
 * type is not an object shape. Index signatures are skipped.
 */
export function objectFields(type: unknown): { name: string; optional: boolean }[] {
	if (typeof type !== 'string') return [];
	let t = type.trim();
	const arr = /^Array<([\s\S]*)>$/.exec(t);
	if (arr) t = arr[1].trim();
	else if (t.endsWith('[]')) t = t.slice(0, -2).trim();
	if (!t.startsWith('{') || !t.endsWith('}')) return [];
	const inner = t.slice(1, -1).trim();
	const parts = splitTop(inner, ';') ?? [];
	const items = parts.length > 1 ? parts : (splitTop(inner, ',') ?? []);
	return items.flatMap((p) => {
		const m = /^([A-Za-z_$][\w$]*)(\?)?\s*(?::|$)/.exec(p);
		return m ? [{ name: m[1], optional: m[2] === '?' }] : [];
	});
}
