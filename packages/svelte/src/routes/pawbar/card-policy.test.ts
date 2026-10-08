// routes/pawbar/card-policy.test.ts — The landing's card policy, rule by rule.
// Includes the review's payloads: expression-built javascript: URLs, widget
// aliases for the blocked widgets, markdown images and http links, `/\host`,
// and CSS url(). The recorded chat scenarios must all pass, and the widget
// allowlist must match the vendored manifest.

import { describe, expect, test } from 'vitest';
import { refuseCard } from './card-policy.js';
import { CHAT_WIDGET_TYPES } from './widget-types.js';
import { scenarios } from '../live/scenarios.js';
import manifest from '../../../static/manifest.json';

const button = (on_click: unknown) => ({ ui: { type: 'button', props: { label: 'Go' }, on_click } });
const prop = (key: string, value: string, type = 'image') => ({ ui: { type, props: { [key]: value } } });
const text = (value: string) => ({ ui: { type: 'text', props: { text: value } } });

describe('card shape', () => {
	test('only version, ui and state at the top', () => {
		expect(refuseCard({ version: '1.0', ui: { type: 'text' }, state: {} })).toBeNull();
		expect(refuseCard({ ui: { type: 'text' }, data: { sources: [{ url: 'https://api.example/x' }] } })).toBe('key:data');
		expect(refuseCard({ ui: { type: 'text' }, theme: {} })).toBe('key:theme');
		expect(refuseCard({ ui: { type: 'text' }, st: {} }, { partial: true })).toBeNull();
		expect(refuseCard('nope')).toBe('invalid');
	});
});

describe('actions', () => {
	test.each(['set', 'toggle', 'push', 'remove', 'open', 'emit', 'flow', 'branch', 'validate', 'toast'])('allows %s', (action) => {
		expect(refuseCard(button({ action, target: 'x' }))).toBeNull();
	});

	test.each(['api', 'API', 'navigate', 'run_source', 'call_binding', 'invoke_tool', 'invoke', 'confirm', 'submit', 'https://evil.example/post'])(
		'refuses %s',
		(action) => {
			expect(refuseCard(button({ action }))).toBe(`action:${action}`);
		}
	);

	test('walks flow and branch steps, nested children and state', () => {
		expect(refuseCard(button({ action: 'flow', steps: [{ action: 'set', target: 'a', value: 1 }] }))).toBeNull();
		expect(refuseCard(button({ action: 'flow', steps: [{ action: 'set' }, { action: 'api' }] }))).toBe('action:api');
		expect(refuseCard(button({ action: 'branch', condition: '{state.a}', then: [{ action: 'navigate' }] }))).toBe('action:navigate');
		const deep = { ui: { type: 'flex', children: [{ type: 'card', children: [button([{ action: 'navigate' }])] }] } };
		expect(refuseCard(deep)).toBe('action:navigate');
		expect(refuseCard({ ui: { type: 'text' }, state: { later: { on_click: { Action: 'api' } } } })).toBe('action:api');
	});

	test('while streaming, a prefix of an allowed action is not refused yet', () => {
		expect(refuseCard(button({ action: 'se' }), { partial: true })).toBeNull();
		expect(refuseCard(button({ action: 'se' }))).toBe('action:se');
		expect(refuseCard(button({ action: 'ap' }), { partial: true })).toBe('action:ap');
	});
});

describe('widgets', () => {
	test.each(['embed', 'ripple-frame', 'richtext', 'iframe', 'frame', 'nested-spec', 'md', 'Embed', 'not-a-widget'])(
		'refuses the %s widget node',
		(type) => {
			expect(refuseCard({ ui: { type: 'flex', children: [{ type, props: {} }] } })).toBe(`widget:${type}`);
		}
	);

	test('refuses a renderable alias even outside children; ignores non-widget type fields', () => {
		expect(refuseCard({ ui: { type: 'tabs', props: { items: [{ label: 'a', content: { type: 'iframe' } }] } } })).toBe('widget:iframe');
		expect(refuseCard({ ui: { type: 'chart', props: { type: 'bar', data: [] } } })).toBeNull();
	});

	test('streaming: a widget name on its way to an allowed one is not refused yet', () => {
		expect(refuseCard({ ui: { type: 'car' } }, { partial: true })).toBeNull();
		expect(refuseCard({ ui: { type: 'ifr' } }, { partial: true })).toBe('widget:ifr');
	});

	test('the allowlist is the vendored manifest minus embed, ripple-frame and richtext', () => {
		const blocked = new Set(['embed', 'ripple-frame', 'richtext']);
		const expected = manifest.widgets.map((w) => w.type).filter((t) => !blocked.has(t));
		expect([...CHAT_WIDGET_TYPES].toSorted()).toEqual(expected.toSorted());
	});
});

