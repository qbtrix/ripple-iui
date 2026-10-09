// routes/pawbar/card-policy.test.ts — The landing's card policy, rule by rule.
// Includes the review's payloads: expression-built javascript: URLs, widget
// aliases for the blocked widgets, markdown images and http links, `/\host`,
// and CSS url(); and the flow-card review's handler bypasses (a whole-string
// expression in a handler slot that runs an action object kept in state, and a
// follow-up emitting a free-text event); and the node-slot review's bypass (a
// whole-string expression in a prop the engine renders as a node). Flow cards and
// `ask` follow pocketpaw's card_spec.py rules. The recorded chat scenarios and the
// mock's flow cards must all pass, and the widget allowlist must match the
// vendored manifest. fixtures/trip-flow-card.json is a live model card (2026-10-09,
// "Help me plan a trip step by step") that pocketpaw's card_spec.py accepted.
// The `illustration` cases follow card_spec.py's _check_illustration and the
// widget contract's hostile set and caps.

import { describe, expect, test } from 'vitest';
import { HOST_EVENTS, MAX_CARD_NODES, MAX_DEPTH, PATH_TARGET_ACTIONS, decodeEntities, refuseCard } from './card-policy.js';
import { gearsCard, gearsSvg, laptopAnswerCard, laptopFlowCard, tripFlowCard } from './flow-cards.js';
import { checkIllustrationSvg } from '$lib/security/illustration-svg.js';
import { pickScenario } from './recorded.js';
import { CHAT_WIDGET_TYPES } from './widget-types.js';
import liveTripCard from './fixtures/trip-flow-card.json';
import { scenarios } from '../live/scenarios.js';
import manifest from '../../../static/manifest.json';

const button = (on_click: unknown) => ({ ui: { type: 'button', props: { label: 'Go' }, on_click } });
const prop = (key: string, value: string, type = 'image') => ({ ui: { type, props: { [key]: value } } });
const text = (value: string) => ({ ui: { type: 'text', props: { text: value } } });
const set = (target: string, value: string) => ({ action: 'set', target, value });
const wide = (n: number) => ({ type: 'flex', children: Array.from({ length: n }, () => ({ type: 'text', props: { text: 'x' } })) });
const nested = (n: number): Record<string, unknown> => (n > 1 ? { type: 'flex', children: [nested(n - 1)] } : { type: 'text' });
const go = (target: string, value: unknown = {}) => ({ action: 'emit', target, value });
const optionButton = (target = 'flow.next') => ({ type: 'button', props: { label: 'Food' }, on_click: go(target, { selection: { id: 'food', label: 'Food' } }) });
const step = (extra: Record<string, unknown> = {}, ui: unknown = { type: 'flex', children: [optionButton()] }) => ({ flowId: 's', title: 'Pick one', ui, ...extra });
const done = { kind: 'chat', message: 'Plan a trip for me with these answers.' };
const flowCard = (ui: Record<string, unknown>) => ({ ui });
const twoSteps = (last: Record<string, unknown> = {}) => flowCard(step({ chain: step({ onComplete: done, ...last }, { type: 'button', props: { label: 'Finish' }, on_click: go('flow.submit') }) }));
const ask = (value: unknown = { text: 'Tell me about the weekend menu.' }) => ({ action: 'emit', target: 'ask', value });

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

