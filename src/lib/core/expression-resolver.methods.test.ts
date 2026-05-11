import { describe, expect, test } from 'vitest';
import { evaluateExpression, evaluateCondition } from './expression-resolver.js';

const ctx = (state: Record<string, unknown>) => ({ state, data: {} });

describe('expression-resolver method calls', () => {
	test('string toLowerCase / toUpperCase / trim', () => {
		expect(evaluateExpression('state.s.toLowerCase()', ctx({ s: 'HELLO' }))).toBe('hello');
		expect(evaluateExpression('state.s.toUpperCase()', ctx({ s: 'hi' }))).toBe('HI');
		expect(evaluateExpression('state.s.trim()', ctx({ s: '  hi  ' }))).toBe('hi');
	});

	test('string includes / startsWith / endsWith', () => {
		expect(evaluateExpression("state.s.includes('ell')", ctx({ s: 'hello' }))).toBe(true);
		expect(evaluateExpression("state.s.startsWith('he')", ctx({ s: 'hello' }))).toBe(true);
		expect(evaluateExpression("state.s.endsWith('lo')", ctx({ s: 'hello' }))).toBe(true);
		expect(evaluateExpression("state.s.includes('z')", ctx({ s: 'hello' }))).toBe(false);
	});

	test('chained method calls — case-insensitive substring', () => {
		const result = evaluateExpression(
			"state.s.toLowerCase().includes(state.q.toLowerCase())",
			ctx({ s: 'Hello World', q: 'WORLD' })
		);
		expect(result).toBe(true);
	});

	test('array includes', () => {
		expect(evaluateExpression('state.tags.includes(state.t)', ctx({ tags: ['a', 'b'], t: 'b' }))).toBe(true);
		expect(evaluateExpression('state.tags.includes(state.t)', ctx({ tags: ['a', 'b'], t: 'c' }))).toBe(false);
	});

	test('number toFixed', () => {
		expect(evaluateExpression('state.n.toFixed(2)', ctx({ n: 3.14159 }))).toBe('3.14');
	});

	test('null-coalesce ?? returns first non-null', () => {
		expect(evaluateExpression('state.missing ?? "fallback"', ctx({}))).toBe('fallback');
		expect(evaluateExpression('state.x ?? "fallback"', ctx({ x: 0 }))).toBe(0);
		expect(evaluateExpression('state.x ?? "fallback"', ctx({ x: null }))).toBe('fallback');
	});

	test('method call inside if-condition (filter pattern)', () => {
		// Typical use: `if condition` filtering a list
		expect(
			evaluateCondition("name.toLowerCase().includes(state.q.toLowerCase())", {
				...ctx({ q: 'AL' }),
				name: 'Alice'
			})
		).toBe(true);
		expect(
			evaluateCondition("name.toLowerCase().includes(state.q.toLowerCase())", {
				...ctx({ q: 'xx' }),
				name: 'Alice'
			})
		).toBe(false);
	});

	test('method on an array literal-ish — method on missing path returns undefined', () => {
		expect(evaluateExpression('state.missing.includes("x")', ctx({}))).toBe(undefined);
	});
});

