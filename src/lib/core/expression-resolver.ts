/**
 * @file expression-resolver.ts
 * @description Resolves binding expressions like {state.value} and {item.name}.
 * @created 2024-12-XX
 * @changes
 *   - Initial creation with expression parsing and evaluation
 *   - Support for simple paths, comparisons, and null checks
 *   - Template string resolution for embedded expressions
 */

/**
 * Context for resolving expressions.
 * Contains all available scopes (state, loop variables, data).
 */
export interface ResolverContext {
	/** Main application state */
	state: Record<string, unknown>;
	/** Data fetcher results */
	data?: Record<string, unknown>;
	/** Loop item variable (from 'each' widget) */
	item?: unknown;
	/** Loop index (from 'each' widget) */
	index?: number;
	/** Custom loop variable names */
	[key: string]: unknown;
}

/**
 * Expression pattern: {expression}
 * Matches content between curly braces.
 */
const EXPRESSION_REGEX = /\{([^}]+)\}/g;

/**
 * Single expression pattern for exact match.
 */
const SINGLE_EXPRESSION_REGEX = /^\{([^}]+)\}$/;

/**
 * Check if a string contains any expressions.
 */
export function hasExpressions(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return EXPRESSION_REGEX.test(value);
}

/**
 * Check if a string is a single expression (not embedded in text).
 *
 * @example
 * isSingleExpression('{state.name}'); // true
 * isSingleExpression('Hello {state.name}'); // false
 */
export function isSingleExpression(value: string): boolean {
	return SINGLE_EXPRESSION_REGEX.test(value);
}

/**
 * Parse an expression and evaluate it against context.
 *
 * Supported expressions:
 * - Simple paths: "state.user.name", "item.price"
 * - Equality: "state.selected == 'foo'"
 * - Inequality: "state.selected != null"
 * - Comparison: "state.count > 0", "item.price < 100"
 * - Ternary: "state.selected == 'foo' ? 'yes' : 'no'"
 *
 * @param expression - The expression without curly braces
 * @param context - The resolver context
 * @returns The evaluated value
 */
