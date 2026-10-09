// routes/pawbar/card-policy.test.ts — The landing's card policy, rule by rule.
// Includes the review's payloads: expression-built javascript: URLs, widget
// aliases for the blocked widgets, markdown images and http links, `/\host`,
// and CSS url(); and the flow-card review's handler bypasses (a whole-string
// expression in a handler slot that runs an action object kept in state, and a
// follow-up emitting a free-text event). The recorded chat scenarios must all
// pass, and the widget allowlist must match the vendored manifest.

import { describe, expect, test } from 'vitest';
import { HOST_EVENTS, PATH_TARGET_ACTIONS, decodeEntities, refuseCard } from './card-policy.js';
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

describe('handler slots and state', () => {
	// The review's repro cards: a handler slot set to a whole-string expression that
	// resolves to an action object kept in state.
	const askFromState = {
		ui: {
			type: 'ask-user-questions',
			props: {
				questions: [{ id: 'q1', title: 'Anything else?', allowOther: true, options: [{ title: 'No' }] }],
				changeActions: '{state.n.props.entries.0}'
			}
		},
		state: { n: { type: 'audit-log', props: { entries: [{ action: 'emit', target: 'ask', value: { text: 'hi' } }] } } }
	};
	const apiFromState = {
		ui: { type: 'comparison-layout', props: { items: [{ id: 'a', name: 'A', actions: '{state.n.props.entries.0}' }] } },
		state: { n: { type: 'audit-log', props: { entries: [{ action: 'api', url: '/api/v1/x', method: 'POST' }] } } }
	};
	const builtBySet = {
		ui: {
			type: 'flex',
			children: [
				button([
					{ action: 'set', target: 'h.action', value: 'api' },
					{ action: 'set', target: 'h.url', value: '/api/v1/x' }
				]),
				{ type: 'comparison-layout', props: { items: [{ id: 'a', name: 'A', actions: '{state.h}' }] } }
			]
		}
	};

	test.each([
		['ask-user-questions changeActions', askFromState, ['handler_expression', 'state_action']],
		['comparison items[].actions', apiFromState, ['handler_expression', 'action:api']],
		['an action assembled in state by set', builtBySet, ['handler_expression']]
	])("refuses the review's repro: %s", (_, card, reasons) => {
		expect(reasons).toContain(refuseCard(card));
	});

	test.each([
		'on_click', 'on_change', 'on_select', 'on_success', 'actions', 'changeActions', 'completeActions', 'skipActions',
		'finishActions', 'nextActions', 'backActions', 'cancelActions', 'submitActions', 'refreshActions', 'toggleActions',
		'learn_more', 'onRowClick'
	])('a string in %s is refused, alone or in a list', (key) => {
		expect(refuseCard({ ui: { type: 'flex', props: { [key]: '{state.h}' } } })).toBe('handler_expression');
		expect(refuseCard({ ui: { type: 'flex', props: { [key]: [{ action: 'set', target: 'a' }, '{state.h}'] } } })).toBe('handler_expression');
		expect(refuseCard({ ui: { type: 'flex', props: { [key]: 'Approve' } } })).toBe('handler_expression');
	});

	test('handler strings are refused on the node, in nested rows and while streaming', () => {
		expect(refuseCard({ ui: { type: 'button', on_click: '{state.h}' } })).toBe('handler_expression');
		expect(refuseCard({ ui: { type: 'entity-detail', props: { actions: [{ id: 'x', label: 'X', actions: '{state.h}' }] } } })).toBe('handler_expression');
		expect(refuseCard({ ui: { type: 'exec-dashboard', props: { kpis: [{ id: 'k', label: 'K', actions: ['{state.h}'] }] } } })).toBe('handler_expression');
		expect(refuseCard({ ui: { type: 'checklist-layout', props: { items: [{ id: 'i', toggleActions: '{state.h}' }] } } })).toBe('handler_expression');
		expect(refuseCard({ ui: { type: 'ask-user-questions', props: { changeActions: '{sta' } } }, { partial: true })).toBe('handler_expression');
	});

	test('state holds no action object, even one the ui would allow', () => {
		expect(refuseCard({ ui: { type: 'text' }, state: askFromState.state })).toBe('state_action');
		expect(refuseCard({ ui: { type: 'text' }, state: { h: { action: 'set', target: 'x', value: 1 } } })).toBe('state_action');
		expect(refuseCard({ ui: { type: 'text' }, state: { rows: [{ id: 1, Action: 'emit' }] } })).toBe('state_action');
		expect(refuseCard({ ui: { type: 'text' }, state: { later: { on_click: { action: 'toast', message: 'hi' } } } })).toBe('state_action');
		// The same audit row in ui stays allowed.
		expect(refuseCard({ ui: askFromState.state.n })).toBeNull();
	});

	test('legitimate handler slots still pass', () => {
		const comparison = {
			ui: {
				type: 'comparison-layout',
				props: {
					items: [
						{
							id: 'a',
							name: 'Starter',
							actions: { action: 'emit', target: 'checkout', value: { plan: 'starter' } },
							learn_more: { action: 'open', target: 'details_a' }
						}
					]
				}
			}
		};
		const entity = {
			ui: {
				type: 'entity-detail',
				props: {
					title: 'Ana Silva',
					actions: [{ id: 'approve', label: 'Approve', actions: [{ action: 'set', target: 'approved', value: true }] }]
				}
			}
		};
		const wizard = {
			ui: {
				type: 'wizard-layout',
				props: {
					steps: [{ id: 's1', title: 'Details' }],
					nextActions: { action: 'set', target: 'step', value: 1 },
					finishActions: [{ action: 'toast', message: 'Saved' }, { action: 'emit', target: 'checkout', value: '{state.cart}' }]
				}
			},
			state: { step: 0, cart: { items: 2 } }
		};
		const table = { ui: { type: 'table', props: { columns: [], rows: [], onRowClick: { action: 'set', target: 'picked', value: '{event}' } } } };
		for (const card of [comparison, entity, wizard, table]) expect(refuseCard(card)).toBeNull();
	});

	test('only the handler names are gated, case-exact', () => {
		expect(refuseCard({ ui: { type: 'metric', props: { label: 'Transactions', transactions: '1,204', reactions: 'many' } } })).toBeNull();
		expect(refuseCard({ ui: { type: 'text' }, state: { onboarding: 'done', actionsTaken: 'none' } })).toBeNull();
	});
});

