// routes/live/live.test.ts — Every /live scenario, end to end through streamSpec.
// (a) the recorded fixture replays to `done` with no error and a final spec,
// (b) that spec only uses widgets the renderer knows,
// (c) the UI <Ripple> builds FROM THE STREAM is interactive once it finishes:
//     a bound text/number input changes state and the derived text, and every
//     button click changes state. Each check runs when the spec has that kind
//     of control; a data widget bound to state counts as one (its per-scenario
//     block drives it). A spec with none fails, so render-only output fails (c).
// Per-scenario blocks below check that the numbers are right, not just moving.

import { fireEvent, render, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec, type StreamSpecStore } from '$lib/streaming/index.js';
import { validateCatalog } from '$lib/widgets/validate-catalog-bound.js';
import { replay } from './replay.js';
import { scenarios, type ScenarioFixture } from './scenarios.js';
import OrderReceipt from './OrderReceipt.svelte';

// Streamed mounts recompute on later ticks; under a full parallel suite that can
// take longer than vi.waitFor's 1 s default, so every wait here gets 5 s.
const waitFor = <T>(fn: () => T | Promise<T>, opts: { timeout?: number; interval?: number } = {}) =>
	vi.waitFor(fn, { timeout: 5000, ...opts });
// Each test streams a whole recorded fixture through the parser before it
// asserts; the biggest (meal-plan) can pass 5 s under a full parallel suite.
vi.setConfig({ testTimeout: 20_000 });

const join = (f: ScenarioFixture) => f.chunks.map((c) => c.text).join('');

async function streamToDone(fixture: ScenarioFixture): Promise<StreamSpecStore> {
	const store = streamSpec(replay(fixture, { speed: Infinity }), { throttleMs: 0 });
	await waitFor(() => expect(store.done).toBe(true), { timeout: 5000 });
	return store;
}

describe('replay()', () => {
	const fixture = scenarios[0].fixture;

	test('speed Infinity yields every chunk, in order, with no waits', async () => {
		const out: string[] = [];
		for await (const t of replay(fixture, { speed: Infinity })) out.push(t);
		expect(out).toEqual(fixture.chunks.map((c) => c.text));
	});

	test('honours recorded timing scaled by speed, and stops on abort', async () => {
		const f: ScenarioFixture = { ...fixture, chunks: [{ t: 0, text: 'a' }, { t: 200, text: 'b' }, { t: 400, text: 'c' }] };
		const ctrl = new AbortController();
		const start = performance.now();
		const got: [string, number][] = [];
		for await (const t of replay(f, { speed: 2, signal: ctrl.signal })) {
			got.push([t, performance.now() - start]);
			if (t === 'b') ctrl.abort();
		}
		expect(got.map((g) => g[0])).toEqual(['a', 'b']);
		expect(got[1][1]).toBeGreaterThanOrEqual(90); // 200 ms at 2x
	});
});

