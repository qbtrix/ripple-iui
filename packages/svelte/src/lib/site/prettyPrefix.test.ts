// lib/site/prettyPrefix.test.ts — Pretty-printing a JSON prefix for the spec peek.

import { describe, expect, test } from 'vitest';
import { prettyPrefix } from './prettyPrefix.js';

const spec = { state: { n: 1, tags: [], who: 'a "quoted" {brace}, [x]: y' }, ui: { type: 'flex', children: [{ type: 'text' }] } };
const wire = JSON.stringify(spec);

describe('prettyPrefix', () => {
	test('a whole document prints like JSON.stringify(x, null, 2)', () => {
		expect(prettyPrefix(wire)).toBe(JSON.stringify(spec, null, 2));
		expect(prettyPrefix(JSON.stringify(spec, null, 4))).toBe(JSON.stringify(spec, null, 2));
	});

	test('every prefix prints as a prefix of the longer one, so the view never reflows', () => {
		let prev = '';
		for (let i = 0; i <= wire.length; i++) {
			const now = prettyPrefix(wire.slice(0, i));
			expect(now.startsWith(prev)).toBe(true);
			prev = now;
		}
	});

	test('strings keep their braces, commas and escapes verbatim', () => {
		expect(prettyPrefix('{"a":"x\\"},[y"}')).toBe('{\n  "a": "x\\"},[y"\n}');
		expect(prettyPrefix('{"a":"half, open {')).toBe('{\n  "a": "half, open {');
	});

	test('never throws on junk, stray closers or the empty string', () => {
		for (const junk of ['', '}}]]', '{"a":}}}}}', '\\', '"', ',,,::', '[{]}'])
			expect(() => prettyPrefix(junk)).not.toThrow();
		expect(prettyPrefix('}}{')).toBe('\n}\n}{');
	});
});
