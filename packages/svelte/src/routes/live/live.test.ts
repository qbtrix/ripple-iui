// routes/live/live.test.ts — Every /live scenario, end to end through streamSpec.
// (a) the recorded fixture replays to `done` with no error and a final spec,
// (b) that spec only uses widgets the renderer knows,
// (c) the UI <Ripple> builds FROM THE STREAM is interactive once it finishes:
//     a bound text/number input changes state and the derived text, and every
//     button click changes state. Each check runs when the spec has that kind
//     of control; a spec with neither fails, so render-only output fails (c).
// Per-scenario blocks below check that the numbers are right, not just moving.

import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec, type StreamSpecStore } from '$lib/streaming/index.js';
import { validateCatalog } from '$lib/widgets/validate-catalog-bound.js';
import { replay } from './replay.js';
import { scenarios, type ScenarioFixture } from './scenarios.js';

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

	test('(c) the final spec has a bound control or a button to interact with', () => {
		expect(specHas(finalSpec, (n) => controls.includes(n.type ?? '') && (n.type === 'button' || 'bind' in n))).toBe(true);
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

// The bill splitter's numbers must add up, not just change. Labels ("Pays",
// "Grand total") come from the recorded fixture: re-recording may rename them.
describe('bill-splitter numbers', () => {
	const scenario = scenarios.find((s) => s.id === 'bill-splitter')!;
	const money = (s: string) => Number(s.replace(/[$,]/g, ''));

	async function addsUp(container: HTMLElement) {
		const check = (rows: number) => {
			const text = container.textContent ?? '';
			const shares = [...text.matchAll(/Pays\s*(\$[\d,]+\.\d\d)/g)].map((m) => money(m[1]));
			const grand = money(/Grand total\s*(\$[\d,]+\.\d\d)/.exec(text)![1]);
			expect(shares.length).toBe(rows);
			expect(Math.abs(shares.reduce((a, b) => a + b, 0) - grand)).toBeLessThan(0.05);
			return shares;
		};
		const start = check(4);
		expect(new Set(start).size).toBeGreaterThan(1); // drinkers pay more
		const add = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Add person')!;
		await fireEvent.click(add);
		await waitFor(() => check(5));
		const remove = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Remove')!;
		await fireEvent.click(remove);
		await waitFor(() => check(4));
		await fireEvent.click(container.querySelector('[role="checkbox"]')!);
		await waitFor(() => check(4));
	}

	test('mounted whole, shares add up to the grand total through add, remove and drinks', async () => {
		const { container } = render(Ripple, { props: { spec: JSON.parse(join(scenario.fixture)) } });
		await tick();
		await addsUp(container);
	});

	// A streamed render must recompute a row's share when its bound checkbox
	// ("people.{index}.drinks") flips, same as a whole-spec mount.
	test('after streaming, shares still add up through add, remove and drinks', async () => {
		const { container } = await mountStreamed(scenario.fixture);
		await addsUp(container);
	});
});

// Per-scenario number checks. Labels come from the recorded fixtures; a
// re-recording may rename them. Expected values are worked out by hand.
const money = (s: string) => Number(s.replace(/[$,]/g, ''));
const moneyAfter = (container: HTMLElement, label: string) => {
	const m = new RegExp(label + '\\s*(\\$[\\d,]+\\.\\d\\d)').exec(container.textContent ?? '');
	expect(m, `no money after "${label}"`).not.toBeNull();
	return money(m![1]);
};
async function typeInto(input: HTMLInputElement, value: string | number) {
	input.value = String(value);
	await fireEvent.input(input);
	await fireEvent.change(input);
	await fireEvent.blur(input);
	await tick();
}
const scenario = (id: string) => scenarios.find((s) => s.id === id)!.fixture;
/** Step the nth slider thumb with the keyboard, as a user would. */
async function nudgeSlider(container: HTMLElement, nth: number, key: 'ArrowRight' | 'ArrowLeft', times = 1) {
	const thumb = container.querySelectorAll<HTMLElement>('[role="slider"]')[nth];
	for (let i = 0; i < times; i++) await fireEvent.keyDown(thumb, { key });
	await tick();
}
/** Open a bits-ui select with the keyboard and pick an option by its text. */
async function pickOption(trigger: Element, label: string) {
	// jsdom has no scrollIntoView; bits-ui calls it on the highlighted option.
	const proto = Element.prototype as { scrollIntoView?: () => void };
	proto.scrollIntoView ??= () => {};
	await fireEvent.keyDown(trigger, { key: 'Enter' });
	const option = await waitFor(() => {
		const o = [...document.querySelectorAll('[role="option"]')].find((x) => x.textContent?.trim() === label);
		return o ?? Promise.reject(new Error(`no option ${label}`));
	});
	await fireEvent.pointerUp(option);
	await fireEvent.click(option);
	await tick();
}

describe('savings-calculator numbers', () => {
	// $300/month at 5% a year, compounded monthly with month-end deposits, for
	// 10 years: 300 * ((1 + 0.05/12)^120 - 1) / (0.05/12) = 46,584.68. The
	// model's seeded schedule rounds to 46,585.60; the first edit recomputes it
	// exactly. At $400/month it is 62,112.91.
	test('after streaming, the balance follows the monthly deposit', async () => {
		const { container } = await mountStreamed(scenario('savings-calculator'));
		expect(Math.abs(moneyAfter(container, 'Balance after 10 years') - 46584.68)).toBeLessThan(1);
		await typeInto(container.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!, 400);
		await waitFor(() => expect(moneyAfter(container, 'Balance after 10 years')).toBeCloseTo(62112.91, 1));
		expect(moneyAfter(container, 'You deposit')).toBe(48000);
	});

	// Years is the second slider. 11 years of $300/month at 5%: 52,651.70.
	test('after streaming, the years slider moves the balance and adds a year bar', async () => {
		const { container } = await mountStreamed(scenario('savings-calculator'));
		await nudgeSlider(container, 1, 'ArrowRight');
		await waitFor(() => expect(moneyAfter(container, 'Balance after 11 years')).toBeCloseTo(52651.7, 1));
		expect(text(container)).toContain('Y11');
		expect(moneyAfter(container, 'You deposit')).toBe(39600);
	});
});

const text = (container: HTMLElement) => container.textContent ?? '';
const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const decimalInputs = (container: HTMLElement) => [...container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]')];

describe('tokyo-trip numbers', () => {
	// 18 stops with $250 of estimates; the budget is $600. The first stop is
	// the $25-estimate airport train on day 1.
	test('after streaming, ticks, spending, Remove and Add stop all update the totals', async () => {
		const { container } = await mountStreamed(scenario('tokyo-trip'));
		expect(text(container)).toContain('0 of 18 stops done');
		expect(moneyAfter(container, 'Estimated total for all stops')).toBe(250);
		await fireEvent.click(container.querySelector('[role="checkbox"]')!);
		await waitFor(() => expect(text(container)).toContain('1 of 18 stops done'));
		await typeInto(decimalInputs(container)[1], 25); // first stop's spend
		await waitFor(() => expect(moneyAfter(container, 'Spent so far')).toBe(25));
		expect(moneyAfter(container, 'Budget left')).toBe(575);
		await fireEvent.click(button(container, 'Remove'));
		await waitFor(() => expect(text(container)).toContain('0 of 17 stops done'));
		expect(moneyAfter(container, 'Spent so far')).toBe(0);
		expect(moneyAfter(container, 'Estimated total for all stops')).toBe(225);
		await typeInto(container.querySelector<HTMLInputElement>('input[type="text"]:not([inputmode])')!, 'Bookshop browse');
		await fireEvent.click(button(container, 'Add stop'));
		await waitFor(() => expect(text(container)).toContain('0 of 18 stops done'));
		expect(text(container)).toContain('Bookshop browse');
	});
});

describe('sales-dashboard numbers', () => {
	// 12 orders, $1,965: Jul 505, Aug 635, Sep 825. North is orders 1, 5 and 9:
	// $120 + $150 + $300 = $570. The chart's redraw is checked in the browser
	// (jsdom has no canvas); here the filter must move the stats and the table.
	test('after streaming, the region filter narrows the totals and the table', async () => {
		const { container } = await mountStreamed(scenario('sales-dashboard'));
		expect(moneyAfter(container, 'Quarter revenue')).toBe(1965);
		expect(moneyAfter(container, 'Avg order')).toBe(163.75);
		const table = () => container.querySelector('table')?.textContent ?? '';
		expect(table()).toContain('South');
		await fireEvent.click(button(container, 'North'));
		await waitFor(() => expect(moneyAfter(container, 'North revenue')).toBe(570));
		expect(text(container)).toMatch(/North orders\s*3/);
		expect(moneyAfter(container, 'North avg order')).toBe(190);
		expect(table()).not.toContain('South');
		expect(table()).toContain('North');
		expect(moneyAfter(container, 'Quarter revenue')).toBe(1965);
	});
});

describe('flashcards scoring', () => {
	const knew = (c: HTMLElement) => Number(/Knew it\s*(\d+)/.exec(text(c))![1]);
	const review = (c: HTMLElement) => Number(/Needs review\s*(\d+)/.exec(text(c))![1]);
	async function mark(c: HTMLElement, label: 'Got It' | 'Needs Review') {
		await fireEvent.click(c.querySelector('.flashcard')!);
		await fireEvent.click(await waitFor(() => button(c, label) ?? Promise.reject(new Error(`no ${label}`))));
		await tick();
	}

	// The flashcard widget's own Got It / Needs Review buttons fire the spec's
	// on_correct / on_incorrect, which keep score and advance the deck.
	test('after streaming, the card buttons score, advance, finish and restart the deck', async () => {
		const { container } = await mountStreamed(scenario('flashcards'));
		expect(text(container)).toContain('Card 1 of 8');
		await mark(container, 'Got It');
		await waitFor(() => expect(knew(container)).toBe(1));
		expect(text(container)).toContain('Card 2 of 8');
		expect(text(container)).toContain('Gracias');
		await mark(container, 'Needs Review');
		await waitFor(() => expect(review(container)).toBe(1));
		for (let i = 3; i <= 8; i++) await mark(container, 'Got It');
		await waitFor(() => expect(text(container)).toContain('You knew 7 of 8 cards. 1 to review.'));
		await fireEvent.click(button(container, 'Study again'));
		await waitFor(() => expect(text(container)).toContain('Card 1 of 8'));
		expect(knew(container)).toBe(0);
		expect(review(container)).toBe(0);
	});
});

describe('hiit-workout steps', () => {
	// 20 minutes of 40 s work + 20 s rest is 20 intervals; 45 s work makes
	// floor(1200 / 65) = 18.
	test('after streaming, Next walks the circuit, stops at the last interval, and the work slider re-plans it', async () => {
		const { container } = await mountStreamed(scenario('hiit-workout'));
		expect(text(container)).toContain('Exercise 1 of 20');
		await fireEvent.click(button(container, 'Next exercise'));
		await waitFor(() => expect(text(container)).toContain('Exercise 2 of 20'));
		expect(container.querySelector('h2')?.textContent).toBe('Bodyweight squats');
		for (let i = 0; i < 25; i++) await fireEvent.click(button(container, 'Next exercise'));
		await waitFor(() => expect(text(container)).toContain('Exercise 20 of 20'));
		expect(button(container, 'Next exercise').disabled).toBe(true);
		await nudgeSlider(container, 0, 'ArrowRight');
		await waitFor(() => expect(text(container)).toContain('Exercise 1 of 18'));
	});
});

describe('meal-plan shopping list', () => {
	// Chicken Stir-Fry is on Mon and Sun at 150 g of chicken per person;
	// tomatoes come to 900 g for 2 people across the week.
	test('after streaming, the shopping list scales with the number of people', async () => {
		const { container } = await mountStreamed(scenario('meal-plan'));
		expect(text(container)).toMatch(/Chicken breast\s*600 g/);
		await typeInto(decimalInputs(container)[0], 3);
		await waitFor(() => expect(text(container)).toMatch(/Chicken breast\s*900 g/));
		expect(text(container)).toMatch(/Tomatoes\s*1350 g/);
		expect(text(container)).toContain('Shopping list for 3 people');
	});

	// Monday's Chicken Stir-Fry swapped for Beef Chili: chicken drops to one
	// night (300 g for 2), beef mince goes to two nights (520 g).
	test('after streaming, swapping a day\'s dinner re-totals the shopping list', async () => {
		const { container } = await mountStreamed(scenario('meal-plan'));
		await pickOption(container.querySelector('[data-slot="select-trigger"]')!, 'Beef Chili');
		await waitFor(() => expect(text(container)).toMatch(/Chicken breast\s*300 g/));
		expect(text(container)).toMatch(/Lean beef mince\s*520 g/);
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