describe.each(scenarios.map((s) => [s.id, s] as const))('scenario %s', (_id, scenario) => {
	const { fixture } = scenario;
	const finalSpec = JSON.parse(join(fixture));
	const hasInput = specHas(finalSpec, (n) => ['input', 'number-input'].includes(n.type ?? ''));
	const hasButton = buttonLabels(finalSpec).size > 0;
	const controls = ['input', 'number-input', 'slider', 'select', 'segmented', 'checkbox', 'switch', 'button'];

	test('(c) the final spec has a bound control, a button, or a bound data widget to interact with', () => {
		const interactive = (n: SpecNode) =>
			(controls.includes(n.type ?? '') && (n.type === 'button' || 'bind' in n)) || (DATA_WIDGETS.includes(n.type ?? '') && 'bind' in n);
		expect(specHas(finalSpec, interactive)).toBe(true);
	});

	test('fixture matches the contract', () => {
		expect(fixture.id).toBe(scenario.id);
		expect(typeof fixture.prompt).toBe('string');
		expect(Number.isNaN(Date.parse(fixture.recordedAt))).toBe(false);
		expect(fixture.chunks[0].t).toBe(0);
		for (let i = 1; i < fixture.chunks.length; i++) {
			expect(fixture.chunks[i].t).toBeGreaterThanOrEqual(fixture.chunks[i - 1].t);
		}
	});

	test('(a) replays through streamSpec to done with a final spec and no error', async () => {
		const store = await streamToDone(fixture);
		expect(store.error).toBeNull();
		expect(store.current).not.toBeNull();
		expect(store.current).toEqual(JSON.parse(join(fixture)));
	});

	test('(b) the final spec passes validateCatalog', async () => {
		const store = await streamToDone(fixture);
		expect(validateCatalog(store.current as never)).toEqual([]);
	});

	test.runIf(hasInput)('(c1) after streaming, a bound input updates state and the derived text', async () => {
		const { store, container, onStateChange } = await mountStreamed(fixture);
		expect(container.querySelector('[data-ripple-streaming="done"]')).not.toBeNull();
		const input = container.querySelector<HTMLInputElement>('input[type="number"], input[type="text"]');
		expect(input, 'no input rendered').not.toBeNull();
		const before = container.textContent;
		const writes = onStateChange.mock.calls.length;
		input!.value = String(Number(input!.value || 0) + 100);
		await fireEvent.input(input!);
		await fireEvent.change(input!);
		await fireEvent.blur(input!);
		await tick();
		expect(store.error).toBeNull();
		expect(onStateChange.mock.calls.length).toBeGreaterThan(writes);
		expect(container.textContent).not.toBe(before);
	});

	test.runIf(hasButton)('(c2) the final spec\'s buttons work when mounted whole', async () => {
		const spec = JSON.parse(join(fixture));
		const onStateChange = vi.fn();
		const onEvent = vi.fn();
		const { container } = render(Ripple, { props: { spec, onStateChange, onEvent } });
		await tick();
		expect(await clickEachSpecButton(spec, container, onStateChange, onEvent)).toEqual([]);
	});

	// The checkout-style case: a button whose on_click streams in after the
	// button mounted must still fire once the stream is done.
	test.runIf(hasButton)('(c3) after streaming, spec buttons fire on_click', async () => {
		const { store, container, onStateChange, onEvent } = await mountStreamed(fixture);
		const dead = await clickEachSpecButton(store.current, container, onStateChange, onEvent);
		expect(dead).toEqual([]);
	});
});

async function mountStreamed(fixture: ScenarioFixture) {
	const store = streamSpec(replay(fixture, { speed: Infinity }), { throttleMs: 0 });
	const onStateChange = vi.fn();
	const onEvent = vi.fn();
	const { container } = render(Ripple, { props: { streaming: store, onStateChange, onEvent } });
	await waitFor(() => expect(store.done).toBe(true), { timeout: 5000 });
	await tick();
	return { store, container, onStateChange, onEvent };
}

// Data widgets carry their own controls (sliders, steppers, ticks, filters);
// bound to state, they are as interactive as a bound input.
const DATA_WIDGETS = ['growth-projection', 'itinerary', 'meal-plan', 'recipe', 'interval-workout', 'flashcard-deck', 'memory-match', 'exec-dashboard', 'menu-order', 'booking', 'bill-split'];

type SpecNode = { type?: string; bind?: string; on_click?: unknown; props?: Record<string, unknown>; children?: unknown[] };

function specHas(spec: unknown, match: (n: SpecNode) => boolean): boolean {
	const walk = (n: unknown): boolean => {
		if (!n || typeof n !== 'object') return false;
		const node = n as SpecNode;
		return match(node) || (node.children ?? []).some(walk);
	};
	return walk((spec as { ui?: unknown }).ui);
}

/** Static labels of every spec button that has an on_click, mapped to whether
 *  the button may be absent at rest: it sits under an `if`, a `show`, or a tab
 *  pane other than the first. A label that also appears unconditionally must render. */