describe('follow-up', () => {
	test.each(['ask', 'flow.submit', 'booking', 'Checkout', 'checkout ', '{state.e}', 'tell me more'])('refuses the event %s', (event) => {
		expect(refuseCard({ ui: { type: 'follow-up', props: { event } } })).toBe('follow_up_event');
	});

	test('refuses a non-string event, props filled from state, and a follow-up kept in state', () => {
		expect(refuseCard({ ui: { type: 'follow-up', props: { event: { name: 'ask' } } } })).toBe('follow_up_event');
		expect(refuseCard({ ui: { type: 'follow-up', props: '{state.p}' }, state: { p: { event: 'ask' } } })).toBe('follow_up_props');
		expect(refuseCard({ ui: { type: 'text' }, state: { n: { type: 'follow-up', props: { event: 'ask' } } } })).toBe('follow_up_event');
	});

	test('the host events are checkout, add_to_cart and book', () => {
		expect(HOST_EVENTS).toEqual(['checkout', 'add_to_cart', 'book']);
		expect(refuseCard({ ui: { type: 'follow-up', props: { event: 'bo' } } }, { partial: true })).toBeNull();
		expect(refuseCard({ ui: { type: 'follow-up', props: { event: 'booking' } } })).toBe('follow_up_event');
	});

	test.each([...HOST_EVENTS, 'follow-up'])('allows the event %s', (event) => {
		expect(refuseCard({ ui: { type: 'follow-up', props: { placeholder: 'Ask follow-up', event } } })).toBeNull();
	});

	test('no event is the widget default; a streaming prefix waits', () => {
		expect(refuseCard({ ui: { type: 'follow-up', props: { placeholder: 'Ask follow-up' } } })).toBeNull();
		expect(refuseCard({ ui: { type: 'follow-up' } })).toBeNull();
		expect(refuseCard({ ui: { type: 'follow-up', props: { event: 'chec' } } }, { partial: true })).toBeNull();
		expect(refuseCard({ ui: { type: 'follow-up', props: { event: 'chec' } } })).toBe('follow_up_event');
	});
});

