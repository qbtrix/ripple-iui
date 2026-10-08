import { describe, expect, test } from 'vitest';
import { evaluateExpression, resolveString } from './expression-resolver.js';

const ctx = (state: Record<string, unknown>) => ({ state, data: {} });

describe('expression-resolver arithmetic', () => {
	test('addition with state path and literal', () => {
		expect(evaluateExpression('state.count + 1', ctx({ count: 5 }))).toBe(6);
	});

	test('subtraction with state path and literal', () => {
		expect(evaluateExpression('state.count - 1', ctx({ count: 5 }))).toBe(4);
	});

	test('multiplication and division', () => {
		expect(evaluateExpression('state.x * 3', ctx({ x: 4 }))).toBe(12);
		expect(evaluateExpression('state.x / 2', ctx({ x: 10 }))).toBe(5);
	});

	test('modulo', () => {
		expect(evaluateExpression('state.x % 3', ctx({ x: 10 }))).toBe(1);
	});

	test('precedence: * before +', () => {
		expect(evaluateExpression('1 + 2 * 3', ctx({}))).toBe(7);
	});

	test('parentheses override precedence', () => {
		expect(evaluateExpression('(1 + 2) * 3', ctx({}))).toBe(9);
	});

	test('division by zero yields 0 (not Infinity)', () => {
		expect(evaluateExpression('state.x / 0', ctx({ x: 5 }))).toBe(0);
	});

	test('non-numeric path coerces to 0 in arithmetic', () => {
		expect(evaluateExpression('state.missing + 1', ctx({}))).toBe(1);
	});

	test('+ with a string operand concatenates', () => {
		expect(evaluateExpression("state.first + ' ' + state.last", ctx({ first: 'Ada', last: 'Lovelace' }))).toBe(
			'Ada Lovelace'
		);
	});

	test('leading negative literal still parses', () => {
		expect(evaluateExpression('-1', ctx({}))).toBe(-1);
	});

	test('chained additions left-associate', () => {
		expect(evaluateExpression('1 + 2 + 3', ctx({}))).toBe(6);
	});

	test('arithmetic inside template via resolveString', () => {
		expect(resolveString('Count: {state.count + 1}', ctx({ count: 5 }))).toBe('Count: 6');
	});

	test('.length on a string', () => {
		expect(evaluateExpression('state.bio.length', ctx({ bio: 'hello' }))).toBe(5);
	});

	test('.length on an array, plus indexed access', () => {
		expect(evaluateExpression('state.items.length', ctx({ items: [1, 2, 3] }))).toBe(3);
		expect(evaluateExpression('state.items.0', ctx({ items: ['a', 'b'] }))).toBe('a');
	});
});

describe('expression-resolver grouping and call operands', () => {
	const list = [{ a: true }, { a: false }, { a: true }, { a: false }];
	const state = { a: 1, b: 2, c: 3, d: 4, s: 'x', name: 'alice', total: 10, list, on: true };

	// Each case failed before the fix: the resolver peeled `(` ... `)` off any
	// expression that started and ended with a paren, even when the two did not
	// match, and it matched a trailing method call before splitting operators,
	// so the call's receiver swallowed the whole left-hand side.
	test.each([
		['(36.6 + 20) * (1 + 18 / 100)', 66.788],
		['(state.a + state.b) * (state.c + state.d)', 21],
		['((2 + 3) * (4 - 1)) / 5', 3],
		['!((1 + 2) * (3 - 3))', true],
		['(state.a + state.b).toFixed(1)', '3.0'],
		["('(a)') + ('(b)')", '(a)(b)'],
		["'(a)' == '(a)'", true],
		[
			'state.on ? (state.a + 1) * (state.b + 1) : (state.a - 1) * (state.b - 1)',
			6
		],
		["state.total / state.list.where('a', true).count()", 5],
		['2 * state.list.count()', 8],
		["'Hi ' + state.name.toUpperCase()", 'Hi ALICE'],
		['state.list.count() > 3', true],
		['(state.a + state.b) > 2', true],
		["state.s.includes(')')", false],
		["state.s == 'a || b'", false]
	])('%s', (expr, expected) => {
		const got = evaluateExpression(expr, ctx(state));
		if (typeof expected === 'number') expect(got).toBeCloseTo(expected);
		else expect(got).toBe(expected);
	});

	// Already-correct shapes the fix must keep working.
	test.each([
		['((1 + 2) * 3)', 9],
		['(1 + 2) * 3', 9],
		['2 * (3 + 4)', 14],
		["state.list.where('a', true).count() / 2", 1],
		["(state.s + ')')", 'x)'],
		["!(state.s == 'x')", false]
	])('%s', (expr, expected) => {
		expect(evaluateExpression(expr, ctx(state))).toBe(expected);
	});

	test('string-literal parens and operators do not split', () => {
		expect(evaluateExpression("state.s.includes(')')", ctx({ s: 'a)' }))).toBe(true);
		expect(evaluateExpression("state.s == 'a || b'", ctx({ s: 'a || b' }))).toBe(true);
	});
});