function buttonLabels(spec: unknown): Map<string, boolean> {
	const labels = new Map<string, boolean>();
	const walk = (n: unknown, hidden: boolean): void => {
		if (!n || typeof n !== 'object') return;
		const node = n as SpecNode & { show?: unknown };
		const h = hidden || node.type === 'if' || node.show !== undefined;
		const label = node.props?.label;
		if (node.type === 'button' && node.on_click && typeof label === 'string' && !label.includes('{')) {
			labels.set(label, (labels.get(label) ?? true) && h);
		}
		node.children?.forEach((c, i) => walk(c, h || (node.type === 'tabs' && i > 0)));
	};
	walk((spec as { ui?: unknown }).ui, false);
	return labels;
}

/** Click the first DOM button for every static spec button label that has an
 *  on_click; return the labels whose click changed no state and fired no event,
 *  or that are missing from the DOM without being conditional. A button that is
 *  disabled at rest (Back on the first step) is skipped. */
async function clickEachSpecButton(
	spec: unknown,
	container: HTMLElement,
	onStateChange: ReturnType<typeof vi.fn>,
	onEvent: ReturnType<typeof vi.fn>
): Promise<string[]> {
	const labels = buttonLabels(spec);
	expect(labels.size, 'spec has no clickable buttons').toBeGreaterThan(0);
	const dead: string[] = [];
	for (const [label, conditional] of labels) {
		const b = [...container.querySelectorAll('button')].find((x) => x.textContent?.trim() === label);
		if ((!b && conditional) || b?.disabled) continue;
		const s = onStateChange.mock.calls.length;
		const e = onEvent.mock.calls.length;
		if (b) {
			await fireEvent.click(b);
			await tick();
		}
		if (!b || (onStateChange.mock.calls.length === s && onEvent.mock.calls.length === e)) dead.push(label);
	}
	return dead;
}

// The bill splitter is one bill-split widget; its numbers must add up, not
// just change. $186.40 at 18% is $219.95 for 4: $54.99 for the first three,
// $54.98 for the last (the spare cents go first).
describe('bill-splitter numbers (bill-split)', () => {
	const scenario = scenarios.find((s) => s.id === 'bill-splitter')!;
	const money = (s: string) => Math.round(Number(s.replace(/[$,]/g, '')) * 100);

	async function addsUp(container: HTMLElement, onStateChange?: ReturnType<typeof vi.fn>) {
		const ui = within(container);
		const check = (rows: number) => {
			const shares = [...container.querySelectorAll('[data-slot="pays"]')].map((e) => money(e.textContent ?? ''));
			const total = money(/Total\s*(\$[\d,]+\.\d\d)/.exec(container.querySelector('[data-slot="totals"]')?.textContent ?? '')![1]);
			expect(shares.length).toBe(rows);
			expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
			return shares;
		};
		expect(check(4)).toEqual([5499, 5499, 5499, 5498]);
		await fireEvent.click(ui.getByRole('button', { name: 'Add person' }));
		await waitFor(() => check(5));
		await fireEvent.click(ui.getByRole('button', { name: 'Remove Person 5' }));
		await waitFor(() => check(4));
		const drinks = ui.getByRole('spinbutton', { name: 'Drinks for Person 2' });
		await fireEvent.input(drinks, { target: { value: '24' } });
		await fireEvent.change(drinks);
		await waitFor(() => expect(new Set(check(4)).size).toBeGreaterThan(1)); // the drinker pays more
		if (onStateChange) expect((lastWrite(onStateChange, 'bill') as { people: { extras: number }[] }).people[1].extras).toBe(24);
	}

	test('mounted whole, shares add up to the total through add, remove and drinks', async () => {
		const { container } = render(Ripple, { props: { spec: JSON.parse(join(scenario.fixture)) } });
		await tick();
		await addsUp(container);
	});

	test('after streaming, shares still add up and the edits write the bound bill', async () => {
		const { container, onStateChange } = await mountStreamed(scenario.fixture);
		await addsUp(container, onStateChange);
	});
});

