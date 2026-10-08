// safe-url.test.ts — pins the URL allowlist every href/src sink in a renderer
// routes through, plus the navigate action's url, which reaches the host.
import { describe, expect, it, vi } from 'vitest';
import { safeUrl, safeStyle } from './safe-url.js';
import { createHeadlessStateManager } from '../headless/state.js';
import { EventDispatcher } from '../core/event-dispatcher.js';
import { WidgetRegistry } from '../core/widget-registry.js';

const BAD = [
	'javascript:alert(1)',
	'JavaScript:alert(1)',
	'  javascript:alert(1)',
	'java\tscript:alert(1)',
	'java\nscript:alert(1)',
	'\u0001javascript:alert(1)',
	'jav&#x61;script:alert(1)',
	'jav&#97;script:alert(1)',
	'javascript&colon;alert(1)',
	'java%73cript:alert(1)',
	'vbscript:msgbox(1)',
	'data:text/html,<script>alert(1)</script>',
	'data:image/svg+xml,<svg onload=alert(1)>',
	'file:///etc/passwd',
	'blob:https://x/1'
];

describe('safeUrl — link', () => {
	// undefined, not '#': an <a target=_blank href=#> would open a copy of the page
	it.each(BAD)('blocks %j as undefined', (v) => expect(safeUrl(v)).toBeUndefined());
	it.each([
		'https://example.com/a?b=1#c',
		'http://example.com',
		'mailto:a@example.com',
		'tel:+15551234',
		'/x',
		'./x',
		'../x',
		'?q=1',
		'#h',
		'//example.com/x'
	])('keeps %j', (v) => expect(safeUrl(v)).toBe(v));
	it('returns undefined for empty / non-string so no link renders', () => {
		expect(safeUrl(undefined)).toBeUndefined();
		expect(safeUrl(null)).toBeUndefined();
		expect(safeUrl('')).toBeUndefined();
		expect(safeUrl('   ')).toBeUndefined();
		expect(safeUrl(42 as unknown as string)).toBeUndefined();
	});
	it('trims surrounding whitespace', () => expect(safeUrl('  https://x.dev  ')).toBe('https://x.dev'));
	it('blocks data: images for links', () => expect(safeUrl('data:image/png;base64,AAAA')).toBeUndefined());
});

describe('safeUrl — resource', () => {
	const r = (v: unknown) => safeUrl(v as string, { kind: 'resource' });
	it.each(BAD)('drops %j', (v) => expect(r(v)).toBeUndefined());
	it.each(['mailto:a@example.com', 'tel:1', '//evil.example/x.png', '/\\evil.example/x.png'])(
		'drops %j',
		(v) => expect(r(v)).toBeUndefined()
	);
	it.each([
		'https://cdn.example.com/a.png',
		'http://cdn.example.com/a.png',
		'/img/a.png',
		'./a.png',
		'data:image/png;base64,AAAA',
		'data:image/jpeg;base64,AAAA',
		'data:image/gif;base64,AAAA',
		'data:image/webp;base64,AAAA'
	])('keeps %j', (v) => expect(r(v)).toBe(v));
});

