// widgets/composite/BillSplit.test.ts — the bill-split data widget: the
// cents-exact split (even, extras, remainder, 0% tip, tax, the 12 cap), the
// registry, bind contract and manifest entry, visitor edits (tip chips,
// custom tip, add and remove, extras, names) writing the bound value, edits
// surviving a re-sent spec, stream parity and junk props.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { manifestEntries } from '$lib/manifest/index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import BillSplit from './BillSplit.svelte';
import { MAX_PEOPLE, nextId, split, toPeople, toValue } from './bill-split.js';
import type { BillValue } from './bill-split.js';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const crew = (n: number, extras: number[] = []) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, extras: extras[i] ?? 0 }));
const bill = (subtotal: number, tip_percent: number, people = crew(4)): BillValue => ({ subtotal, tip_percent, people });
const pays = (v: BillValue, tax?: number) => split(v, tax).shares.map((s) => s.cents);

describe('bill-split: maths', () => {
	it('an even split with no remainder', () => {
		const r = split(bill(200, 20));
		expect(r).toMatchObject({ subtotal: 20000, tax: 0, tip: 4000, total: 24000, over: false });
		expect(pays(bill(200, 20))).toEqual([6000, 6000, 6000, 6000]);
	});

	it('$186.40 at 22% for 4: the leftover cent goes to the first person', () => {
		const r = split(bill(186.4, 22));
		expect(r.tip).toBe(4101);
		expect(r.total).toBe(22741);
		expect(r.shares.map((s) => s.cents)).toEqual([5686, 5685, 5685, 5685]);
	});

	it('extras go to whoever had them, and the tip follows what each ordered', () => {
		// $100, Alex had $20 of drinks: the shared $80 splits $40 each.
		const people = crew(2, [20, 0]);
		expect(pays(bill(100, 0, people))).toEqual([6000, 4000]);
		expect(pays(bill(100, 10, people))).toEqual([6600, 4400]);
	});

	it('a 0% tip pays exactly the bill', () => {
		const r = split(bill(99.99, 0, crew(3)));
		expect(r.tip).toBe(0);
		expect(r.shares.map((s) => s.cents)).toEqual([3333, 3333, 3333]);
		expect(pays(bill(100, 0, crew(3)))).toEqual([3334, 3333, 3333]);
	});

	it('the shares always add up to the total, to the cent', () => {
		const cases: [number, number, number[], number?][] = [
			[186.4, 18, [12, 0, 9, 0]],
			[73.33, 17.5, [0, 0, 0, 0, 0, 0, 0]],
			[1000.01, 22, [5.55, 0, 3.33, 0, 0, 7.77, 1.11, 0, 0, 0, 0, 2.22]],
			[0.05, 15, [0, 0, 0]],
			[250, 20, [10, 20, 30], 21.35]
		];
		for (const [sub, tip, ex, tax] of cases) {
			const r = split(bill(sub, tip, crew(ex.length, ex)), tax);
			expect(r.shares.reduce((a, s) => a + s.cents, 0)).toBe(r.total);
			expect(r.total).toBe(r.subtotal + r.tax + r.tip);
			const sorted = r.shares.map((s) => s.cents);
			if (ex.every((e) => e === 0)) expect(Math.max(...sorted) - Math.min(...sorted)).toBeLessThanOrEqual(1);
		}
	});

	it('tax sits on top of the subtotal; the tip is on the subtotal only', () => {
		const r = split(bill(100, 20, crew(2)), 8);
		expect(r).toMatchObject({ subtotal: 10000, tax: 800, tip: 2000, total: 12800 });
		expect(r.shares.map((s) => s.cents)).toEqual([6400, 6400]);
	});

	it('extras over the bill raise the bill to their sum and say so', () => {
		const r = split(bill(10, 0, crew(2, [8, 7])));
		expect(r).toMatchObject({ subtotal: 1500, total: 1500, over: true });
		expect(r.shares.map((s) => s.cents)).toEqual([800, 700]);
	});

	it('caps people at 12, mends ids and names, and clamps junk numbers', () => {
		expect(toPeople(crew(15))).toHaveLength(MAX_PEOPLE);
		expect(toPeople([{ id: 'a', name: '**Ana**', extras: -3 }, { id: 'a' }, null, { name: 'Bo', extras: '4.5' }])).toEqual([
			{ id: 'a', name: 'Ana', extras: 0 },
			{ id: 'p2', name: 'Person 2', extras: 0 },
			{ id: 'p3', name: 'Person 3', extras: 0 },
			{ id: 'p4', name: 'Bo', extras: 4.5 }
		]);
		expect(toValue({ subtotal: 50, tip_percent: 250, people: crew(2) })?.tip_percent).toBe(100);
		expect(toValue({ subtotal: 50, people: crew(2) })?.tip_percent).toBe(18);
		expect(toValue({ subtotal: 'lots', people: crew(2) })).toBeUndefined();
		expect(nextId(['p1', 'p2', 'p4'])).toBe('p5');
	});
});

