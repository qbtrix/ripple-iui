// routes/pawbar/card-policy.test.ts — The landing's card policy, rule by rule.
// Refused: non-allow-listed actions at any depth (ui and state), blocked
// widgets, non-https/non-relative URLs under URL keys, script and data URLs in
// any string. Allowed: the recorded chat scenarios, relative and https URLs,
// expressions, and prefixes of allowed actions while a spec is still streaming.

import { describe, expect, test } from 'vitest';
import { refuseCard } from './card-policy.js';
import { scenarios } from '../live/scenarios.js';

const button = (on_click: unknown) => ({ ui: { type: 'button', props: { label: 'Go' }, on_click } });
const link = (key: string, value: string) => ({ ui: { type: 'image', props: { [key]: value } } });

describe('actions', () => {
	test.each(['set', 'toggle', 'push', 'remove', 'open', 'emit', 'validate', 'toast', 'branch'])('allows %s', (action) => {
		expect(refuseCard(button({ action, target: 'x' }))).toBeNull();
	});

	test.each(['api', 'navigate', 'run_source', 'call_binding', 'invoke_tool', 'invoke', 'confirm', 'submit', 'https://evil.example/post'])(
		'refuses %s',
		(action) => {
			expect(refuseCard(button({ action, url: '/x' }))).toBe(`action:${action}`);
		}
	);

	test('walks flow steps, nested children and state', () => {
		expect(refuseCard(button({ action: 'flow', steps: [{ action: 'set', target: 'a', value: 1 }] }))).toBeNull();
		expect(refuseCard(button({ action: 'flow', steps: [{ action: 'set' }, { action: 'api', url: '/buy' }] }))).toBe('action:api');
		expect(refuseCard(button({ action: 'branch', condition: '{state.a}', then: [{ action: 'navigate', url: '/' }] }))).toBe('action:navigate');
		const deep = { ui: { type: 'flex', children: [{ type: 'card', children: [button([{ action: 'navigate', url: '/' }])] }] } };
		expect(refuseCard(deep)).toBe('action:navigate');
		expect(refuseCard({ ui: { type: 'text' }, state: { later: { on_click: { action: 'api' } } } })).toBe('action:api');
	});

	test('while streaming, a prefix of an allowed action is not refused yet', () => {
		expect(refuseCard(button({ action: 'se' }), { partial: true })).toBeNull();
		expect(refuseCard(button({ action: 'se' }))).toBe('action:se');
		expect(refuseCard(button({ action: 'ap' }), { partial: true })).toBe('action:ap');
	});
});

test.each(['embed', 'ripple-frame', 'richtext'])('refuses the %s widget anywhere', (type) => {
	expect(refuseCard({ ui: { type: 'flex', children: [{ type }] } })).toBe(`widget:${type}`);
});

describe('urls', () => {
	test.each([
		['src', 'https://img.example/a.png'],
		['href', '/live'],
		['image', 'images/a.png'],
		['url', '#top'],
		['poster', '{state.cover}'],
		['background', './bg.jpg']
	])('allows %s = %s', (key, value) => {
		expect(refuseCard(link(key, value))).toBeNull();
	});

	test.each([
		['src', 'http://img.example/a.png'],
		['href', '//evil.example'],
		['avatar', 'ftp://x/y'],
		['link', 'mailto:a@b.example'],
		['Cover', 'http://x'],
		['tile', ' javascript:alert(1)']
	])('refuses %s = %s', (key, value) => {
		expect(refuseCard(link(key, value))).toMatch(/^unsafe_url/);
	});

	test('refuses script and data URLs in any string, including state and obfuscated forms', () => {
		expect(refuseCard({ ui: { type: 'text', props: { text: 'javascript:alert(1)' } } })).toBe('unsafe_url');
		expect(refuseCard({ ui: { type: 'text' }, state: { rows: ['ok', 'java\tscript:alert(1)'] } })).toBe('unsafe_url');
		expect(refuseCard({ ui: { type: 'text' }, state: { x: 'VBScript:msgbox' } })).toBe('unsafe_url');
		expect(refuseCard({ ui: { type: 'text' }, state: { x: 'data:text/html;base64,PHNjcmlwdD4=' } })).toBe('unsafe_url');
		expect(refuseCard({ ui: { type: 'text' }, state: { x: 'data:,hi' } })).toBe('unsafe_url');
	});

	test('plain text that merely starts with "Data:" is fine', () => {
		expect(refuseCard({ ui: { type: 'text', props: { text: 'Data: monthly, by region' } } })).toBeNull();
	});
});

test('a card is {ui, state?}: data sources, theme or any other top-level key refuse it', () => {
	expect(refuseCard({ version: '1.0', ui: { type: 'text' }, state: {} })).toBeNull();
	expect(refuseCard({ ui: { type: 'text' }, data: { sources: [{ id: 'x', url: 'https://api.example/x' }] } })).toBe('key:data');
	expect(refuseCard({ ui: { type: 'text' }, theme: { accent: 'red' } })).toBe('key:theme');
	expect(refuseCard({ ui: { type: 'text' }, st: {} }, { partial: true })).toBeNull();
});

test('every recorded chat scenario passes; the store checkout demo does not', () => {
	for (const s of scenarios) {
		const spec = JSON.parse(s.fixture.chunks.map((c) => c.text).join(''));
		expect([s.id, refuseCard(spec)]).toEqual([s.id, s.needsStore ? 'action:api' : null]);
	}
});