describe('safeStyle', () => {
	it('drops declarations with an unsafe url(), keeps the rest', () => {
		expect(
			safeStyle({ color: 'red', 'background-image': 'url(javascript:alert(1))', background: 'url("https://x.dev/a.png")' })
		).toEqual({ color: 'red', background: 'url("https://x.dev/a.png")' });
	});
	it('drops expression(), image-set with a bad url, and escaped url(', () => {
		expect(safeStyle({ width: 'expression(alert(1))' })).toEqual({});
		expect(safeStyle({ 'background-image': 'image-set("javascript:x" 1x)' })).toEqual({});
		expect(safeStyle({ background: '\\75 rl(javascript:alert(1))' })).toEqual({});
	});
	it('drops keys that would inject another declaration', () => {
		expect(safeStyle({ 'color:red;background': 'url(javascript:x)', color: 'blue' })).toEqual({ color: 'blue' });
	});
	it('filters a style string declaration by declaration', () => {
		expect(safeStyle('color: red; background: url(javascript:alert(1)); margin: 0')).toBe('color: red; margin: 0');
	});
	it('passes undefined through', () => expect(safeStyle(undefined)).toBeUndefined());
	it('refuses var() inside a resource function (custom-property bypass)', () => {
		// the custom property alone is text; the resource function that reads it is refused
		expect(safeStyle({ '--a': '"//evil.example/x.png"', 'background-image': 'image-set(var(--a) 1x)' })).toEqual({
			'--a': '"//evil.example/x.png"'
		});
		expect(safeStyle({ color: 'red', background: 'url(var(--a))' })).toEqual({ color: 'red' });
		for (const fn of ['image(var(--a))', 'cross-fade(var(--a), red)', 'element(var(--a))', '-webkit-image-set(var(--a) 1x)'])
			expect(safeStyle({ 'background-image': fn })).toEqual({});
	});
	it('checks quoted targets inside resource functions only', () => {
		expect(safeStyle({ 'background-image': 'image("//evil.example/x.png")' })).toEqual({});
		expect(safeStyle({ 'background-image': 'cross-fade(url(javascript:x), red)' })).toEqual({});
		expect(safeStyle({ 'background-image': 'image-set("javascript:x" 1x, "/ok.png" 2x)' })).toEqual({});
		// a quoted `word:` outside a resource function is text, not a URL
		const text = { 'font-family': '"Foo: Bar", sans-serif', content: '"Error: x"', '--label': '"note: hi"', '--c': '"/ok.png"' };
		expect(safeStyle(text)).toEqual(text);
	});
	it('does not let a comment marker inside a string hide a url', () => {
		expect(safeStyle({ 'list-style': '"/*" url("//evil.example/*/x.png")' })).toEqual({});
		expect(safeStyle({ 'background-image': 'image-set("/*" 2x, "//evil.example/*/x.png" 1x)' })).toEqual({});
	});
	it('refuses escapes, newlines and unbalanced quotes or brackets that could shift parsing', () => {
		expect(safeStyle({ 'background-image': 'image-set("\\a//evil.example/x.png" 1x)' })).toEqual({});
		expect(safeStyle({ 'background-image': 'image-set("\n//evil.example/x.png" 1x)' })).toEqual({});
		expect(safeStyle({ 'background-image': 'image-set("a\\22" 2x, "//evil.example/x.png" 1x)' })).toEqual({});
		// widgets join a record with ';', so one value must not open a string the next one closes
		expect(safeStyle({ 'background-image': 'image-set("', x: '" 2x, "//evil.example/x.png" 1x)' })).toEqual({});
		expect(safeStyle({ a: 'red\\', b: '(', c: '"' })).toEqual({});
	});
	it('stays linear on adversarial comment input', () => {
		const evil = '/*a'.repeat(34000);
		const t0 = performance.now();
		safeStyle({ width: evil });
		safeStyle(`width: ${evil}`);
		expect(performance.now() - t0).toBeLessThan(50);
	});
	it('refuses @import and comment-split script tokens', () => {
		expect(safeStyle({ color: 'red; @import "//evil.example/x.css"' })).toEqual({});
		expect(safeStyle({ width: 'expr/**/ession(alert(1))' })).toEqual({});
	});
	it('splits a style string on top-level semicolons only', () => {
		expect(safeStyle('color: red; background: url(data:image/png;base64,AAAA); margin: 0')).toBe(
			'color: red; background: url(data:image/png;base64,AAAA); margin: 0'
		);
		expect(safeStyle('content: "a;b"; color: red')).toBe('content: "a;b"; color: red');
		expect(safeStyle('color: red; background: url(//evil.example/x.png); margin: 0')).toBe('color: red; margin: 0');
	});
});

describe('navigate action', () => {
	it.each([
		["{'java'+'script:alert(1)'}", {}],
		['{state.a}:alert(1)', { a: 'javascript' }],
		['javascript{state.c}', { c: ':alert(1)' }]
	])('never hands the host a javascript: url (%s)', async (url, initial) => {
		const state = createHeadlessStateManager(initial);
		const onEvent = vi.fn();
		const d = new EventDispatcher(state, onEvent, new WidgetRegistry());
		await d.dispatch({ action: 'navigate', url }, { state: state.state });
		expect(onEvent).toHaveBeenCalledTimes(1);
		// blocked == missing: the host gets '' and does nothing
		expect(onEvent.mock.calls[0][0].url).toBe('');
	});
	it('still passes a safe resolved url', async () => {
		const state = createHeadlessStateManager({ p: 'docs' });
		const onEvent = vi.fn();
		const d = new EventDispatcher(state, onEvent, new WidgetRegistry());
		await d.dispatch({ action: 'navigate', url: '/{state.p}' }, { state: state.state });
		expect(onEvent.mock.calls[0][0].url).toBe('/docs');
	});
});