describe('bill-split: registry, bind contract, manifest', () => {
	const types = ['bill-split', 'split-bill', 'bill-splitter'];

	it('resolves the type and both aliases to one component', () => {
		for (const t of types) expect(hasWidget(t)).toBe(true);
		for (const t of types) expect(getWidget(t)).toBe(getWidget('bill-split'));
	});

	it('binds value through onchange without the unregistered warning', () => {
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const t of types) {
			expect(getBindContract(t)).toEqual({ prop: 'value', event: 'onchange' });
			warnUnregisteredBindContract(t);
		}
		expect(warn).not.toHaveBeenCalled();
	});

	it('has a manifest entry whose props match the component and whose example renders', () => {
		const entry = manifestEntries.find((e) => e.type === 'bill-split')!;
		expect(entry).toBeTruthy();
		expect(entry.description.length).toBeLessThan(200);
		expect(Object.keys(entry.props)).toEqual(['title', 'currency', 'subtotal', 'tax', 'tip_percent', 'tip_options', 'people', 'extras_label', 'note']);
		const { container } = render(Ripple, { props: { spec: { state: {}, ui: entry.example } } });
		expect(container.querySelectorAll('[data-slot="pays"]')).toHaveLength(4);
	});
});

const DINNER = {
	title: 'Dinner for 4',
	subtotal: 186.4,
	tip_percent: 18,
	people: [
		{ id: 'p1', name: 'Alex', extras: 12 },
		{ id: 'p2', name: 'Sam' },
		{ id: 'p3', name: 'Priya', extras: 9 },
		{ id: 'p4', name: 'Jo' }
	]
};
const boundSpec = (props: Record<string, unknown> = DINNER) => ({ state: {}, ui: { type: 'bill-split', bind: '{state.bill}', props } });
const shares = (c: Element) => [...c.querySelectorAll('[data-slot="pays"]')].map((e) => e.textContent?.trim());
const totals = (c: Element) => c.querySelector('[data-slot="totals"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const lastBill = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.filter(([p]) => p === 'bill').at(-1)?.[1] as BillValue | undefined;
const setNumber = async (name: string | RegExp, value: string) => {
	const box = screen.getByRole('spinbutton', { name });
	await fireEvent.input(box, { target: { value } });
	await fireEvent.change(box);
};

describe('bill-split: what the reader sees', () => {
	it('a card per person, the bill, tip and total, and a range verdict', () => {
		const { container } = render(BillSplit, { props: DINNER });
		// 186.40 + 18% = 219.95. Shared 165.40 / 4 = 41.35 each.
		// Weights 213.40 / 165.40 / 201.40 / 165.40 of 745.60; the spare cent goes to Alex.
		expect(shares(container)).toEqual(['$62.96', '$48.79', '$59.41', '$48.79']);
		expect(totals(container)).toContain('$186.40');
		expect(totals(container)).toContain('$33.55');
		expect(totals(container)).toContain('$219.95');
		expect(screen.getByText(/Shares range from \$48\.79 to \$62\.96/)).toBeTruthy();
		expect(container.querySelector('[data-slot="totals"]')?.getAttribute('aria-live')).toBe('polite');
	});

	it('says everyone pays the same when they do', () => {
		render(BillSplit, { props: { subtotal: 200, tip_percent: 20, people: crew(4) } });
		expect(screen.getByText('Everyone pays $60.00')).toBeTruthy();
	});

	it('labels every input', () => {
		render(BillSplit, { props: DINNER });
		expect(screen.getByRole('spinbutton', { name: 'Bill before tip' })).toBeTruthy();
		expect(screen.getByRole('spinbutton', { name: 'Custom tip percent' })).toBeTruthy();
		expect(screen.getByRole('spinbutton', { name: 'Drinks for Priya' })).toBeTruthy();
		expect(screen.getByRole('textbox', { name: 'Name of person 3' })).toBeTruthy();
	});
});

describe('bill-split: edits', () => {
	it('a tip chip retips the bill and writes the bound value', async () => {
		const onStateChange = vi.fn();
		const { container } = render(Ripple, { props: { spec: boundSpec({ ...DINNER, people: crew(4) }), onStateChange } });
		await fireEvent.click(screen.getByRole('button', { name: '22%' }));
		expect(screen.getByRole('button', { name: '22%' }).getAttribute('aria-pressed')).toBe('true');
		expect(totals(container)).toContain('$227.41');
		expect(shares(container)).toEqual(['$56.86', '$56.85', '$56.85', '$56.85']);
		expect(screen.getByText('Everyone pays $56.85, give or take a cent')).toBeTruthy();
		expect(lastBill(onStateChange)?.tip_percent).toBe(22);
	});

	it('a custom tip and a new bill amount commit on change', async () => {
		const onStateChange = vi.fn();
		const { container } = render(Ripple, { props: { spec: boundSpec({ ...DINNER, people: crew(2) }), onStateChange } });
		await setNumber('Custom tip percent', '0');
		await setNumber('Bill before tip', '100');
		expect(shares(container)).toEqual(['$50.00', '$50.00']);
		expect(lastBill(onStateChange)).toMatchObject({ subtotal: 100, tip_percent: 0 });
	});

	it('adds and removes people between 2 and 12', async () => {
		const onStateChange = vi.fn();
		const { container } = render(Ripple, { props: { spec: boundSpec({ subtotal: 120, tip_percent: 0, people: crew(3) }), onStateChange } });
		await fireEvent.click(screen.getByRole('button', { name: 'Add person' }));
		expect(shares(container)).toEqual(['$30.00', '$30.00', '$30.00', '$30.00']);
		expect(lastBill(onStateChange)?.people.at(-1)).toEqual({ id: 'p4', name: 'Person 4', extras: 0 });

		await fireEvent.click(screen.getByRole('button', { name: 'Remove P1' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Remove P2' }));
		expect(shares(container)).toEqual(['$60.00', '$60.00']);
		expect(lastBill(onStateChange)?.people.map((p) => p.id)).toEqual(['p3', 'p4']);
		for (const b of screen.getAllByRole('button', { name: /^Remove / })) expect((b as HTMLButtonElement).disabled).toBe(true);
	});

	it('stops adding at 12', async () => {
		render(BillSplit, { props: { subtotal: 120, people: crew(11) } });
		const add = screen.getByRole('button', { name: 'Add person' }) as HTMLButtonElement;
		await fireEvent.click(add);
		expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(12);
		expect(add.disabled).toBe(true);
	});

	it('an extras change moves that person and the shared part', async () => {
		const onStateChange = vi.fn();
		const { container } = render(Ripple, { props: { spec: boundSpec({ subtotal: 100, tip_percent: 0, people: crew(2) }), onStateChange } });
		await setNumber('Drinks for P2', '20');
		expect(shares(container)).toEqual(['$40.00', '$60.00']);
		expect(lastBill(onStateChange)?.people[1].extras).toBe(20);
	});

	it('a rename writes the new name', async () => {
		const onchange = vi.fn();
		render(BillSplit, { props: { subtotal: 100, people: crew(2), onchange } });
		const name = screen.getByRole('textbox', { name: 'Name of person 1' });
		await fireEvent.input(name, { target: { value: 'Robin' } });
		await fireEvent.change(name);
		expect(onchange.mock.lastCall?.[0].people[0].name).toBe('Robin');
		expect(screen.getByRole('spinbutton', { name: 'Drinks for Robin' })).toBeTruthy();
	});
});

describe('bill-split: a re-sent spec', () => {
	it('keeps the edits when the same spec comes back; new numbers replace them', async () => {
		const { container, rerender } = render(Ripple, { props: { spec: boundSpec() } });
		await fireEvent.click(screen.getByRole('button', { name: '20%' }));
		await setNumber('Drinks for Sam', '15');
		const edited = shares(container);

		await rerender({ spec: boundSpec() });
		expect(shares(container)).toEqual(edited);
		expect(screen.getByRole('button', { name: '20%' }).getAttribute('aria-pressed')).toBe('true');

		await rerender({ spec: boundSpec({ subtotal: 100, tip_percent: 0, people: crew(2) }) });
		expect(shares(container)).toEqual(['$50.00', '$50.00']);
	});

	it('works the same unbound', async () => {
		const spec = { ui: { type: 'bill-split', props: DINNER } };
		const { container, rerender } = render(Ripple, { props: { spec } });
		await fireEvent.click(screen.getByRole('button', { name: 'Remove Jo' }));
		await rerender({ spec: { ui: { type: 'bill-split', props: DINNER } } });
		expect(shares(container)).toHaveLength(3);
		await rerender({ spec: { ui: { type: 'bill-split', props: { ...DINNER, subtotal: 200 } } } });
		expect(shares(container)).toHaveLength(4);
	});
});

describe('bill-split: streaming', () => {
	it('streams the dinner and ends equal to the whole render', async () => {
		await expectStreamParity(boundSpec({ ...DINNER, currency: 'USD', tax: 14.2, extras_label: 'Drinks', note: 'Tip on the pre-tax bill.' }));
	});
});

describe('bill-split: junk props', () => {
	it.each([
		['wrong types everywhere', { subtotal: 'lots', tip_percent: 'big', people: 'four', tip_options: 'x', currency: '$$' }],
		['bad people', { subtotal: 50, people: [null, 7, { extras: 'x' }] }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(BillSplit, { props: props as never });
		expect(container.querySelector('[data-widget="bill-split"]')).not.toBeNull();
	});

	it('waits with a skeleton until there is a bill and a person', () => {
		const { container } = render(BillSplit, { props: { subtotal: 50 } });
		expect(container.querySelector('[data-slot="pending"]')).not.toBeNull();
	});
});
