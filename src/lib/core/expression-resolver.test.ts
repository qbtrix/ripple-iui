import { describe, expect, it } from 'vitest';
import {
	evaluateExpression,
	resolveString,
	resolveValue,
	type ResolverContext
} from './expression-resolver.js';

const ctx = (state: Record<string, unknown> = {}, extra: Partial<ResolverContext> = {}): ResolverContext => ({
	state,
	...extra
});

describe('evaluateExpression — paths', () => {
	it('resolves a simple state path', () => {
		expect(evaluateExpression('state.name', ctx({ name: 'alice' }))).toBe('alice');
	});

	it('resolves a nested state path', () => {
		expect(evaluateExpression('state.user.name', ctx({ user: { name: 'bob' } }))).toBe('bob');
	});

	it('returns undefined for a missing path', () => {
		expect(evaluateExpression('state.missing.deep', ctx({}))).toBeUndefined();
	});

	it('treats unprefixed identifiers as state-relative', () => {
		expect(evaluateExpression('count', ctx({ count: 7 }))).toBe(7);
	});
});

describe('evaluateExpression — comparisons + ternaries', () => {
	it('evaluates comparison', () => {
		expect(evaluateExpression('state.n > 0', ctx({ n: 3 }))).toBe(true);
		expect(evaluateExpression('state.n > 0', ctx({ n: 0 }))).toBe(false);
	});

	it('evaluates a simple ternary', () => {
		expect(evaluateExpression("state.x == 'on' ? 'yes' : 'no'", ctx({ x: 'on' }))).toBe('yes');
		expect(evaluateExpression("state.x == 'on' ? 'yes' : 'no'", ctx({ x: 'off' }))).toBe('no');
	});

	// Regression: ternary parser respects nested object/array brackets so that
	// `:` inside a literal doesn't split the ternary prematurely.
	it('ternary with array-of-object literal in else branch', () => {
		const expr =
			"state.team.length > 0 ? state.team : [{value: 'placeholder', label: 'No teammates'}]";
		const empty = evaluateExpression(expr, ctx({ team: [] }));
		expect(empty).toEqual([{ value: 'placeholder', label: 'No teammates' }]);
		const nonEmpty = evaluateExpression(expr, ctx({ team: [{ value: 'a', label: 'A' }] }));
		expect(nonEmpty).toEqual([{ value: 'a', label: 'A' }]);
	});

	it('ternary with object literal in then branch', () => {
		expect(evaluateExpression("state.ok ? {n: 1} : {n: 0}", ctx({ ok: true }))).toEqual({ n: 1 });
		expect(evaluateExpression("state.ok ? {n: 1} : {n: 0}", ctx({ ok: false }))).toEqual({ n: 0 });
	});
});

describe('evaluateExpression — array literals', () => {
	it('parses an empty array', () => {
		expect(evaluateExpression('[]', ctx())).toEqual([]);
	});

	it('parses primitives', () => {
		expect(evaluateExpression("[1, 2, 'three', true, null]", ctx())).toEqual([1, 2, 'three', true, null]);
	});

	it('parses nested object items', () => {
		const out = evaluateExpression(
			"[{value: 'a', label: 'A'}, {value: 'b', label: 'B'}]",
			ctx()
		);
		expect(out).toEqual([
			{ value: 'a', label: 'A' },
			{ value: 'b', label: 'B' }
		]);
	});

	it('resolves expressions inside array items', () => {
		const out = evaluateExpression('[state.x, state.y, 99]', ctx({ x: 1, y: 2 }));
		expect(out).toEqual([1, 2, 99]);
	});

	it('parses arrays containing arrays', () => {
		expect(evaluateExpression('[[1, 2], [3, 4]]', ctx())).toEqual([
			[1, 2],
			[3, 4]
		]);
	});

	it('falls through to path on malformed brackets', () => {
		// `[unclosed` is treated as a path — undefined for missing state.
		expect(evaluateExpression('[unclosed', ctx())).toBeUndefined();
	});
});

describe('evaluateExpression — object literals', () => {
	it('parses an empty object', () => {
		expect(evaluateExpression('{}', ctx())).toEqual({});
	});

	it('parses with identifier keys', () => {
		expect(evaluateExpression("{a: 1, b: 'two'}", ctx())).toEqual({ a: 1, b: 'two' });
	});

	it('parses with string keys', () => {
		expect(evaluateExpression('{"a-b": 1, "c": 2}', ctx())).toEqual({ 'a-b': 1, c: 2 });
	});

	it('resolves expressions in values', () => {
		expect(evaluateExpression('{n: state.x, m: state.x + 1}', ctx({ x: 5 }))).toEqual({
			n: 5,
			m: 6
		});
	});

	it('parses nested objects', () => {
		expect(evaluateExpression('{outer: {inner: 1}}', ctx())).toEqual({ outer: { inner: 1 } });
	});
});

describe('evaluateExpression — array methods (regression)', () => {
	const repos = [
		{ name: 'a', stars: 50, language: 'TS' },
		{ name: 'b', stars: 10, language: 'TS' },
		{ name: 'c', stars: 99, language: 'PY' }
	];

	it('.where filters by equality', () => {
		const out = evaluateExpression("state.repos.where('language', 'TS')", ctx({ repos }));
		expect(out).toEqual([
			{ name: 'a', stars: 50, language: 'TS' },
			{ name: 'b', stars: 10, language: 'TS' }
		]);
	});

	it(".where('field', 'All') passes through unfiltered", () => {
		expect(evaluateExpression("state.repos.where('language', 'All')", ctx({ repos }))).toEqual(
			repos
		);
	});

	it('.sortBy desc', () => {
		const out = evaluateExpression("state.repos.sortBy('stars', 'desc')", ctx({ repos }));
		expect((out as typeof repos).map((r) => r.name)).toEqual(['c', 'a', 'b']);
	});

	it('chained .where + .sortBy', () => {
		const out = evaluateExpression(
			"state.repos.where('language', 'TS').sortBy('stars', 'desc')",
			ctx({ repos })
		);
		expect((out as typeof repos).map((r) => r.name)).toEqual(['a', 'b']);
	});
});

describe('resolveString integration', () => {
	it('returns raw value for a single expression', () => {
		expect(resolveString('{state.x}', ctx({ x: [1, 2, 3] }))).toEqual([1, 2, 3]);
	});

	it('interpolates inside a template string', () => {
		expect(resolveString('Hello {state.name}!', ctx({ name: 'world' }))).toBe('Hello world!');
	});

	it('returns undefined when a single expression evaluates to a missing path', () => {
		expect(resolveString('{state.missing}', ctx({}))).toBeUndefined();
	});
});

describe('resolveValue', () => {
	it('resolves an array of strings', () => {
		expect(resolveValue(['{state.a}', '{state.b}'], ctx({ a: 1, b: 2 }))).toEqual([1, 2]);
	});

	it('resolves an object of strings', () => {
		expect(resolveValue({ x: '{state.x}', y: 'static' }, ctx({ x: 5 }))).toEqual({
			x: 5,
			y: 'static'
		});
	});

	it('passes UINode-shaped subtrees through unchanged', () => {
		const node = { type: 'button', props: { label: '{state.x}' } };
		// UINode subtrees are deferred to NodeRenderer for context-correct
		// resolution; resolveValue must return them by reference.
		expect(resolveValue(node, ctx({ x: 'click' }))).toBe(node);
	});
});