// Per-scenario checks. Labels come from the recorded fixtures; a
// re-recording may rename them. Expected values are worked out by hand.
const scenario = (id: string) => scenarios.find((s) => s.id === id)!.fixture;
const text = (container: HTMLElement) => container.textContent ?? '';
const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const slot = (container: HTMLElement, name: string) => container.querySelector(`[data-slot="${name}"]`)?.textContent?.replace(/\s+/g, ' ').trim();
const lastWrite = (onStateChange: ReturnType<typeof vi.fn>, path: string) =>
	onStateChange.mock.calls.filter(([p]) => p === path).at(-1)?.[1];

// The data-widget demos below are one widget each; the widget does the maths,
// so these check the recorded numbers come out right and the controls write
// back to the spec's state.

describe('savings-calculator (growth-projection)', () => {
	// $300/month at 5% a year, compounded monthly with month-end deposits, for
	// 10 years: 300 * ((1 + 0.05/12)^120 - 1) / (0.05/12) = 46,584.68.
	// $400/month: 62,112.91. 11 years at $300: 52,651.70.
	test('after streaming, the deposit and years sliders move the balance and write to state', async () => {
		const { container, onStateChange } = await mountStreamed(scenario('savings-calculator'));
		const ui = within(container);
		expect(slot(container, 'final')).toBe('$46,585');
		expect(ui.getByText('Balance after 10 years')).toBeTruthy();

		const deposit = ui.getByRole('slider', { name: 'Monthly deposit' });
		await fireEvent.input(deposit, { target: { value: '400' } });
		await fireEvent.change(deposit);
		await waitFor(() => expect(slot(container, 'final')).toBe('$62,113'));
		expect(lastWrite(onStateChange, 'deposit')).toBe(400);

		await fireEvent.input(deposit, { target: { value: '300' } });
		await fireEvent.change(deposit);
		const years = ui.getByRole('slider', { name: 'Years' });
		await fireEvent.input(years, { target: { value: '11' } });
		await fireEvent.change(years);
		await waitFor(() => expect(ui.getByText('Balance after 11 years')).toBeTruthy());
		expect(slot(container, 'final')).toBe('$52,652');
		await waitFor(() => expect(lastWrite(onStateChange, 'years')).toBe(11));
	});
});

describe('tokyo-trip (itinerary)', () => {
	// 31 stops: 97,900 yen of stop estimates plus two 940-yen train legs is
	// 99,780 planned against a 200,000 budget.
	test('after streaming, ticking and adding a stop write the days back to state', async () => {
		const { container, onStateChange } = await mountStreamed(scenario('tokyo-trip'));
		const ui = within(container);
		expect(slot(container, 'spend')).toContain('99,780');
		expect(container.querySelector('[data-slot="spend"]')!.getAttribute('data-status')).toBe('good');

		await fireEvent.click(ui.getByRole('checkbox', { name: 'Airport train into the city' }));
		await waitFor(() => expect(ui.getByRole('checkbox', { name: 'Airport train into the city' }).getAttribute('aria-checked')).toBe('true'));
		const ticked = lastWrite(onStateChange, 'days') as { stops: { title: string; done?: boolean }[] }[];
		expect(ticked[0].stops.find((s) => s.title === 'Airport train into the city')?.done).toBe(true);

		await fireEvent.click(ui.getByRole('button', { name: 'Add a stop' }));
		await fireEvent.input(ui.getByRole('textbox', { name: 'Stop' }), { target: { value: 'Bookshop browse' } });
		await fireEvent.submit(ui.getByRole('form', { name: /Add a stop/ }));
		await waitFor(() => expect(ui.getByRole('checkbox', { name: 'Bookshop browse' })).toBeTruthy());
		const added = lastWrite(onStateChange, 'days') as { stops: { title: string }[] }[];
		expect(added.flatMap((d) => d.stops).map((s) => s.title)).toContain('Bookshop browse');
	});
});