describe('expression-resolver array derive methods', () => {
	const repos = [
		{ name: 'a', language: 'Astro', stars: 53 },
		{ name: 'b', language: 'Python', stars: 21 },
		{ name: 'c', language: 'Astro', stars: 9 },
		{ name: 'd', language: 'TypeScript', stars: 4 }
	];

	test('where filters by literal field equality', () => {
		expect(evaluateExpression("state.r.where('language', 'Astro')", ctx({ r: repos }))).toEqual([
			{ name: 'a', language: 'Astro', stars: 53 },
			{ name: 'c', language: 'Astro', stars: 9 }
		]);
	});

	test('where with state-bound value', () => {
		expect(
			evaluateExpression("state.r.where('language', state.f)", ctx({ r: repos, f: 'Python' }))
		).toEqual([{ name: 'b', language: 'Python', stars: 21 }]);
	});

	test("where passes through when value is 'All'", () => {
		expect(evaluateExpression("state.r.where('language', 'All')", ctx({ r: repos }))).toEqual(
			repos
		);
	});

	test('where passes through when value is null/undefined', () => {
		expect(
			evaluateExpression("state.r.where('language', state.missing)", ctx({ r: repos }))
		).toEqual(repos);
	});

	test('whereIn keeps rows whose field value is in the provided list', () => {
		expect(
			evaluateExpression(
				"state.r.whereIn('language', state.langs)",
				ctx({ r: repos, langs: ['Python', 'TypeScript'] })
			)
		).toEqual([
			{ name: 'b', language: 'Python', stars: 21 },
			{ name: 'd', language: 'TypeScript', stars: 4 }
		]);
	});

	test('whereIn passes through when list is empty or missing', () => {
		expect(
			evaluateExpression("state.r.whereIn('language', state.langs)", ctx({ r: repos, langs: [] }))
		).toEqual(repos);
		expect(
			evaluateExpression("state.r.whereIn('language', state.langs)", ctx({ r: repos }))
		).toEqual(repos);
	});

	test('sortBy ascending by numeric field', () => {
		const result = evaluateExpression("state.r.sortBy('stars')", ctx({ r: repos })) as Array<{
			stars: number;
		}>;
		expect(result.map((r) => r.stars)).toEqual([4, 9, 21, 53]);
	});

	test('sortBy descending', () => {
		const result = evaluateExpression(
			"state.r.sortBy('stars', 'desc')",
			ctx({ r: repos })
		) as Array<{ stars: number }>;
		expect(result.map((r) => r.stars)).toEqual([53, 21, 9, 4]);
	});

	test('sortBy by string field, locale-aware numeric collation', () => {
		const result = evaluateExpression("state.r.sortBy('name')", ctx({ r: repos })) as Array<{
			name: string;
		}>;
		expect(result.map((r) => r.name)).toEqual(['a', 'b', 'c', 'd']);
	});

	test('sortBy does not mutate the input array', () => {
		const original = [...repos];
		const r = [...repos];
		evaluateExpression("state.r.sortBy('stars', 'desc')", ctx({ r }));
		expect(r).toEqual(original);
	});

	test('sortBy with state-bound field name', () => {
		const result = evaluateExpression("state.r.sortBy(state.f, 'desc')", ctx({ r: repos, f: 'stars' })) as Array<{
			stars: number;
		}>;
		expect(result.map((r) => r.stars)).toEqual([53, 21, 9, 4]);
	});

	test('limit takes the first N rows', () => {
		expect(evaluateExpression('state.r.limit(2)', ctx({ r: repos }))).toEqual(repos.slice(0, 2));
	});

	test('reverse returns a non-mutating reversed copy', () => {
		const r = [...repos];
		const result = evaluateExpression('state.r.reverse()', ctx({ r })) as typeof repos;
		expect(result.map((x) => x.name)).toEqual(['d', 'c', 'b', 'a']);
		expect(r).toEqual(repos);
	});

	test('chained: where → sortBy → limit', () => {
		const result = evaluateExpression(
			"state.r.where('language', 'Astro').sortBy('stars', 'desc').limit(1)",
			ctx({ r: repos })
		) as Array<{ name: string }>;
		expect(result.map((x) => x.name)).toEqual(['a']);
	});
});

describe('expression-resolver bracket indexing', () => {
	test('static string key', () => {
		expect(evaluateExpression("state.m['foo']", ctx({ m: { foo: 1, bar: 2 } }))).toBe(1);
	});

	test('numeric index on array', () => {
		expect(evaluateExpression('state.r[0]', ctx({ r: ['a', 'b', 'c'] }))).toBe('a');
		expect(evaluateExpression('state.r[2]', ctx({ r: ['a', 'b', 'c'] }))).toBe('c');
	});

	test('dynamic key from state', () => {
		expect(
			evaluateExpression('state.m[state.k]', ctx({ m: { foo: 1, bar: 2 }, k: 'bar' }))
		).toBe(2);
	});

	test('bracket then dot navigation', () => {
		expect(
			evaluateExpression(
				'state.m[state.k].name',
				ctx({ m: { foo: { name: 'Alice' } }, k: 'foo' })
			)
		).toBe('Alice');
	});

	test('method call on bracket-indexed value', () => {
		expect(
			evaluateExpression(
				"state.m[state.k].sortBy('n', 'desc')",
				ctx({ m: { all: [{ n: 1 }, { n: 3 }, { n: 2 }] }, k: 'all' })
			)
		).toEqual([{ n: 3 }, { n: 2 }, { n: 1 }]);
	});

	test('missing key returns undefined', () => {
		expect(evaluateExpression('state.m[state.k]', ctx({ m: {}, k: 'x' }))).toBe(undefined);
	});
});