export function evaluateExpression(expression: string, context: ResolverContext): unknown {
	const trimmed = expression.trim();

	// Ternary: scan for the top-level `?` and matching `:`, respecting
	// parens, brackets, braces, and string literals. The previous regex
	// approach broke when the true / false branch contained `:` inside a
	// nested object literal (e.g. `cond ? a : [{value: 'x'}]`).
	const ternary = findTernarySplit(trimmed);
	if (ternary) {
		const condition = evaluateExpression(ternary.cond, context);
		return condition
			? evaluateExpression(ternary.then, context)
			: evaluateExpression(ternary.else, context);
	}

	// Check for OR operator (||) - split and evaluate each part
	if (trimmed.includes('||')) {
		const parts = splitLogicalOperator(trimmed, '||');
		if (parts.length > 1) {
			for (let i = 0; i < parts.length; i++) {
				const result = evaluateExpression(parts[i].trim(), context);
				// If truthy, return it immediately (short-circuit)
				if (result) {
					return result;
				}
				// If it's the last item and we haven't returned yet, return it (even if falsy)
				if (i === parts.length - 1) {
					return result;
				}
			}
		}
	}

	// Check for AND operator (&&) - split and evaluate each part
	if (trimmed.includes('&&')) {
		const parts = splitLogicalOperator(trimmed, '&&');
		if (parts.length > 1) {
			let result: unknown;
			for (let i = 0; i < parts.length; i++) {
				result = evaluateExpression(parts[i].trim(), context);
				// If falsy, return it immediately (short-circuit)
				if (!result) {
					return result;
				}
			}
			// If we got here, all were truthy, return the last result
			return result;
		}
	}

	// Check for NOT operator (!)
	if (trimmed.startsWith('!')) {
		const inner = trimmed.slice(1).trim();
		// Handle parentheses: !(...)
		if (inner.startsWith('(') && inner.endsWith(')')) {
			return !evaluateExpression(inner.slice(1, -1), context);
		}
		return !evaluateExpression(inner, context);
	}

	// Handle parentheses for grouping
	if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
		return evaluateExpression(trimmed.slice(1, -1), context);
	}

	// Null-coalesce (??): split outside parens; pick first non-null/undefined
	if (trimmed.includes('??')) {
		const parts = splitLogicalOperator(trimmed, '??');
		if (parts.length > 1) {
			for (let i = 0; i < parts.length; i++) {
				const v = evaluateExpression(parts[i].trim(), context);
				if (v !== null && v !== undefined) return v;
				if (i === parts.length - 1) return v;
			}
		}
	}

	// Whitelisted method calls — `<receiver>.<method>(<args>)`
	const methodCall = matchMethodCall(trimmed);
	if (methodCall) {
		const receiver = evaluateExpression(methodCall.receiver, context);
		const args = methodCall.args.map((a) => evaluateExpression(a, context));
		return applyMethod(receiver, methodCall.method, args);
	}

	// Check for comparison operators (order matters - check === before ==)
	const comparisonMatch = trimmed.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/);

	if (comparisonMatch) {
		const [, leftExpr, operator, rightExpr] = comparisonMatch;
		const left = evaluateSimplePath(leftExpr.trim(), context);
		const right = parseValue(rightExpr.trim(), context);

		switch (operator) {
			case '===':
				return left === right;
			case '!==':
				return left !== right;
			case '==':
				return left == right; // eslint-disable-line eqeqeq
			case '!=':
				return left != right; // eslint-disable-line eqeqeq
			case '>':
				return (left as number) > (right as number);
			case '<':
				return (left as number) < (right as number);
			case '>=':
				return (left as number) >= (right as number);
			case '<=':
				return (left as number) <= (right as number);
		}
	}

	// Arithmetic: + and - (lowest precedence). String concat for + when either side is a string.
	const additive = splitArithmetic(trimmed, ['+', '-']);
	if (additive) {
		let result = evaluateExpression(additive.parts[0], context);
		for (let i = 0; i < additive.ops.length; i++) {
			const right = evaluateExpression(additive.parts[i + 1], context);
			if (additive.ops[i] === '+') {
				if (typeof result === 'string' || typeof right === 'string') {
					result = String(result ?? '') + String(right ?? '');
				} else {
					result = toNumber(result) + toNumber(right);
				}
			} else {
				result = toNumber(result) - toNumber(right);
			}
		}
		return result;
	}

	// Arithmetic: *, /, % (higher precedence)
	const multiplicative = splitArithmetic(trimmed, ['*', '/', '%']);
	if (multiplicative) {
		let result = toNumber(evaluateExpression(multiplicative.parts[0], context));
		for (let i = 0; i < multiplicative.ops.length; i++) {
			const right = toNumber(evaluateExpression(multiplicative.parts[i + 1], context));
			const op = multiplicative.ops[i];
			if (op === '*') result *= right;
			else if (op === '/') result = right === 0 ? 0 : result / right;
			else result = right === 0 ? 0 : result % right;
		}
		return result;
	}

	// Fallback: try to parse as value (literal or path)
	return parseValue(trimmed, context);
}

/** Coerce any value to a finite number (NaN/non-numeric → 0). */
function toNumber(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

/**
 * Split an expression on top-level binary arithmetic operators, respecting
 * parentheses and treating leading `-`/`+` as unary (sign of a literal).
 * Returns null if the expression has no binary operator from the set.
 */
function splitArithmetic(
	expr: string,
	operators: string[]
): { ops: string[]; parts: string[] } | null {
	const parts: string[] = [];
	const ops: string[] = [];
	let depth = 0;
	let bracketDepth = 0;
	let braceDepth = 0;
	let inStr: '"' | "'" | null = null;
	let current = '';
	let prevNonSpace = '';

	for (let i = 0; i < expr.length; i++) {
		const ch = expr[i];

		// Inside a quoted string — pass everything through, only watch for the closing quote.
		if (inStr) {
			current += ch;
			if (ch === inStr && expr[i - 1] !== '\\') inStr = null;
			prevNonSpace = ch;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inStr = ch;
			current += ch;
			prevNonSpace = ch;
			continue;
		}

		if (ch === '(') {
			depth++;
			current += ch;
			prevNonSpace = ch;
			continue;
		}
		if (ch === ')') {
			depth--;
			current += ch;
			prevNonSpace = ch;
			continue;
		}
		if (ch === '[') {
			bracketDepth++;
			current += ch;
			prevNonSpace = ch;
			continue;
		}
		if (ch === ']') {
			bracketDepth--;
			current += ch;
			prevNonSpace = ch;
			continue;
		}
		if (ch === '{') {
			braceDepth++;
			current += ch;
			prevNonSpace = ch;
			continue;
		}
		if (ch === '}') {
			braceDepth--;
			current += ch;
			prevNonSpace = ch;
			continue;
		}
		if (depth === 0 && bracketDepth === 0 && braceDepth === 0 && operators.includes(ch)) {
			const isBinary = /[a-zA-Z0-9_)\]}'"]/.test(prevNonSpace);
			if (isBinary) {
				parts.push(current.trim());
				ops.push(ch);
				current = '';
				prevNonSpace = '';
				continue;
			}
		}
		current += ch;
		if (ch !== ' ') prevNonSpace = ch;
	}

	if (parts.length === 0) return null;
	parts.push(current.trim());
	return { ops, parts };
}