describe('sales-dashboard (exec-dashboard rows)', () => {
	// 15 orders, $1,498.78 (avg $99.92). North is 3 orders: $42.50 + $104.75 +
	// $88.20 = $235.45 (avg $78.48). The chart redraw is checked in the browser
	// (jsdom has no canvas); here the filter must move the KPIs and the table.
	const kpi = (container: HTMLElement, label: string) =>
		[...container.querySelectorAll('[data-slot="kpis"] > div')].find((el) => el.textContent?.includes(label))?.textContent ?? '';

	test('after streaming, the region filter narrows the KPIs and the table and writes the filter to state', async () => {
		const { container, onStateChange } = await mountStreamed(scenario('sales-dashboard'));
		expect(kpi(container, 'Revenue')).toContain('$1,499');
		expect(kpi(container, 'Orders')).toContain('15');
		expect(slot(container, 'totals')).toContain('$1,498.78'); // the table pages at 10 rows

		await fireEvent.click(within(container).getByRole('button', { name: 'North' }));
		await waitFor(() => expect(kpi(container, 'Revenue')).toContain('$235'));
		expect(kpi(container, 'Avg order')).toContain('$78');
		expect(container.querySelectorAll('[data-slot="table"] tbody tr')).toHaveLength(3);
		expect(slot(container, 'totals')).toContain('Total (North)');
		expect(slot(container, 'totals')).toContain('$235.45');
		expect(lastWrite(onStateChange, 'salesFilter')).toEqual({ region: 'North' });
	});
});

describe('flashcards (flashcard-deck)', () => {
	// Ten cards. Knowing all but the second leaves 9 / 10 and one to practise.
	test('after streaming, Got it / Missed it keep score in state and the missed card comes back', async () => {
		const { container, onStateChange } = await mountStreamed(scenario('flashcards'));
		const ui = within(container);
		expect(slot(container, 'front')).toBe('Hello');
		await fireEvent.click(ui.getByRole('button', { name: 'Got it' }));
		await waitFor(() => expect(lastWrite(onStateChange, 'score')).toBe(1));
		expect(slot(container, 'front')).toBe('Good morning');
		await fireEvent.click(ui.getByRole('button', { name: 'Missed it' }));
		for (let i = 0; i < 8; i++) await fireEvent.click(ui.getByRole('button', { name: 'Got it' }));
		await waitFor(() => expect(slot(container, 'total')).toBe('9 / 10'));
		expect(lastWrite(onStateChange, 'score')).toBe(9);
		expect(container.querySelector('[data-slot="missed"]')?.textContent).toContain('Good morning');

		await fireEvent.click(ui.getByRole('button', { name: 'Practise missed (1)' }));
		await waitFor(() => expect(slot(container, 'front')).toBe('Good morning'));
	});
});

describe('hiit-workout (interval-workout)', () => {
	// 10 moves x 2 rounds of 40 s work, with a 20 s rest between intervals:
	// 20 x 40 + 19 x 20 = 1,180 s = 19:40. At 45 s work: 1,280 s = 21:20.
	test('after streaming, the plan totals 20 minutes and the work stepper re-plans it and writes workSec', async () => {
		const { container, onStateChange } = await mountStreamed(scenario('hiit-workout'));
		const ui = within(container);
		expect(slot(container, 'meta')).toContain('20 min');
		expect(ui.getByText('19:40 left')).toBeTruthy();
		expect(slot(container, 'current')).toBe('Jumping jacks');
		await fireEvent.click(ui.getByRole('button', { name: 'More work time' }));
		await waitFor(() => expect(lastWrite(onStateChange, 'workSec')).toBe(45));
		await waitFor(() => expect(ui.getByText('21:20 left')).toBeTruthy());
	});
});

