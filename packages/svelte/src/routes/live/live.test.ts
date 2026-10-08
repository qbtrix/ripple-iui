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

const join = (f: ScenarioFixture) => f.chunks.map((c) => c.text).join('');

async function streamToDone(fixture: ScenarioFixture): Promise<StreamSpecStore> {
	const store = streamSpec(replay(fixture, { speed: Infinity }), { throttleMs: 0 });
	await vi.waitFor(() => expect(store.done).toBe(true), { timeout: 5000 });
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
	await vi.waitFor(() => expect(store.done).toBe(true), { timeout: 5000 });
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
 *  or that are missing from the DOM without being conditional. */
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
		if (!b && conditional) continue;
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
		await vi.waitFor(() => check(5));
		const remove = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Remove')!;
		await fireEvent.click(remove);
		await vi.waitFor(() => check(4));
		await fireEvent.click(container.querySelector('[role="checkbox"]')!);
		await vi.waitFor(() => check(4));
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

describe('savings-calculator numbers', () => {
	// $300/month at 5% a year, compounded monthly with month-end deposits, for
	// 10 years: 300 * ((1 + 0.05/12)^120 - 1) / (0.05/12) = 46,584.68. The
	// model's seeded schedule rounds to 46,585.60; the first edit recomputes it
	// exactly. At $400/month it is 62,112.91.
	test('after streaming, the balance follows the monthly deposit', async () => {
		const { container } = await mountStreamed(scenario('savings-calculator'));
		expect(Math.abs(moneyAfter(container, 'Balance after 10 years') - 46584.68)).toBeLessThan(1);
		await typeInto(container.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!, 400);
		await vi.waitFor(() => expect(moneyAfter(container, 'Balance after 10 years')).toBeCloseTo(62112.91, 1));
		expect(moneyAfter(container, 'You deposit')).toBe(48000);
	});
});

const text = (container: HTMLElement) => container.textContent ?? '';
const button = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const decimalInputs = (container: HTMLElement) => [...container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]')];

describe('tokyo-trip numbers', () => {
	const yenAfter = (container: HTMLElement, label: string) =>
		Number(new RegExp(label + '\\s*¥([\\d,]+)').exec(text(container))![1].replace(/,/g, ''));

	// Day 1's first stop is the ¥3,250 Narita Express; the budget is ¥60,000.
	test('after streaming, ticks, costs and new stops all update the totals', async () => {
		const { container } = await mountStreamed(scenario('tokyo-trip'));
		expect(text(container)).toContain('0 of 20 stops done. Planned cost ¥38500');
		await fireEvent.click(container.querySelector('[role="checkbox"]')!);
		await vi.waitFor(() => expect(yenAfter(container, 'Spent')).toBe(3250));
		expect(yenAfter(container, 'Budget left')).toBe(56750);
		expect(text(container)).toContain('1 of 20 stops done');
		await typeInto(decimalInputs(container)[1], 4000); // that stop's cost
		await vi.waitFor(() => expect(yenAfter(container, 'Spent')).toBe(4000));
		expect(text(container)).toContain('Planned cost ¥39250');
		await typeInto(container.querySelector<HTMLInputElement>('input[type="text"]:not([inputmode])')!, 'Ramen in Ikebukuro');
		await fireEvent.click(button(container, 'Add to this day'));
		await vi.waitFor(() => expect(text(container)).toContain('1 of 21 stops done'));
		expect(text(container)).toContain('Ramen in Ikebukuro');
	});
});

describe('sales-dashboard numbers', () => {
	// 12 orders: Americas 5 for $720.35, Europe 4 for $593.90, Asia 3 for $286.65.
	test('after streaming, picking a region narrows the table and its totals', async () => {
		// jsdom has no scrollIntoView; bits-ui calls it on the highlighted option.
		Element.prototype.scrollIntoView ??= () => {};
		const { container } = await mountStreamed(scenario('sales-dashboard'));
		expect(moneyAfter(container, 'Revenue')).toBeCloseTo(1600.9, 2);
		expect(text(container)).toContain('Dana');
		await fireEvent.keyDown(container.querySelector('[data-slot="select-trigger"]')!, { key: 'Enter' });
		const europe = await vi.waitFor(() => {
			const o = [...document.querySelectorAll('[role="option"]')].find((x) => x.textContent?.trim() === 'Europe');
			return o ?? Promise.reject(new Error('no Europe option'));
		});
		await fireEvent.pointerUp(europe);
		await fireEvent.click(europe);
		await vi.waitFor(() => expect(text(container)).toContain('Totals: Europe'));
		expect(text(container)).not.toContain('Dana');
		expect(text(container)).toContain('Lukas');
		expect(moneyAfter(container, 'Totals: EuropeRevenue')).toBeCloseTo(593.9, 2);
	});
});

describe('flashcards scoring', () => {
	test('after streaming, flip then "Got it" scores the card and moves to the next one', async () => {
		const { container } = await mountStreamed(scenario('flashcards'));
		expect(text(container)).toContain('Hola');
		await fireEvent.click(button(container, 'Flip card'));
		await vi.waitFor(() => expect(text(container)).toContain('Hello'));
		await fireEvent.click(button(container, 'Got it'));
		await vi.waitFor(() => expect(text(container)).toContain('Gracias'));
		expect(text(container)).toMatch(/1\s*Correct\s*0\s*Missed/);
		expect(text(container)).toContain('Card 2 of');
	});
});

describe('hiit-workout steps', () => {
	// 20 minutes of 40 s work + 20 s rest is 20 intervals; 30 s work makes 24.
	test('after streaming, Next advances the circuit and the interval length re-plans it', async () => {
		const { container } = await mountStreamed(scenario('hiit-workout'));
		expect(text(container)).toContain('= 20 intervals');
		await fireEvent.click(button(container, 'Next'));
		await vi.waitFor(() => expect(container.querySelector('h2')?.textContent).toBe('Squat jumps'));
		await fireEvent.click(button(container, '30'));
		await vi.waitFor(() => expect(text(container)).toContain('30s work + 20s rest = 24 intervals'));
	});
});

describe('meal-plan shopping list', () => {
	// Chicken Stir-Fry is on Mon and Sun at 150 g of chicken per person;
	// tomatoes come to 900 g for 2 people across the week.
	test('after streaming, the shopping list scales with the number of people', async () => {
		const { container } = await mountStreamed(scenario('meal-plan'));
		expect(text(container)).toMatch(/Chicken breast\s*600 g/);
		await typeInto(decimalInputs(container)[0], 3);
		await vi.waitFor(() => expect(text(container)).toMatch(/Chicken breast\s*900 g/));
		expect(text(container)).toMatch(/Tomatoes\s*1350 g/);
		expect(text(container)).toContain('Shopping list for 3 people');
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
		await vi.waitFor(() => expect(text(container)).toContain('This is where all the power enters'));
		await fireEvent.click(button(container, 'Climb 34/32'));
		await vi.waitFor(() => expect(text(container)).toMatch(/Metres per pedal turn\s*2\.231/));
	});
});
