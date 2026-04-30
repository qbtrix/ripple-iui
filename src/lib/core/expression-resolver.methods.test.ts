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