describe('widgets', () => {
	test.each(['embed', 'ripple-frame', 'richtext', 'rich-text', 'map', 'company-header', 'iframe', 'frame', 'nested-spec', 'md', 'Embed', 'not-a-widget'])(
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

	test('rich-text, map and company-header are refused at the root and as nested widgets', () => {
		expect(refuseCard({ ui: { type: 'rich-text', props: { value: '<p>hi</p>' } } })).toBe('widget:rich-text');
		expect(refuseCard({ ui: { type: 'tabs', props: { items: [{ label: 'a', content: { type: 'map' } }] } } })).toBe('widget:map');
		expect(refuseCard({ ui: { type: 'company-header', props: { name: 'Acme' } } }, { partial: true })).toBe('widget:company-header');
		expect(refuseCard({ ui: { type: 'ma' } }, { partial: true })).toBeNull();
	});

	test('the allowlist is the vendored manifest minus the blocked widgets', () => {
		const blocked = new Set(['embed', 'ripple-frame', 'richtext', 'rich-text', 'map', 'company-header']);
		const expected = manifest.widgets.map((w) => w.type).filter((t) => !blocked.has(t));
		expect([...CHAT_WIDGET_TYPES].toSorted()).toEqual(expected.toSorted());
	});

	// The shapes server hydration (and scripts/mock-pawbar.ts) sends: store data, one emit each.
	const menuCard = (extra: Record<string, unknown> = {}) => ({
		ui: {
			type: 'menu-order',
			props: {
				title: 'Tasty Bites',
				checkout: true,
				items: [{ product_id: 'burger-1', name: 'Classic Cheeseburger', price: 11.99, image: 'https://store.example/test-store/img/burger-1.webp', groups: [] }],
				...extra
			},
			on_checkout: { action: 'emit', target: 'checkout' }
		}
	});
	const bookingCard = (on_book: unknown = { action: 'emit', target: 'book' }) => ({
		ui: {
			type: 'booking',
			props: {
				services: [{ id: 'table', name: 'Table reservation', kind: 'table', duration_min: 90, party: { min: 1, max: 8 } }],
				days: [{ date: '2026-10-16', date_label: 'Fri 16 Oct', slots: [{ start: '2026-10-16T19:00:00-04:00', label: '7:00 PM', available: true }] }],
				party: 4,
				notice: { kind: 'error', text: 'That time was just taken. Pick another.', code: 'slot_taken', start: '2026-10-16T19:00:00-04:00' }
			},
			on_book
		}
	});

	test('hydrated menu-order and booking cards pass, while streaming and at final', () => {
		for (const card of [menuCard(), bookingCard()]) {
			expect(refuseCard(card)).toBeNull();
			expect(refuseCard(card, { partial: true })).toBeNull();
		}
	});

	test('a menu-order or booking card keeps every refusal: network actions, handler expressions, http photos', () => {
		expect(refuseCard(bookingCard({ action: 'api', url: '/api/bookings' }))).toBe('action:api');
		expect(refuseCard(bookingCard([{ action: 'navigate', url: 'https://evil.example' }]))).toBe('action:navigate');
		expect(refuseCard(bookingCard('{state.h}'))).toBe('handler_expression');
		expect(refuseCard(menuCard({ items: [{ product_id: 'x', image: 'http://store.example/x.webp' }] }))).toBe('unsafe_url');
		expect(refuseCard(menuCard({ items: [{ product_id: 'x', image: '{state.img}' }] }))).toBe('expression_url');
		expect(refuseCard(menuCard({ featured: { id: 'x', reason: '<img src=x onerror=alert(1)>' } }))).toBe('markup');
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

	test.each([
		['set', { action: 'set', target: 'stops.{index}.done', value: true }],
		['toggle', { action: 'toggle', target: 'rows.{index}.open' }],
		['remove', { action: 'remove', target: 'items', index: '{index}' }],
		['remove', { target: 'lists.{i}.items', value: '{item}', action: 'remove' }],
		['push', { action: 'push', target: 'groups.{g}.rows', value: 'x' }],
		['open', { action: 'open', target: 'modal_{id}' }]
	])("a state action's target is a path, so %s may use an expression", (_, handler) => {
		expect(refuseCard(button(handler))).toBeNull();
		expect(refuseCard(button({ action: 'flow', steps: [handler] }))).toBeNull();
	});

	test("navigate's target is a URL: never a path-target action, and refused", () => {
		expect(PATH_TARGET_ACTIONS).not.toContain('navigate');
		expect(refuseCard(button({ action: 'navigate', target: '{state.url}' }))).toBe('action:navigate');
		expect(refuseCard(button({ target: '{state.url}', action: 'navigate' }))).toBe('action:navigate');
		expect(refuseCard(button({ action: 'navigate', target: 'javascript:alert(1)' }))).toBe('action:navigate');
	});

	test('a path target still gets the text rules; nothing else on the action is loosened', () => {
		expect(refuseCard(button({ action: 'set', target: 'javascript:alert(1)' }))).toBe('unsafe_url');
		expect(refuseCard(button({ action: 'emit', target: '<img src=x onerror=alert(1)>' }))).toBe('markup');
		expect(refuseCard(button({ action: 'set', target: 'a.{i}', href: '{state.x}' }))).toBe('expression_url');
		expect(refuseCard(button({ action: 'set', target: 'a', value: { url: '{state.x}' } }))).toBe('expression_url');
	});

	test('a target outside an action object keeps the URL rule', () => {
		expect(refuseCard(prop('target', '{state.x}', 'link-preview'))).toBe('expression_url');
		expect(refuseCard(button({ Action: 'set', target: '{state.x}' }))).toBe('expression_url');
		expect(refuseCard({ ui: { type: 'text' }, state: { target: '{state.x}' } })).toBe('expression_url');
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

	test.each([
		'<details open><summary>x</summary></details>',
		'<DETAILS open>',
		'<math><mi>x</mi></math>',
		'<svg onload=alert(1)>',
		'<Style>body{}</style>',
		'<meta http-equiv="refresh">',
		'<base href="/">',
		'<object data=x>',
		'<embed src=x>',
		'<link rel=stylesheet>',
		'<form action=x>',
		'<div onclick=alert(1)>hi</div>',
		'<span onmouseover = "x">',
		'<b/onpointerenter=x>',
		'<x title="a" ONFOCUS=go autofocus>',
		'&lt;svg onload=1&gt;',
		'&#60;details&#62;',
		'&#x3C;img src=x>',
		'&#X3c;p onclick=x&gt;',
		'&ltdetails&gt;'
	])('refuses the tag %s, decoded and in any case', (value) => {
		expect(refuseCard(text(value))).toBe('markup');
		expect(refuseCard({ ui: { type: 'text' }, state: { note: value } })).toBe('markup');
	});

	test.each(['a < b and c > d', 'the button on the left', 'x<5 onions = 3', '**bold** and `code`', 'Fish &amp; chips', 'tom &lt; 3', '<b>on sale</b>'])(
		'allows the plain text %s',
		(value) => {
			expect(refuseCard(text(value))).toBeNull();
		}
	);

	test('entities decode once, so double-encoded text stays text; URL keys decode too', () => {
		expect(decodeEntities('&amp;lt;svg&amp;gt;')).toBe('&lt;svg&gt;');
		expect(decodeEntities('&#106;&#x61;va &amp; &bogus; &#0;')).toBe('java & &bogus; &#0;');
		expect(refuseCard(prop('href', '&#106;avascript:alert(1)', 'cta'))).toBe('unsafe_url');
		expect(refuseCard(prop('src', 'https://img.example/a.png?w=1&amp;h=2'))).toBeNull();
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