/**
 * Match a method call at the end of an expression: `<receiver>.<method>(<args>)`.
 * Respects nested parens and quoted strings inside args.
 */
function matchMethodCall(
	expr: string
): { receiver: string; method: string; args: string[] } | null {
	if (!expr.endsWith(')')) return null;

	// Find the matching `(` for the trailing `)`.
	let depth = 0;
	let openIdx = -1;
	for (let i = expr.length - 1; i >= 0; i--) {
		const ch = expr[i];
		if (ch === ')') depth++;
		else if (ch === '(') {
			depth--;
			if (depth === 0) {
				openIdx = i;
				break;
			}
		}
	}
	if (openIdx <= 0) return null;

	// `<head>.<method>(<argsExpr>)` — head must end with `.method`.
	const head = expr.slice(0, openIdx);
	const dotIdx = head.lastIndexOf('.');
	if (dotIdx <= 0) return null;

	const method = head.slice(dotIdx + 1);
	if (!/^[a-zA-Z_][\w]*$/.test(method)) return null;

	const receiver = head.slice(0, dotIdx).trim();
	if (!receiver) return null;

	const argsExpr = expr.slice(openIdx + 1, expr.length - 1).trim();
	const args = argsExpr === '' ? [] : splitArgs(argsExpr);
	return { receiver, method, args };
}

/** Split a comma-separated argument list, respecting parens and quoted strings. */
function splitArgs(expr: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let inStr: '"' | "'" | null = null;
	let current = '';
	for (let i = 0; i < expr.length; i++) {
		const ch = expr[i];
		if (inStr) {
			current += ch;
			if (ch === inStr && expr[i - 1] !== '\\') inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inStr = ch;
			current += ch;
			continue;
		}
		if (ch === '(') depth++;
		else if (ch === ')') depth--;
		if (ch === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
			continue;
		}
		current += ch;
	}
	if (current.trim() !== '') parts.push(current.trim());
	return parts;
}