describe('meal-plan (meal-plan)', () => {
	const amount = (c: HTMLElement, key: string) => c.querySelector(`[data-item="${key}"] [data-slot="amount"]`)?.textContent?.trim();

	// Salmon (400 g, serves 2) is on Mon and Sat; for 2 people that is 800 g,
	// for 3 people 1,200 g. Turkey chili (500 g, serves 4) on Tue and Fri: 500 g.
	test('after streaming, More people rescales the shopping list and writes people', async () => {
		const { container, onStateChange } = await mountStreamed(scenario('meal-plan'));
		expect(amount(container, 'salmon fillet|g')).toBe('800 g');
		await fireEvent.click(within(container).getByRole('button', { name: 'More people' }));
		await waitFor(() => expect(lastWrite(onStateChange, 'people')).toBe(3));
		await waitFor(() => expect(amount(container, 'salmon fillet|g')).toBe('1,200 g'));
		expect(amount(container, 'ground turkey|g')).toBe('750 g');
	});

	// Monday's salmon dinner swapped for the chili: salmon drops to one night
	// (400 g), ground turkey goes to three (750 g).
	test('after streaming, swapping a day\'s dinner re-totals the shopping list', async () => {
		const { container } = await mountStreamed(scenario('meal-plan'));
		await fireEvent.change(within(container).getByRole('combobox', { name: 'Swap Mon Dinner' }), { target: { value: 'chili' } });
		await waitFor(() => expect(amount(container, 'salmon fillet|g')).toBe('400 g'));
		expect(amount(container, 'ground turkey|g')).toBe('750 g');
	});
});

describe('explainer gearing', () => {
	// 50/17 on a 2100 mm wheel: ratio 2.941, 6.176 m per pedal turn.
	// 34/32: ratio 1.0625, 2.231 m.
	test('after streaming, parts show their notes and the presets change the gearing', async () => {
		const { container } = await mountStreamed(scenario('explainer'));
		expect(text(container)).toMatch(/Gear ratio\s*2\.941/);
		expect(text(container)).toMatch(/Metres per pedal turn\s*6\.176/);
		await fireEvent.click(button(container, '1 Pedals + crank'));
		await waitFor(() => expect(text(container)).toContain('This is where all the power enters'));
		await fireEvent.click(button(container, 'Climb 34/32'));
		await waitFor(() => expect(text(container)).toMatch(/Metres per pedal turn\s*2\.231/));
	});
});

// The order demo: real store ids reach the host's checkout event intact, the
// totals follow the quantities, and the return-from-checkout panel renders.
// Placeholders and labels come from the recorded fixture.
describe('order-burger', () => {
	const scenario = scenarios.find((s) => s.id === 'order-burger')!;
	const money = (s: string) => Number(s.replace(/[$,]/g, ''));
	const type = async (container: HTMLElement, placeholder: string, value: string) => {
		const el = container.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)!;
		el.value = value;
		await fireEvent.input(el);
		await fireEvent.change(el);
	};

	test('is first in the registry and needs the store', () => {
		expect(scenarios[0].id).toBe('order-burger');
		expect(scenario.needsStore).toBe(true);
	});

	test('after streaming, Checkout emits the api event with the cart and customer', async () => {
		const { container, onEvent } = await mountStreamed(scenario.fixture);
		const checkoutBtn = () => [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Checkout')!;
		await fireEvent.click(checkoutBtn()); // no customer yet: validate stops it
		await tick();
		expect(onEvent.mock.calls.some(([e]) => e.type === 'api')).toBe(false);

		await type(container, 'Your name', 'Sam');
		await type(container, 'you@example.com', 'sam@example.com');
		await type(container, 'Phone number', '555 0100');
		await fireEvent.click(checkoutBtn());
		await vi.waitFor(() => expect(onEvent.mock.calls.some(([e]) => e.type === 'api')).toBe(true));
		const event = onEvent.mock.calls.map(([e]) => e).find((e) => e.type === 'api');
		expect(event).toMatchObject({ type: 'api', url: '/api/checkout', method: 'POST' });
		expect(Array.isArray(event.body.items)).toBe(true);
		expect(event.body.items.filter((l: { qty: number }) => l.qty > 0).map((l: { id: string; qty: number }) => [l.id, l.qty])).toEqual([
			['burger-1', 2],
			['drink-1', 1]
		]);
		expect(event.body.customer).toMatchObject({ name: 'Sam', email: 'sam@example.com', phone: '555 0100' });
		expect(event.body.orderType).toBe('pickup');
	});

	test('after streaming, the order total follows a quantity change', async () => {
		const { container } = await mountStreamed(scenario.fixture);
		const total = () => money(/Order total\s*(\$[\d,]+\.\d\d)/.exec(container.textContent ?? '')![1]);
		expect(total()).toBeCloseTo(27.97, 2);
		const qty = container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]')[1]; // Bacon Deluxe
		qty.value = '2';
		await fireEvent.input(qty);
		await fireEvent.change(qty);
		await fireEvent.blur(qty);
		await vi.waitFor(() => expect(total()).toBeCloseTo(27.97 + 2 * 14.99, 2));
	});
});

