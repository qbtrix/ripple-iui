// props.test.ts — The props-table reader behind the configurator: type parsing
// (primitives, literal unions, nullable forms, everything it must refuse), the
// spec it writes, variant detection and object field listing. Then a sweep of
// every manifest prop type, so a new odd type can never make it throw.
import { describe, expect, it } from 'vitest';
import { manifestEntries } from '../../manifest/index.js';
import { applyProps, configurableProps, objectFields, parsePropType, splitTop, variantAxes, withProp } from './props.js';

describe('parsePropType', () => {
	it.each([
		['string', { kind: 'string' }],
		['number', { kind: 'number' }],
		['boolean', { kind: 'boolean' }],
		['string | null', { kind: 'string' }],
		['number | null', { kind: 'number' }],
		['string | number', { kind: 'string' }],
		['"chevron" | "slash" | string', { kind: 'string' }],
		['"sm" | "md" | "lg"', { kind: 'enum', options: ['sm', 'md', 'lg'] }],
		["'grid' | 'glow' | 'plain'", { kind: 'enum', options: ['grid', 'glow', 'plain'] }],
		['2 | 3 | 4', { kind: 'enum', options: [2, 3, 4] }],
		['  "a" |  "b"  ', { kind: 'enum', options: ['a', 'b'] }]
	])('%s', (type, want) => {
		expect(parsePropType(type)).toEqual(want);
	});

	it.each([
		'string[]',
		'object',
		'any',
		'unknown[]',
		'UISpec | UniversalSpec',
		'string | UISpec',
		'EventAction | EventAction[]',
		'number | "auto"',
		'Array<{ label: string; variant?: "a" | "b" }>',
		'{ lat: number; lng: number } | null',
		'[number, number]',
		'Record<string, boolean>',
		'(string | number)[]',
		'"only"',
		'null',
		'',
		'"a" | ',
		'Array<{ broken: string',
		'"unterminated | "x"',
		'(a: string) => void',
		'boolean | "x"'
	])('refuses %j', (type) => {
		expect(parsePropType(type)).toBeNull();
	});

	it('refuses a non-string type without throwing', () => {
		expect(parsePropType(undefined)).toBeNull();
		expect(parsePropType(42)).toBeNull();
	});

	it('never throws on any type in the manifest', () => {
		const types = manifestEntries.flatMap((e) => Object.values(e.props ?? {}).map((p) => p.type));
		expect(types.length).toBeGreaterThan(100);
		for (const t of types) expect(() => parsePropType(t)).not.toThrow();
	});
});

describe('splitTop', () => {
	it('splits only outside brackets and quotes', () => {
		expect(splitTop('"a|b" | Array<{ x: 1 | 2 }> | c', '|')).toEqual(['"a|b"', 'Array<{ x: 1 | 2 }>', 'c']);
	});
	it('returns null when brackets do not balance', () => {
		expect(splitTop('Array<{ x', '|')).toBeNull();
		expect(splitTop('a > b', '|')).toBeNull();
	});
});

describe('configurableProps', () => {
	it('keeps modelled props in table order and skips bind', () => {
		const rows = [
			{ name: 'label', type: 'string', description: 'Label.' },
			{ name: 'bind', type: 'string', description: 'State path.' },
			{ name: 'items', type: 'string[]', description: 'Items.' },
			{ name: 'variant', type: '"a" | "b"', description: 'Look.' },
			{ name: 'disabled', type: 'boolean', description: 'Off.' }
		];
		expect(configurableProps(rows).map((p) => [p.name, p.control.kind])).toEqual([
			['label', 'string'],
			['variant', 'enum'],
			['disabled', 'boolean']
		]);
	});
});

describe('applyProps', () => {
	const spec = { version: '1.0', ui: { type: 'button', props: { label: 'Save', variant: 'default' }, on_click: [] } };

	it('replaces the root props and keeps the rest of the node and spec', () => {
		const out = applyProps(spec, { label: 'Go', variant: 'ghost', disabled: true });
		expect(out).toEqual({
			version: '1.0',
			ui: { type: 'button', props: { label: 'Go', variant: 'ghost', disabled: true }, on_click: [] }
		});
	});

	it('drops undefined and empty values, and the props key when nothing is left', () => {
		expect(applyProps(spec, { label: '', variant: undefined, size: 0, disabled: false }).ui).toEqual({
			type: 'button',
			props: { size: 0, disabled: false },
			on_click: []
		});
		expect(applyProps(spec, { label: '' }).ui).toEqual({ type: 'button', on_click: [] });
	});

	it('keeps the node key order, so props stay ahead of children in the copied spec', () => {
		const out = applyProps({ ui: { type: 'card', props: { title: 'A' }, children: [] } }, { title: 'B' });
		expect(Object.keys(out.ui as object)).toEqual(['type', 'props', 'children']);
		expect(Object.keys(applyProps({ ui: { type: 'card' } }, { title: 'B' }).ui as object)).toEqual(['type', 'props']);
	});

	it('does not mutate the input spec', () => {
		const before = structuredClone(spec);
		applyProps(spec, { label: 'x' });
		expect(spec).toEqual(before);
	});
});

describe('variantAxes', () => {
	it('finds variant-named literal unions in a fixed order and ignores free-typed ones', () => {
		const rows = [
			{ name: 'size', type: '"sm" | "md"' },
			{ name: 'variant', type: '"default" | "ghost"' },
			{ name: 'tone', type: 'string' },
			{ name: 'kind', type: 'number' },
			{ name: 'type', type: '"bar" | "line"' }
		];
		expect(variantAxes(rows)).toEqual([
			{ name: 'variant', options: ['default', 'ghost'] },
			{ name: 'size', options: ['sm', 'md'] }
		]);
	});

	it('finds the button variants and sizes in the real manifest', () => {
		const button = manifestEntries.find((e) => e.type === 'button')!;
		const rows = Object.entries(button.props).map(([name, p]) => ({ name, ...p }));
		expect(variantAxes(rows).map((a) => a.name)).toEqual(['variant', 'size']);
	});

	it('withProp sets one prop on the example', () => {
		expect(withProp({ ui: { type: 'badge', props: { text: 'New' } } }, 'variant', 'outline').ui).toEqual({
			type: 'badge',
			props: { text: 'New', variant: 'outline' }
		});
	});
});

describe('objectFields', () => {
	it.each([
		['Array<{ id: string; title: string; description?: string }>', 'id title description?'],
		['{ name: string; avatar?: string }', 'name avatar?'],
		['{id,text,done}[]', 'id text done'],
		['Array<{ feature: string; [key: string]: unknown }>', 'feature'],
		['{ label: string; value: string | number; trend?: "up" | "down" }', 'label value trend?']
	])('%s', (type, want) => {
		expect(
			objectFields(type)
				.map((f) => f.name + (f.optional ? '?' : ''))
				.join(' ')
		).toBe(want);
	});

	it.each(['string', 'string[]', 'Array<string>', 'UISpec', 'Record<string, unknown>', 42])('%j has none', (type) => {
		expect(objectFields(type)).toEqual([]);
	});
});