/** Apply a whitelisted method on a receiver value. Unknown methods return undefined. */
function applyMethod(receiver: unknown, method: string, args: unknown[]): unknown {
	if (typeof receiver === 'string') {
		switch (method) {
			case 'toLowerCase':
				return receiver.toLowerCase();
			case 'toUpperCase':
				return receiver.toUpperCase();
			case 'trim':
				return receiver.trim();
			case 'includes':
				return receiver.includes(String(args[0] ?? ''));
			case 'startsWith':
				return receiver.startsWith(String(args[0] ?? ''));
			case 'endsWith':
				return receiver.endsWith(String(args[0] ?? ''));
		}
	}
	if (Array.isArray(receiver)) {
		switch (method) {
			case 'includes':
				return receiver.includes(args[0]);
			case 'join':
				return receiver.join(String(args[0] ?? ','));
			case 'sum': {
				const field = typeof args[0] === 'string' ? (args[0] as string) : null;
				return receiver.reduce((a: number, v: unknown) => {
					const n = field
						? Number((v as Record<string, unknown> | null | undefined)?.[field])
						: Number(v);
					return a + (Number.isFinite(n) ? n : 0);
				}, 0);
			}
			case 'count':
				return receiver.length;
			case 'first':
				return receiver[0];
			case 'last':
				return receiver[receiver.length - 1];
			case 'where': {
				// .where(field, value) — equality match. Pass-through when value is
				// nullish or 'All' so a "no filter" select can bind directly.
				const field = args[0];
				const value = args[1];
				if (typeof field !== 'string') return receiver;
				if (value === null || value === undefined || value === 'All') return receiver;
				return receiver.filter(
					(r) =>
						r !== null &&
						typeof r === 'object' &&
						(r as Record<string, unknown>)[field] === value
				);
			}
			case 'whereIn': {
				// .whereIn(field, [values]) — pass-through on empty/non-array.
				const field = args[0];
				const values = args[1];
				if (typeof field !== 'string') return receiver;
				if (!Array.isArray(values) || values.length === 0) return receiver;
				return receiver.filter(
					(r) =>
						r !== null &&
						typeof r === 'object' &&
						values.includes((r as Record<string, unknown>)[field])
				);
			}
			case 'sortBy': {
				// .sortBy(field, 'asc'|'desc') — non-mutating, numeric-aware.
				const field = args[0];
				if (typeof field !== 'string') return receiver;
				const dir = args[1] === 'desc' ? -1 : 1;
				return [...receiver].sort((a, b) => {
					const av = (a as Record<string, unknown> | null)?.[field];
					const bv = (b as Record<string, unknown> | null)?.[field];
					if (av === bv) return 0;
					if (av === null || av === undefined) return -1;
					if (bv === null || bv === undefined) return 1;
					if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
					return (
						String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir
					);
				});
			}
			case 'limit': {
				const n = Number(args[0]);
				if (!Number.isFinite(n) || n < 0) return receiver;
				return receiver.slice(0, n);
			}
			case 'reverse':
				return [...receiver].reverse();
		}
	}
	if (typeof receiver === 'number') {
		switch (method) {
			case 'toFixed':
				return receiver.toFixed(Number(args[0] ?? 0));
		}
	}
	return undefined;
}

/**
 * Split expression by logical operator, respecting parentheses.
 */
function splitLogicalOperator(expr: string, operator: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';

	for (let i = 0; i < expr.length; i++) {
		const char = expr[i];

		if (char === '(') {
			depth++;
			current += char;
		} else if (char === ')') {
			depth--;
			current += char;
		} else if (depth === 0 && expr.slice(i, i + operator.length) === operator) {
			parts.push(current.trim());
			current = '';
			i += operator.length - 1; // Skip operator
		} else {
			current += char;
		}
	}

	if (current.trim()) {
		parts.push(current.trim());
	}

	return parts;
}

/**
 * Path segment: either a static dot-segment (`foo`) or a bracket lookup whose
 * key is itself an expression to evaluate (`[state.k]`, `[0]`, `['Astro']`).
 */
type PathSegment = { kind: 'dot'; key: string } | { kind: 'bracket'; expr: string };

/**
 * Tokenize a dot/bracket path into segments.
 * Handles `state.m[state.k].name`, `state.r[0]`, `state.m['foo']`.
 * Quotes inside brackets are respected so `[']']` parses correctly.
 */
function parsePath(path: string): PathSegment[] {
	const segments: PathSegment[] = [];
	let buf = '';
	let i = 0;
	while (i < path.length) {
		const ch = path[i];
		if (ch === '.') {
			if (buf) {
				segments.push({ kind: 'dot', key: buf });
				buf = '';
			}
			i++;
			continue;
		}
		if (ch === '[') {
			if (buf) {
				segments.push({ kind: 'dot', key: buf });
				buf = '';
			}
			let depth = 1;
			let j = i + 1;
			let inStr: '"' | "'" | null = null;
			while (j < path.length && depth > 0) {
				const c = path[j];
				if (inStr) {
					if (c === inStr && path[j - 1] !== '\\') inStr = null;
				} else if (c === '"' || c === "'") {
					inStr = c;
				} else if (c === '[') {
					depth++;
				} else if (c === ']') {
					depth--;
					if (depth === 0) break;
				}
				j++;
			}
			if (depth !== 0) return segments; // malformed — bail
			segments.push({ kind: 'bracket', expr: path.slice(i + 1, j) });
			i = j + 1;
			continue;
		}
		buf += ch;
		i++;
	}
	if (buf) segments.push({ kind: 'dot', key: buf });
	return segments;
}

