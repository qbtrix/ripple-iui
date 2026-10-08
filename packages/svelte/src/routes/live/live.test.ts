// routes/live/live.test.ts — Every /live scenario, end to end through streamSpec.
// (a) the recorded fixture replays to `done` with no error and a final spec,
// (b) that spec only uses widgets the renderer knows,
// (c) the UI <Ripple> builds FROM THE STREAM is interactive once it finishes:
//     a bound input changes state and the derived text, and a button click
//     changes state. Render-only output fails (c).

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

	test('(c1) after streaming, a bound input updates state and the derived text', async () => {
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

	test('(c2) the final spec\'s buttons work when mounted whole', async () => {
		const spec = JSON.parse(join(fixture));
		const onStateChange = vi.fn();
		const onEvent = vi.fn();
		const { container } = render(Ripple, { props: { spec, onStateChange, onEvent } });
		await tick();
		expect(await clickEachSpecButton(spec, container, onStateChange, onEvent)).toEqual([]);
	});

	// The checkout-style case: a button whose on_click streams in after the
	// button mounted must still fire once the stream is done.
	test('(c3) after streaming, spec buttons fire on_click', async () => {
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

/** Click the first DOM button for every static spec button label that has an
 *  on_click; return the labels whose click changed no state and fired no event. */
async function clickEachSpecButton(
	spec: unknown,
	container: HTMLElement,
	onStateChange: ReturnType<typeof vi.fn>,
	onEvent: ReturnType<typeof vi.fn>
): Promise<string[]> {
	const labels = new Set<string>();
	const walk = (n: unknown): void => {
		if (!n || typeof n !== 'object') return;
		const node = n as { type?: string; on_click?: unknown; props?: { label?: unknown }; children?: unknown[] };
		const label = node.props?.label;
		if (node.type === 'button' && node.on_click && typeof label === 'string' && !label.includes('{')) labels.add(label);
		node.children?.forEach(walk);
	};
	walk((spec as { ui?: unknown }).ui);
	expect(labels.size, 'spec has no clickable buttons').toBeGreaterThan(0);
	const dead: string[] = [];
	for (const label of labels) {
		const b = [...container.querySelectorAll('button')].find((x) => x.textContent?.trim() === label);
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

	// KNOWN ENGINE GAP (streaming only): after a streamed render, toggling a
	// row's checkbox (bind "people.{index}.drinks") updates the list count but
	// the row's own share keeps reading the old flag, through both
	// {item.drinks} and {state.people[index].drinks}. A whole-spec mount
	// recomputes correctly (test above). Flip to `test` once fixed.
	test('after streaming, shares still add up through add, remove and drinks', async () => {
		const { container } = await mountStreamed(scenario.fixture);
		await addsUp(container);
	});
});