describe('node slots', () => {
	// The review's finding: a prop the engine renders as a node takes "{state.n}",
	// so a node assembled in state at runtime renders without this check.
	const node = { type: 'text', props: { text: 'hi' } };
	const slots: [string, (v: unknown) => Record<string, unknown>][] = [
		['settings-list items[].control', (v) => ({ type: 'settings-list', props: { items: [{ label: 'x', control: v }] } })],
		['tabs panels[]', (v) => ({ type: 'tabs', props: { tabs: [{ value: 'a', label: 'A' }], panels: [v] } })],
		['split start', (v) => ({ type: 'split', props: { start: v } })],
		['split end', (v) => ({ type: 'split', props: { end: v } })],
		['master-detail detail', (v) => ({ type: 'master-detail', props: { items: [{ id: 'a' }], detail: v } })],
		['kanban cardTemplate', (v) => ({ type: 'kanban', props: { columns: [{ id: 'c', title: 'C' }], cardTemplate: v } })],
		['data-grid columns[].formatter', (v) => ({ type: 'data-grid', props: { columns: [{ key: 'a', label: 'A', formatter: v }], rows: [{ a: 1 }] } })],
		['tree-table columns[].formatter', (v) => ({ type: 'tree-table', props: { columns: [{ key: 'a', label: 'A', formatter: v }], rows: [{ a: 1 }] } })],
		['virtual-list item', (v) => ({ type: 'virtual-list', props: { items: [1], item: v } })],
		['popover content', (v) => ({ type: 'popover', props: { trigger: 'More', content: v } })],
		['popover trigger', (v) => ({ type: 'popover', props: { trigger: v, content: 'Body' } })],
		['hover-card content', (v) => ({ type: 'hover-card', props: { trigger: 'More', content: v } })],
		['hover-card trigger', (v) => ({ type: 'hover-card', props: { trigger: v, content: 'Body' } })],
		['tooltip trigger', (v) => ({ type: 'tooltip', props: { trigger: v, content: 'Tip' } })],
		['context-menu trigger', (v) => ({ type: 'context-menu', props: { trigger: v, items: [{ label: 'Copy' }] } })]
	];

	test.each(slots)('%s refuses a whole-string expression and takes a literal node', (_, at) => {
		for (const expr of ['{state.n}', '{item}', '{row.cell}']) expect(refuseCard({ ui: at(expr), state: { n: node } })).toBe('node_expression');
		expect(refuseCard({ ui: at(node), state: { n: node } })).toBeNull();
		// A literal node in the slot is still walked by every other rule.
		expect(refuseCard({ ui: at({ type: 'embed', props: {} }) })).toBe('widget:embed');
		expect(refuseCard({ ui: at({ type: 'button', on_click: { action: 'api' } }) })).toBe('action:api');
	});

	test.each([
		['settings-list', 'items', { label: 'x', control: node }],
		['data-grid', 'columns', { key: 'a', label: 'A', formatter: node }],
		['tree-table', 'columns', { key: 'a', label: 'A', formatter: node }],
		['tabs', 'panels', node]
	])('the %s %s list holding node slots is literal: the list and each element', (type, key, element) => {
		expect(refuseCard({ ui: { type, props: { [key]: '{state.rows}' } } })).toBe('node_expression');
		expect(refuseCard({ ui: { type, props: { [key]: [element, '{state.row}'] } } })).toBe('node_expression');
		expect(refuseCard({ ui: { type, props: { [key]: [element] } } })).toBeNull();
	});

	test("refuses the review's runtime build: set pieces a button into state, a slot renders it", () => {
		const card = {
			ui: {
				type: 'flex',
				children: [
					{
						type: 'input',
						bind: 'q',
						props: { label: 'Your name' },
						on_focus: [set('n.type', 'button'), set('n.props.label', 'Go'), set('n.on_click.action', 'api'), set('n.on_click.url', '/api/v1/x')]
					},
					{ type: 'settings-list', props: { items: [{ label: 'More', control: '{state.n}' }] } }
				]
			}
		};
		expect(refuseCard(card)).toBe('node_expression');
	});

	test('no node takes its whole props from an expression', () => {
		expect(refuseCard({ ui: { type: 'settings-list', props: '{state.p}' } })).toBe('props_expression');
		expect(refuseCard({ ui: { type: 'ask-user-questions', props: '{state.p}' } })).toBe('props_expression');
		expect(refuseCard({ ui: { type: 'flex', children: [{ type: 'text', props: '{state.p}' }] } })).toBe('props_expression');
	});

	test('text in a string-or-node slot, interpolation, and the same keys elsewhere still pass', () => {
		expect(refuseCard({ ui: { type: 'popover', props: { trigger: 'Details', content: 'Total: {state.n}' } }, state: { n: 3 } })).toBeNull();
		expect(refuseCard({ ui: { type: 'tooltip', props: { trigger: '{state.a} and {state.b}', content: 'Tip' } } })).toBeNull();
		expect(refuseCard({ ui: { type: 'table', props: { columns: [], rows: '{state.rows}' } }, state: { rows: [] } })).toBeNull();
		expect(refuseCard({ ui: { type: 'date-picker', props: { start: '{state.from}', end: '{state.to}' } } })).toBeNull();
		expect(refuseCard({ ui: { type: 'text', props: { content: '{state.msg}', item: '{item}' } } })).toBeNull();
	});

	test('while streaming, an expression is refused once its closing brace arrives', () => {
		expect(refuseCard({ ui: { type: 'split', props: { start: '{state.' } } }, { partial: true })).toBeNull();
		expect(refuseCard({ ui: { type: 'split', props: { start: '{state.n}' } } }, { partial: true })).toBe('node_expression');
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

	test('the host events are checkout, add_to_cart, book and ask; a follow-up never asks', () => {
		expect(HOST_EVENTS).toEqual(['checkout', 'add_to_cart', 'book', 'ask']);
		expect(refuseCard({ ui: { type: 'follow-up', props: { event: 'bo' } } }, { partial: true })).toBeNull();
		expect(refuseCard({ ui: { type: 'follow-up', props: { event: 'booking' } } })).toBe('follow_up_event');
	});

	test.each(['checkout', 'add_to_cart', 'book', 'follow-up'])('allows the event %s', (event) => {
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

	test("a node's own props.type is a prop, not a widget: an input's number, date or text", () => {
		for (const type of ['number', 'date', 'text', 'email']) expect(refuseCard({ ui: { type: 'input', bind: 'x', props: { type } } })).toBeNull();
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

describe('flow cards', () => {

	test("the mock's flow cards and the laptop answer pass, while streaming and at final", () => {
		for (const card of [tripFlowCard, laptopFlowCard, laptopAnswerCard, liveTripCard]) {
			expect(refuseCard(card)).toBeNull();
			expect(refuseCard(card, { partial: true })).toBeNull();
		}
	});

	test('a step holds only step keys, has a ui node, and chain_map is an object of steps', () => {
		expect(refuseCard(twoSteps())).toBeNull();
		expect(refuseCard(flowCard(step({ chain_map: { food: step({ onComplete: done }), culture: step() } })))).toBeNull();
		expect(refuseCard(flowCard(step({ state: {} })))).toBe('flow_key:state');
		expect(refuseCard(flowCard(step({ type: 'flex' })))).toBe('flow_key:type');
		expect(refuseCard(flowCard(step({ chain: { flowId: 'b', ui: { type: 'text' }, on_click: go('ask', { text: 'hi' }) } })))).toBe('flow_key:on_click');
		expect(refuseCard(flowCard({ flowId: 'a', title: 'No ui' }))).toBe('flow_step');
		expect(refuseCard(flowCard(step({ chain: 'next' })))).toBe('flow_step');
		expect(refuseCard(flowCard(step({ chain_map: [step()] })))).toBe('flow_step');
		expect(refuseCard(flowCard(step({ chain_map: { a: 'step' } })))).toBe('flow_step');
	});

	test('at most 8 steps, counting every chain and chain_map value', () => {
		const chain = (n: number): Record<string, unknown> => step(n > 1 ? { chain: chain(n - 1) } : {});
		expect(refuseCard(flowCard(chain(8)))).toBeNull();
		expect(refuseCard(flowCard(chain(9)))).toBe('flow_steps');
		const map = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`o${i}`, step()]));
		expect(refuseCard(flowCard(step({ chain_map: map })))).toBe('flow_steps');
	});

	test("every step's ui is walked by every node rule", () => {
		const second = (ui: unknown) => flowCard(step({ chain: step({}, ui) }));
		expect(refuseCard(second({ type: 'embed', props: {} }))).toBe('widget:embed');
		expect(refuseCard(second({ type: 'button', on_click: { action: 'api', url: '/x' } }))).toBe('action:api');
		expect(refuseCard(second({ type: 'image', props: { src: 'http://img.example/a.png' } }))).toBe('unsafe_url');
		expect(refuseCard(second({ type: 'button', on_click: '{state.h}' }))).toBe('handler_expression');
		expect(refuseCard(flowCard(step({ chain_map: { a: step({}, { type: 'iframe' }) } })))).toBe('widget:iframe');
		expect(refuseCard(flowCard(step({ title: '<img src=x onerror=alert(1)>' })))).toBe('markup');
		expect(refuseCard(flowCard(step({ form_fields: [{ id: 'a', label: 'javascript:alert(1)' }] })))).toBe('unsafe_url');
	});

	test('400 widget nodes shared across steps, 16 deep within each step', () => {
		expect(refuseCard(flowCard(step({ chain: step({}, wide(199)) }, wide(199))))).toBeNull();
		expect(refuseCard(flowCard(step({ chain: step({}, wide(200)) }, wide(199))))).toBe('too_many_nodes');
		expect(refuseCard({ ui: wide(MAX_CARD_NODES) })).toBe('too_many_nodes');
		expect(refuseCard(flowCard(step({ chain: step({}, nested(MAX_DEPTH)) }, nested(MAX_DEPTH))))).toBeNull();
		expect(refuseCard(flowCard(step({ chain: step({}, nested(MAX_DEPTH + 1)) })))).toBe('too_deep');
		expect(refuseCard({ ui: nested(MAX_DEPTH + 1) })).toBe('too_deep');
	});

	test('onComplete is only a plain chat message of at most 500 characters', () => {
		expect(refuseCard(twoSteps({ onComplete: { kind: 'chat', message: 'x'.repeat(500) } }))).toBeNull();
		for (const onComplete of [
			{ kind: 'chat', message: 'x'.repeat(501) },
			{ kind: 'chat', message: 'Plan {state.days} days' },
			{ kind: 'chat' },
			{ kind: 'chat', message: 'hi', then: { kind: 'navigate', url: '/x' } },
			{ kind: 'navigate', url: 'https://evil.example' },
			{ kind: 'emit', event: 'checkout' },
			{ kind: 'invoke_tool', tool: 'x' },
			{ kind: 'create_pocket', name: 'x' },
			{ kind: 'call_binding', binding: 'x', path: '/x' },
			'chat'
		])
			expect([onComplete, refuseCard(twoSteps({ onComplete }))]).toEqual([onComplete, 'on_complete']);
	});

	test('onComplete anywhere but on a step is refused', () => {
		expect(refuseCard({ ui: { type: 'flex', children: [{ type: 'button', onComplete: done }] } })).toBe('on_complete');
		expect(refuseCard(flowCard(step({}, { type: 'button', props: { onComplete: done } })))).toBe('on_complete');
		expect(refuseCard({ ui: { type: 'text' }, state: { next: { onComplete: done } } })).toBe('on_complete');
	});

	test('flow.next, back, forward and submit only inside a flow card', () => {
		for (const verb of ['flow.next', 'flow.back', 'flow.forward', 'flow.submit']) {
			expect(refuseCard(button(go(verb)))).toBe('flow_event');
			expect(refuseCard(flowCard(step({}, button(go(verb)).ui)))).toBeNull();
		}
	});

	test('flow.submit fires only from an explicit visitor action', () => {
		const submitUnder = (key: string, at: 'node' | 'props' = 'node') =>
			flowCard(step({}, at === 'node' ? { type: 'input', bind: 'x', [key]: go('flow.submit') } : { type: 'wizard-layout', props: { [key]: go('flow.submit') } }));
		for (const key of ['on_click', 'on_submit', 'on_select']) expect(refuseCard(submitUnder(key))).toBeNull();
		for (const key of ['on_change', 'on_focus', 'on_input']) expect(refuseCard(submitUnder(key))).toBe('ask_handler');
		for (const key of ['finishActions', 'nextActions']) expect(refuseCard(submitUnder(key, 'props'))).toBe('ask_handler');
		// Inside a flow under on_click it still fires from the click.
		expect(refuseCard(flowCard(step({}, button({ action: 'flow', steps: [{ action: 'set', target: 'a', value: 1 }, go('flow.submit')] }).ui)))).toBeNull();
	});

	test('while streaming, flow verbs wait for the flow fields and a half-written step is not refused yet', () => {
		expect(refuseCard(button(go('flow.next')), { partial: true })).toBeNull();
		expect(refuseCard(flowCard({ flowId: 'a', ui: { type: 'flex', children: [optionButton()] }, chain: { flowId: 'b' } }), { partial: true })).toBeNull();
		expect(refuseCard(flowCard({ flowId: 'a', ui: { type: 'text' }, onComplete: { kind: 'ch' } }), { partial: true })).toBeNull();
		expect(refuseCard(flowCard({ flowId: 'a', ui: { type: 'text' }, onComplete: { kind: 'ch' } }))).toBe('on_complete');
		expect(refuseCard(flowCard({ flowId: 'a', ti: 'x' }), { partial: true })).toBeNull();
		expect(refuseCard(flowCard({ flowId: 'a', ui: { type: 'embed' } }), { partial: true })).toBe('widget:embed');
	});
});

describe('ask', () => {

	test('allowed from a click, a submit, a pick and a composite button list', () => {
		expect(refuseCard(button(ask()))).toBeNull();
		expect(refuseCard({ ui: { type: 'form', props: { fields: [] }, on_submit: ask() } })).toBeNull();
		expect(refuseCard({ ui: { type: 'select', on_select: [ask()] } })).toBeNull();
		expect(refuseCard({ ui: { type: 'comparison-layout', props: { items: [{ id: 'a', name: 'A', actions: ask() }, { id: 'b', name: 'B' }] } } })).toBeNull();
		expect(refuseCard({ ui: { type: 'entity-detail', props: { actions: [{ id: 'more', label: 'More', actions: [ask()] }] } } })).toBeNull();
		expect(refuseCard(button({ action: 'branch', condition: '{state.a}', then: [ask()] }))).toBeNull();
	});

	test.each([
		['on_focus', { type: 'input', on_focus: ask() }],
		['on_change', { type: 'input', on_change: [ask()] }],
		['finishActions', { type: 'wizard-layout', props: { steps: [], finishActions: ask() } }],
		['learn_more', { type: 'comparison-layout', props: { items: [{ id: 'a', name: 'A', learn_more: ask() }] } }],
		['onRowClick', { type: 'table', props: { columns: [], rows: [], onRowClick: ask() } }],
		['an actions list under on_focus', { type: 'input', on_focus: { action: 'flow', steps: [], actions: [ask()] } }],
		['a node kept in a click handler value', { type: 'button', on_click: { action: 'set', target: 'n', value: { type: 'button', on_click: ask() } } }],
		['an action kept in a plain prop', { type: 'text', props: { later: ask() } }]
	])('refused under %s', (_, ui) => {
		expect(refuseCard({ ui })).toBe('ask_handler');
	});

	test('never in state', () => {
		expect(['state_action', 'ask_handler']).toContain(refuseCard({ ui: { type: 'text' }, state: { later: ask() } }));
	});

	test.each([
		['no value', undefined],
		['a string', 'hi'],
		['an extra key', { text: 'hi', to: 'sales' }],
		['a non-string text', { text: 42 }],
		['an expression', { text: 'Tell me about {state.pick}' }],
		['more than 500 characters', { text: 'x'.repeat(501) }],
		['a different key', { message: 'hi' }]
	])('refuses a value with %s', (_, value) => {
		const handler = value === undefined ? { action: 'emit', target: 'ask' } : ask(value);
		expect(refuseCard(button(handler))).toBe('ask_value');
	});

	test('the value still gets the text rules; 500 characters pass', () => {
		expect(refuseCard(button(ask({ text: 'see https://evil.example' })))).toBe('markup');
		expect(refuseCard(button(ask({ text: 'x'.repeat(500) })))).toBeNull();
	});

	test('while streaming, a value still arriving is not refused yet; a bad handler is', () => {
		expect(refuseCard(button({ action: 'emit', target: 'ask' }), { partial: true })).toBeNull();
		expect(refuseCard({ ui: { type: 'input', on_focus: ask() } }, { partial: true })).toBe('ask_handler');
	});
});

describe('illustration', () => {
	const svg = (body: string, root = "viewBox='0 0 100 100'") => `<svg ${root}><title>t</title>${body}</svg>`;
	const art = (props: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ ui: { type: 'illustration', props: { svg: svg("<circle cx='50' cy='50' r='20' fill='#1877F2'/>"), title: 'A dot', ...props }, ...extra } });

	test('a good illustration card is accepted, nested or at the root', () => {
		expect(refuseCard(art({ caption: 'A blue dot', max_height: 200 }))).toBeNull();
		expect(refuseCard(art({ caption: null, max_height: null }))).toBeNull();
		expect(refuseCard({ ui: { type: 'flex', children: [art({}).ui] } })).toBeNull();
	});

	test("the mock's bike gears card passes the checker and the policy, and its chip routes to it", () => {
		expect(checkIllustrationSvg(gearsSvg)).toEqual({ ok: true });
		expect(gearsSvg).not.toMatch(/[{\\]|url\(/);
		expect(refuseCard(gearsCard)).toBeNull();
		const explainer = scenarios.find((s) => s.id === 'explainer')!;
		expect(explainer.prompt).toMatch(/\bbike\b/i);
		expect(explainer.prompt).toMatch(/\bgears\b/i);
		expect(pickScenario(explainer.prompt!).id).toBe('explainer');
	});

	test.each([
		['a set rewriting href to javascript:', svg("<rect width='10' height='10'><set attributeName='href' to='javascript:alert(1)'/></rect>")],
		['a script', svg('<script>alert(1)</script>')],
		['a foreignObject', svg('<foreignObject><div>hi</div></foreignObject>')],
		['an external url()', svg("<rect width='10' height='10' fill='url(https://evil.example/x#g)'/>")],
		['a style attribute', svg("<rect width='10' height='10' style='fill:red'/>")],
		['a DOCTYPE', `<!DOCTYPE svg>${svg('')}`],
		['a 0.01s animation', svg("<rect width='10' height='10'><animate attributeName='opacity' from='0' to='1' dur='0.01s'/></rect>")],
		['a nested use', svg("<defs><g id='a'><rect width='1' height='1'/></g><g id='b'><use href='#a'/></g></defs><use href='#b'/>")]
	])('refuses %s with the checker reason', (_name, markup) => {
		const check = checkIllustrationSvg(markup);
		expect(check.ok).toBe(false);
		expect(refuseCard(art({ svg: markup }))).toBe(`illustration:${(check as { reason: string }).reason}`);
	});

	test('refuses a missing or empty title, a non-text caption, an out-of-range height, and a missing svg', () => {
		expect(refuseCard({ ui: { type: 'illustration', props: { svg: svg('') } } })).toBe('illustration:title');
		expect(refuseCard(art({ title: '  ' }))).toBe('illustration:title');
		expect(refuseCard(art({ caption: 3 }))).toBe('illustration:caption');
		expect(refuseCard(art({ max_height: 2000 }))).toBe('illustration:max_height');
		expect(refuseCard(art({ max_height: 40 }))).toBe('illustration:max_height');
		expect(refuseCard(art({ max_height: '200' }))).toBe('illustration:max_height');
		expect(refuseCard(art({ svg: undefined }))).toBe('illustration:svg');
	});

	test('refuses a { anywhere in svg: a whole-string expression or a template inside the markup', () => {
		expect(refuseCard(art({ svg: '{state.art}' }))).toBe('illustration:expression');
		expect(refuseCard(art({ svg: svg('<text>{state.x}</text>') }))).toBe('illustration:expression');
	});

	test('refuses a backslash in an attribute value (a CSS escape could spell url()', () => {
		const markup = svg("<rect width='10' height='10' fill='\\75 rl(https://evil.example/x)'/>");
		expect(refuseCard(art({ svg: markup }))).toBe('illustration:backslash');
		expect(refuseCard(art({ svg: svg('<text>a \\ b</text>') }))).toBeNull();
	});

	test('refuses a handler or bind on it, final or streaming', () => {
		expect(refuseCard(art({}, { on_click: { action: 'set', target: 'x', value: 1 } }))).toBe('illustration:handler');
		expect(refuseCard(art({ on_click: { action: 'set', target: 'x', value: 1 } }))).toBe('illustration:handler');
		expect(refuseCard(art({}, { bind: 'x' }), { partial: true })).toBe('illustration:handler');
	});

	test('title and caption are still plain text (rule 5)', () => {
		expect(refuseCard(art({ caption: '<img src=x onerror=alert(1)>' }))).toBe('markup');
	});

	test('a half-streamed svg does not refuse the card early; the final card gets the full check', () => {
		const half = { ui: { type: 'illustration', props: { svg: "<svg viewBox='0 0 10 10'><rect width='1' height='1' fill='url(#" } } };
		expect(refuseCard(half, { partial: true })).toBeNull();
		expect(refuseCard({ ui: { type: 'illustration', props: { svg: gearsSvg.slice(0, 700), title: 'Ge', max_height: 2 } } }, { partial: true })).toBeNull();
		expect(refuseCard(half)).not.toBeNull();
	});
});