/**
 * Evaluate a simple dot/bracket-notation path against context.
 * Supports optional chaining (`?.`) and bracket indexing with expressions.
 *
 * @example
 *   state.user.name
 *   state.user?.name
 *   state.repos_by_lang[state.filter]
 *   state.items[0].title
 */
function evaluateSimplePath(path: string, context: ResolverContext): unknown {
	const normalizedPath = path.replace(/\?\./g, '.');
	const segments = parsePath(normalizedPath);
	if (segments.length === 0) return undefined;

	// Determine root from the first dot-segment.
	const first = segments[0];
	let current: unknown;
	let startIdx = 1;

	if (first.kind !== 'dot') {
		// Path can't start with a bracket — nothing meaningful to resolve.
		return undefined;
	}

	const rootKey = first.key;
	if (rootKey === 'state') {
		current = context.state;
	} else if (rootKey === 'data' && context.data) {
		current = context.data;
	} else if (rootKey === 'item' && context.item !== undefined) {
		current = context.item;
	} else if (rootKey === 'index' && context.index !== undefined) {
		return segments.length === 1 ? context.index : undefined;
	} else if (context[rootKey] !== undefined) {
		current = context[rootKey];
	} else {
		// Implicit state-prefix: treat the whole path as state-relative.
		current = context.state;
		startIdx = 0;
	}

	for (let idx = startIdx; idx < segments.length; idx++) {
		if (current === null || current === undefined) return undefined;
		const seg = segments[idx];
		let key: string | number;
		if (seg.kind === 'dot') {
			key = seg.key;
		} else {
			const resolved = evaluateExpression(seg.expr, context);
			if (resolved === null || resolved === undefined) return undefined;
			key = typeof resolved === 'number' ? resolved : String(resolved);
		}
		if (typeof current === 'string' || Array.isArray(current)) {
			current = (current as unknown as Record<string | number, unknown>)[key];
			continue;
		}
		if (typeof current !== 'object') return undefined;
		current = (current as Record<string | number, unknown>)[key];
	}

	return current;
}

/**
 * Parse a value from expression (handles literals and paths).
 *
 * Supported literals:
 *   - `null`, `undefined`, `true`, `false`
 *   - Strings: `'foo'` / `"foo"`
 *   - Numbers: `42`, `-1.5`
 *   - Arrays: `[1, 2, 'x']`, `[{value: 'a', label: 'A'}]`
 *   - Objects: `{key: 'val', n: 1}` (key is identifier, string, or number)
 *
 * Anything else is treated as a state-relative path.
 */