describe('urls', () => {
	test.each([
		['src', 'https://img.example/a.png'],
		['href', '/live'],
		['image', 'images/a.png'],
		['url', '#top'],
		['background', './bg.jpg'],
		['target', 'people'],
		['icon', 'check']
	])('allows %s = %s', (key, value) => {
		expect(refuseCard(prop(key, value))).toBeNull();
	});

	test.each([
		['href', "{'java'+'script:alert(1)'}"],
		['href', '{state.a}:alert(document.domain)'],
		['href', 'javascript{state.c}'],
		['imageUrl', '{state.img}'],
		['iconSrc', '{item.icon}'],
		['poster', '{state.cover}']
	])('refuses any expression in a URL key: %s = %s', (key, value) => {
		expect(refuseCard(prop(key, value, 'cta'))).toBe('expression_url');
	});

	test('URL keys in state follow the same rule', () => {
		expect(refuseCard({ ui: { type: 'text' }, state: { a: 'javascript', heroImage: '{state.a}' } })).toBe('expression_url');
	});

	test.each([
		['src', 'http://img.example/a.png'],
		['href', '//evil.example'],
		['href', '/\\evil.example'],
		['avatar', 'ftp://x/y'],
		['link', 'mailto:a@b.example'],
		['Cover', 'http://x'],
		['href', ' java\tscript:alert(1)'],
		['href', 'data:text/html,<script>']
	])('refuses %s = %s', (key, value) => {
		expect(refuseCard(prop(key, value))).toBe('unsafe_url');
	});

	test('refuses CSS url() in a URL key or a style string', () => {
		expect(refuseCard(prop('background', 'url(http://x/a.png)'))).toBe('style_url');
		expect(refuseCard(prop('style', 'background:url(https://x/a.png)', 'container'))).toBe('style_url');
	});

	test('refuses script and data URLs in any string, including state and obfuscated forms', () => {
		expect(refuseCard(text('javascript:alert(1)'))).toBe('unsafe_url');
		expect(refuseCard({ ui: { type: 'text' }, state: { rows: ['ok', 'java\tscript:alert(1)'] } })).toBe('unsafe_url');
		expect(refuseCard({ ui: { type: 'text' }, state: { x: 'VBScript:msgbox' } })).toBe('unsafe_url');
		expect(refuseCard({ ui: { type: 'text' }, state: { x: 'data:text/html;base64,PHNjcmlwdD4=' } })).toBe('unsafe_url');
	});
});

describe('markup and markdown', () => {
	test.each([
		'![](http://beacon.example/a.png)',
		'![x](/local.png)',
		'see [this](http://evil.example)',
		'see [this](https://evil.example)',
		'[x](//evil.example)',
		'<img src=x onerror=alert(1)>',
		'<a href="https://x">x</a>',
		'<iframe srcdoc="x">',
		'visit https://evil.example today',
		'go to www.evil.example'
	])('refuses %s', (value) => {
		expect(refuseCard({ ui: { type: 'markdown', props: { content: value } } })).toBe('markup');
	});

	test('markdown in state is checked too; relative and hash links are fine', () => {
		expect(refuseCard({ ui: { type: 'markdown', props: { content: '{state.md}' } }, state: { md: '![](http://x/b.png)' } })).toBe('markup');
		expect(refuseCard({ ui: { type: 'markdown', props: { content: 'Read [the docs](/docs) or [below](#faq). **Bold** stays.' } } })).toBeNull();
		expect(refuseCard(text('Data: monthly, by region'))).toBeNull();
	});
});

test('every recorded chat scenario passes; the store checkout demo does not', () => {
	for (const s of scenarios) {
		const spec: unknown = JSON.parse(s.fixture.chunks.map((c) => c.text).join(''));
		expect([s.id, refuseCard(spec)]).toEqual([s.id, s.needsStore ? 'action:api' : null]);
	}
});
