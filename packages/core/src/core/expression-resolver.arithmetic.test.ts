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