function parseValue(value: string, context: ResolverContext): unknown {
	// Null literal
	if (value === 'null') return null;
	if (value === 'undefined') return undefined;

	// Boolean literals
	if (value === 'true') return true;
	if (value === 'false') return false;

	// String literals (single or double quotes)
	const stringMatch = value.match(/^['"](.*)['"]$/);
	if (stringMatch) {
		return stringMatch[1];
	}

	// Number literals
	const num = Number(value);
	if (!isNaN(num)) {
		return num;
	}

	// Array literal: `[item, item, ...]` — each item is itself an expression.
	const arrLit = parseArrayLiteral(value, context);
	if (arrLit !== undefined) return arrLit;

	// Object literal: `{key: value, ...}` — keys may be identifiers, quoted
	// strings, or numbers; values are recursively evaluated as expressions.
	const objLit = parseObjectLiteral(value, context);
	if (objLit !== undefined) return objLit;

	// Otherwise, treat as path
	return evaluateSimplePath(value, context);
}

/**
 * Locate the top-level `?` and matching `:` for a ternary expression,
 * respecting parens / brackets / braces and string literals so that
 * `:` inside a nested object literal doesn't split the ternary
 * prematurely. Returns null when no ternary is present.
 *
 * Treats `?.` (optional chaining) as not-a-ternary.
 */
function findTernarySplit(expr: string): { cond: string; then: string; else: string } | null {
	let depth = 0;
	let inStr: '"' | "'" | null = null;
	let qIdx = -1;
	for (let i = 0; i < expr.length; i++) {
		const ch = expr[i];
		if (inStr) {
			if (ch === inStr && expr[i - 1] !== '\\') inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inStr = ch;
			continue;
		}
		if (ch === '(' || ch === '[' || ch === '{') depth++;
		else if (ch === ')' || ch === ']' || ch === '}') depth--;
		else if (ch === '?' && depth === 0 && expr[i + 1] !== '.') {
			qIdx = i;
			break;
		}
	}
	if (qIdx === -1) return null;

	let cIdx = -1;
	let d = 0;
	inStr = null;
	for (let i = qIdx + 1; i < expr.length; i++) {
		const ch = expr[i];
		if (inStr) {
			if (ch === inStr && expr[i - 1] !== '\\') inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inStr = ch;
			continue;
		}
		if (ch === '(' || ch === '[' || ch === '{') d++;
		else if (ch === ')' || ch === ']' || ch === '}') d--;
		else if (ch === ':' && d === 0) {
			cIdx = i;
			break;
		}
	}
	if (cIdx === -1) return null;

	return {
		cond: expr.slice(0, qIdx).trim(),
		then: expr.slice(qIdx + 1, cIdx).trim(),
		else: expr.slice(cIdx + 1).trim()
	};
}

/**
 * Split an expression on a single-character separator at top level —
 * respecting `()` / `[]` / `{}` nesting and string literals. Used by
 * array / object literal parsers.
 */
function splitTopLevel(expr: string, sep: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let inStr: '"' | "'" | null = null;
	let current = '';
	for (let i = 0; i < expr.length; i++) {
		const ch = expr[i];
		if (inStr) {
			current += ch;
			if (ch === inStr && expr[i - 1] !== '\\') inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inStr = ch;
			current += ch;
			continue;
		}
		if (ch === '(' || ch === '[' || ch === '{') depth++;
		else if (ch === ')' || ch === ']' || ch === '}') depth--;
		if (ch === sep && depth === 0) {
			parts.push(current);
			current = '';
			continue;
		}
		current += ch;
	}
	if (current.trim() !== '') parts.push(current);
	return parts;
}

/** Find the index of the first top-level `:` in a key:value pair. */
function findKeyValueSplit(pair: string): number {
	let depth = 0;
	let inStr: '"' | "'" | null = null;
	for (let i = 0; i < pair.length; i++) {
		const ch = pair[i];
		if (inStr) {
			if (ch === inStr && pair[i - 1] !== '\\') inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inStr = ch;
			continue;
		}
		if (ch === '(' || ch === '[' || ch === '{') depth++;
		else if (ch === ')' || ch === ']' || ch === '}') depth--;
		else if (ch === ':' && depth === 0) return i;
	}
	return -1;
}

function parseArrayLiteral(value: string, context: ResolverContext): unknown[] | undefined {
	const t = value.trim();
	if (t.length < 2 || t[0] !== '[' || t[t.length - 1] !== ']') return undefined;
	if (!isBalanced(t)) return undefined;
	const inner = t.slice(1, -1).trim();
	if (inner === '') return [];
	return splitTopLevel(inner, ',').map((p) => evaluateExpression(p.trim(), context));
}

function parseObjectLiteral(
	value: string,
	context: ResolverContext
): Record<string, unknown> | undefined {
	const t = value.trim();
	if (t.length < 2 || t[0] !== '{' || t[t.length - 1] !== '}') return undefined;
	if (!isBalanced(t)) return undefined;
	const inner = t.slice(1, -1).trim();
	if (inner === '') return {};
	const result: Record<string, unknown> = {};
	for (const pair of splitTopLevel(inner, ',')) {
		const colonIdx = findKeyValueSplit(pair);
		if (colonIdx === -1) continue; // malformed pair — skip
		const rawKey = pair.slice(0, colonIdx).trim();
		const rawVal = pair.slice(colonIdx + 1).trim();
		let key: string | undefined;
		const strMatch = rawKey.match(/^['"](.*)['"]$/);
		if (strMatch) {
			key = strMatch[1];
		} else if (/^[a-zA-Z_$][\w$]*$/.test(rawKey)) {
			key = rawKey;
		} else if (!isNaN(Number(rawKey))) {
			key = String(Number(rawKey));
		}
		if (key === undefined) continue;
		result[key] = evaluateExpression(rawVal, context);
	}
	return result;
}

/**
 * Quick balance check — verifies that every `(`, `[`, `{` has a matching
 * close in order, ignoring characters inside string literals. Used by the
 * literal parsers to bail out on malformed input.
 */
function isBalanced(expr: string): boolean {
	const stack: string[] = [];
	const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
	let inStr: '"' | "'" | null = null;
	for (let i = 0; i < expr.length; i++) {
		const ch = expr[i];
		if (inStr) {
			if (ch === inStr && expr[i - 1] !== '\\') inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inStr = ch;
			continue;
		}
		if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
		else if (ch === ')' || ch === ']' || ch === '}') {
			if (stack.pop() !== pairs[ch]) return false;
		}
	}
	return stack.length === 0 && inStr === null;
}

/**
 * Resolve all expressions in a string, returning the result.
 *
 * If the string is a single expression, returns the raw value.
 * If the string contains embedded expressions, returns a string with values interpolated.
 *
 * @example
 * resolveString('{state.name}', ctx); // Returns actual value (could be object)
 * resolveString('Hello {state.name}!', ctx); // Returns "Hello Alice!"
 */
export function resolveString(value: string, context: ResolverContext): unknown {
	// Single expression - return raw value (preserves type)
	if (isSingleExpression(value)) {
		const match = value.match(SINGLE_EXPRESSION_REGEX);
		if (match) {
			try {
				return evaluateExpression(match[1], context);
			} catch {
				return undefined;
			}
		}
	}

	// Multiple expressions - interpolate as string
	return value.replace(EXPRESSION_REGEX, (_, expr) => {
		try {
			const result = evaluateExpression(expr, context);
			return result === null || result === undefined ? '' : String(result);
		} catch {
			return '';
		}
	});
}

/**
 * Resolve all expressions in an object's values recursively.
 *
 * @param obj - Object with potential expression values
 * @param context - The resolver context
 * @returns New object with resolved values
 */
export function resolveObject(
	obj: Record<string, unknown>,
	context: ResolverContext
): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(obj)) {
		result[key] = resolveValue(value, context);
	}

	return result;
}

/**
 * Detect a UINode-shaped subtree. We use a narrow signature — a string `type`
 * combined with at least one widget-tree marker (props/children/bind/show/items
 * /condition). Such subtrees are passed through unresolved so they can be
 * resolved later at render time, against the loop context that exists at the
 * point of rendering (e.g. `{item.label}` inside a `master-detail` detail
 * pane sees `item = selectedItem`, not the parent's `item`).
 */
function isUINodeSpec(v: Record<string, unknown>): boolean {
	if (typeof v.type !== 'string') return false;
	return (
		'props' in v ||
		'children' in v ||
		'bind' in v ||
		'show' in v ||
		'items' in v ||
		'condition' in v
	);
}

/**
 * Resolve any value (string, object, array, or primitive).
 */
export function resolveValue(value: unknown, context: ResolverContext): unknown {
	if (typeof value === 'string') {
		return resolveString(value, context);
	}

	if (Array.isArray(value)) {
		return value.map((item) => resolveValue(item, context));
	}

	if (value !== null && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		if (isUINodeSpec(obj)) {
			// Leave UINode subtrees raw for downstream NodeRenderer to resolve.
			return obj;
		}
		return resolveObject(obj, context);
	}

	return value;
}

/**
 * Evaluate a condition expression for use in 'show' or 'condition' props.
 * Always returns a boolean.
 */
export function evaluateCondition(expression: string, context: ResolverContext): boolean {
	// Remove curly braces if present
	const clean = expression.replace(/^\{|\}$/g, '').trim();
	const result = evaluateExpression(clean, context);

	// Convert to boolean
	return Boolean(result);
}