describe('OrderReceipt', () => {
	const store = 'http://store.test/test-store';
	const summary = { lines: [{ name: 'Classic Cheeseburger', qty: 2, price: 11.99 }], orderType: 'pickup' as const, total: 23.98 };

	test('mock return says no order was recorded and links the orders board', async () => {
		const fetch = vi.fn();
		const { container } = render(OrderReceipt, { props: { storeUrl: store, order: 'mock_1', mock: true, summary, fetch } });
		expect(container.textContent).toMatch(/Checkout complete \(test mode\)/);
		expect(container.textContent).toMatch(/no order was recorded/);
		expect(container.textContent).toMatch(/2 × Classic Cheeseburger/);
		expect(container.querySelector('a')!.getAttribute('href')).toBe(`${store}/orders`);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('paid return shows the store status once the order is listed', async () => {
		const fetch = vi.fn(async () => Response.json({ orders: [{ id: 'cs_test_9', status: 'confirmed', total: 23.98 }] }));
		const { container } = render(OrderReceipt, { props: { storeUrl: store, order: 'cs_test_9', summary, fetch } });
		expect(container.textContent).toMatch(/Payment confirmed/);
		await vi.waitFor(() => expect(container.textContent).toMatch(/Store status: confirmed/));
		expect(fetch).toHaveBeenCalledWith(`${store}/api/orders?limit=20`);
	});

	test('gives up after 5 polls that never list the order', async () => {
		const fetch = vi.fn(async () => Response.json({ orders: [] }));
		const { container } = render(OrderReceipt, { props: { storeUrl: store, order: 'cs_test_9', fetch, pollMs: 1 } });
		await vi.waitFor(() => expect(container.textContent).toMatch(/hasn't listed the order yet/));
		await new Promise((r) => setTimeout(r, 20));
		expect(fetch).toHaveBeenCalledTimes(5);
	});

	test('an in-flight poll schedules nothing after unmount', async () => {
		let answer!: (r: Response) => void;
		const fetch = vi.fn(() => new Promise<Response>((r) => (answer = r)));
		const { unmount } = render(OrderReceipt, { props: { storeUrl: store, order: 'cs_test_9', fetch, pollMs: 1 } });
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
		unmount();
		answer(Response.json({ orders: [] }));
		await new Promise((r) => setTimeout(r, 20));
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	test('cancelled return is a gentle note', () => {
		const { container } = render(OrderReceipt, { props: { storeUrl: store, cancelled: true } });
		expect(container.textContent).toMatch(/Checkout cancelled/);
		expect(container.textContent).toMatch(/Nothing was charged/);
	});
});
