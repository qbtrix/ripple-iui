// widgets/composite/GrowthProjection.test.ts — the growth-projection data
// widget: its math against closed-form references (monthly and yearly
// compounding, rate 0, lump sum, partial year), clamping, registry and bind
// wiring, a bound slider edit writing a number back to state, rate and years
// edits surviving a re-sent spec (and yielding to a new one), the rate event,
// streamed parity, junk props, and what the reader sees (hero, goal, table).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import GrowthProjection, { clampInputs, goalYear, niceCeil, project, roomy } from './GrowthProjection.svelte';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

// References written from the formulas, not from the loop.
// Monthly: FV = P(1+i)^n + D((1+i)^n - 1)/i, i = r/12, n = 12y, deposits at month end.
const monthlyFV = (P: number, D: number, r: number, y: number) => {
	const i = r / 100 / 12;
	const g = (1 + i) ** (12 * y);
	return P * g + (i ? (D * (g - 1)) / i : D * 12 * y);
};
// Yearly: simple interest inside the year, credited at year end. A deposit at
// the end of month k earns r(12-k)/12, so a year's deposits close at
// D(12 + r·(0+1+…+11)/12) = D(12 + 5.5r), then compound yearly.
const yearlyFV = (P: number, D: number, r: number, y: number) => {
	const R = r / 100;
	const g = (1 + R) ** y;
	return P * g + (R ? (D * (12 + 5.5 * R) * (g - 1)) / R : 12 * D * y);
};

describe('growth-projection: math', () => {
	it('$300 a month at 5% for 10 years, monthly, matches the closed form and the landing fixture', () => {
		const rows = project({ deposit: 300, rate: 5, years: 10 });
		expect(rows).toHaveLength(11);
		expect(rows[0]).toEqual({ year: 0, deposited: 0, growth: 0, balance: 0 });
		const last = rows.at(-1)!;
		expect(last.balance).toBeCloseTo(monthlyFV(0, 300, 5, 10), 6);
		expect(last.balance).toBeCloseTo(46584.68, 2);
		expect(last.deposited).toBe(36000);
		expect(last.growth).toBeCloseTo(10584.68, 2);
		expect(rows[1].balance).toBeCloseTo(3683.66, 2); // fixture year 1
		for (const r of rows) expect(r.balance).toBeCloseTo(monthlyFV(0, 300, 5, r.year), 6);
	});

	it('yearly compounding matches its closed form, deposits and lump sum alike', () => {
		for (const [P, D, r, y] of [
			[0, 300, 5, 10],
			[10000, 0, 5, 10],
			[2500, 150, 7.5, 30]
		])
			expect(project({ initial: P, deposit: D, rate: r, years: y }, 'yearly').at(-1)!.balance).toBeCloseTo(yearlyFV(P, D, r, y), 4);
		expect(project({ initial: 10000, rate: 5, years: 10 }, 'yearly').at(-1)!.balance).toBeCloseTo(16288.95, 2);
		// Less than monthly, since the deposits earn only simple interest within a year.
		expect(yearlyFV(0, 300, 5, 10)).toBeLessThan(monthlyFV(0, 300, 5, 10));
	});

	it('a lump sum with no deposits grows on its own', () => {
		const last = project({ initial: 10000, deposit: 0, rate: 5, years: 10 }).at(-1)!;
		expect(last.balance).toBeCloseTo(16470.09, 2);
		expect(last.deposited).toBe(10000);
	});

	it('rate 0 is the sum of what went in', () => {
		const last = project({ initial: 1000, deposit: 100, rate: 0, years: 3 }).at(-1)!;
		expect(last).toEqual({ year: 3, deposited: 4600, growth: 0, balance: 4600 });
	});

	it('a fractional horizon rounds to months and ends on a partial row', () => {
		const rows = project({ deposit: 300, rate: 5, years: 1.5 });
		expect(rows.map((r) => r.year)).toEqual([0, 1, 1.5]);
		expect(rows[2].balance).toBeCloseTo(monthlyFV(0, 300, 5, 1.5), 6);
		expect(project({ deposit: 10, rate: 5, years: 0.01 }).at(-1)!.year).toBeCloseTo(1 / 12);
	});

	it('clamps absurd inputs and lists each change', () => {
		const c = clampInputs({ initial: -50, deposit: -300, rate: 250, years: 150, inflation: -2 });
		expect(c).toMatchObject({ initial: 0, deposit: 0, rate: 100, years: 100, inflation: 0 });
		expect(c.clamped).toEqual([
			{ field: 'initial', from: -50, to: 0 },
			{ field: 'deposit', from: -300, to: 0 },
			{ field: 'rate', from: 250, to: 100 },
			{ field: 'years', from: 150, to: 100 },
			{ field: 'inflation', from: -2, to: 0 }
		]);
		expect(clampInputs({ years: -3 })).toMatchObject({ years: 1, clamped: [{ field: 'years', from: -3, to: 1 }] });
		expect(clampInputs({ deposit: '300', rate: 'five', years: Infinity })).toMatchObject({ deposit: 300, rate: undefined, years: undefined, clamped: [] });
	});

	it('finds the goal year, nice ceilings and slider room', () => {
		const rows = project({ deposit: 300, rate: 5, years: 15 });
		expect(goalYear(rows, 50000)).toBe(11);
		expect(goalYear(rows, 1e9)).toBeUndefined();
		expect(goalYear(rows, undefined)).toBeUndefined();
		expect([niceCeil(1000), niceCeil(11646), niceCeil(0.3), niceCeil(-1), niceCeil(NaN)]).toEqual([1000, 20000, 0.5, 1, 1]);
		expect([roomy(300, 1000), roomy(5, 10, 100), roomy(9, 10, 100), roomy(10, 30, 100), roomy(90, 30, 100)]).toEqual([1000, 10, 20, 30, 100]);
	});
});

describe('growth-projection: registry and bind contract', () => {
	const types = ['growth-projection', 'savings-projection', 'compound-interest'];

	it('resolves the type and both aliases to one component', () => {
		for (const t of types) expect(hasWidget(t)).toBe(true);
		for (const t of types) expect(getWidget(t)).toBe(getWidget('growth-projection'));
	});

	it('binds deposit through ondepositchange, for every alias, without the unregistered warning', () => {
		for (const t of types) expect(getBindContract(t)).toEqual({ prop: 'deposit', event: 'ondepositchange' });
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		warnUnregisteredBindContract('growth-projection');
		expect(warn).not.toHaveBeenCalled();
	});
});

const finalText = (c: Element) => c.querySelector('[data-slot="final"]')?.textContent?.trim();

describe('growth-projection: edits', () => {
	it('a bound deposit slider writes the new number to state and redraws', async () => {
		const onStateChange = vi.fn();
		const { container } = render(Ripple, {
			props: {
				spec: { state: { deposit: 300 }, ui: { type: 'growth-projection', bind: '{state.deposit}', props: { rate: 5, years: 10 } } },
				onStateChange
			}
		});
		expect(finalText(container)).toBe('$46,585');
		const slider = screen.getByRole('slider', { name: 'Monthly deposit' });
		await fireEvent.input(slider, { target: { value: '500' } });
		expect(onStateChange).not.toHaveBeenCalled(); // a drag only moves the draft
		expect(finalText(container)).toBe(`$${Math.round(monthlyFV(0, 500, 5, 10)).toLocaleString('en-US')}`);
		await fireEvent.change(slider);
		expect(onStateChange).toHaveBeenLastCalledWith('deposit', 500, expect.anything());
	});

	const slide = async (name: string, value: string) => {
		const s = screen.getByRole('slider', { name });
		await fireEvent.input(s, { target: { value } });
		await fireEvent.change(s);
	};
	const cashOf = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
	const boundSpec = (rate: number, years: number) => ({
		state: { deposit: 300 },
		ui: { type: 'growth-projection', bind: '{state.deposit}', props: { rate, years } }
	});

	it('rate and years edits survive a bound deposit change that re-sends the spec', async () => {
		const { container } = render(Ripple, { props: { spec: boundSpec(5, 10) } });
		await slide('Interest rate', '7');
		await slide('Years', '20');
		expect(finalText(container)).toBe(cashOf(monthlyFV(0, 300, 7, 20)));

		await slide('Monthly deposit', '500');
		expect(screen.getByText('Balance after 20 years')).toBeTruthy();
		expect((screen.getByRole('slider', { name: 'Interest rate' }) as HTMLInputElement).value).toBe('7');
		expect(finalText(container)).toBe(cashOf(monthlyFV(0, 500, 7, 20)));
	});

	it('a re-sent copy of the same spec keeps the edits; a new spec from the model replaces them', async () => {
		const { container, rerender } = render(Ripple, { props: { spec: boundSpec(5, 10) } });
		await slide('Interest rate', '7');
		await slide('Years', '20');

		await rerender({ spec: boundSpec(5, 10) });
		expect(finalText(container)).toBe(cashOf(monthlyFV(0, 300, 7, 20)));

		await rerender({ spec: boundSpec(4, 15) });
		expect(screen.getByText('Balance after 15 years')).toBeTruthy();
		expect(finalText(container)).toBe(cashOf(monthlyFV(0, 300, 4, 15)));
	});

	it('a typed rate over 100 commits as 100 and fires on_ratechange with the number', async () => {
		const onStateChange = vi.fn();
		render(Ripple, {
			props: {
				spec: {
					state: { rate: 5 },
					ui: { type: 'growth-projection', props: { deposit: 300, rate: '{state.rate}', years: 10 }, on_ratechange: { action: 'set', target: 'rate', value: '{event}' } }
				},
				onStateChange
			}
		});
		const box = screen.getByRole('spinbutton', { name: 'Interest rate' });
		await fireEvent.input(box, { target: { value: '250' } });
		expect(screen.getByText(/Rate 250% → 100%/)).toBeTruthy();
		await fireEvent.change(box);
		await vi.waitFor(() => expect(onStateChange).toHaveBeenLastCalledWith('rate', 100, expect.anything()));
	});

	it('an emptied number box does not drop the chart and restores on commit', async () => {
		const { container } = render(GrowthProjection, { props: { deposit: 300, rate: 5, years: 10 } });
		const box = screen.getByRole('spinbutton', { name: 'Years' }) as HTMLInputElement;
		await fireEvent.input(box, { target: { value: '' } });
		expect(container.querySelector('[data-slot="pending"]')).toBeNull();
		await fireEvent.change(box);
		expect(box.value).toBe('10');
	});

	it('a Svelte parent sees years through onyearschange', async () => {
		let got: unknown;
		render(GrowthProjection, { props: { deposit: 300, rate: 5, years: 10, onyearschange: (y: number) => (got = y) } });
		const slider = screen.getByRole('slider', { name: 'Years' });
		await fireEvent.input(slider, { target: { value: '20' } });
		await fireEvent.change(slider);
		expect(got).toBe(20);
		expect(screen.getByText('Balance after 20 years')).toBeTruthy();
	});

	it('arrow keys on the chart step through the years', async () => {
		render(GrowthProjection, { props: { deposit: 300, rate: 5, years: 10 } });
		const plot = screen.getByRole('slider', { name: /Balance by year/ });
		expect(plot.getAttribute('aria-valuenow')).toBe('10');
		await fireEvent.keyDown(plot, { key: 'Home' });
		await fireEvent.keyDown(plot, { key: 'ArrowRight' });
		expect(plot.getAttribute('aria-valuetext')).toBe('Year 1: balance $3,684, deposits $3,600, growth $84');
		expect(document.querySelector('[data-slot="tooltip"]')?.textContent).toContain('$3,684');
	});
});

describe('growth-projection: what the reader sees', () => {
	it('leads with the balance and the split, and the table has a row per year', () => {
		const { container } = render(GrowthProjection, { props: { deposit: 300, rate: 5, years: 10 } });
		expect(screen.getByText('Balance after 10 years')).toBeTruthy();
		expect(screen.getByText(/You put in \$36,000; growth adds \$10,585\./)).toBeTruthy();
		expect(container.querySelectorAll('[data-slot="table"] tbody tr')).toHaveLength(11);
		expect(container.querySelectorAll('[data-end]')).toHaveLength(2);
	});

	it('marks the goal year, today\'s money and what was clamped', () => {
		const { container } = render(GrowthProjection, {
			props: { initial: 10000, deposit: 300, rate: 250, years: 12, goal: 50000, inflation: 2.5 }
		});
		expect(container.querySelector('[data-slot="clamped"]')?.textContent).toContain('Rate 250% → 100%');
		expect(container.querySelector('[data-slot="goal"]')).not.toBeNull();
		expect(screen.getByText(/goal reached in year/)).toBeTruthy();
		expect(screen.getByText(/in today's money at 2\.5% inflation/)).toBeTruthy();
	});

	it('says how far short of an unreached goal', () => {
		render(GrowthProjection, { props: { deposit: 300, rate: 5, years: 10, goal: 50000 } });
		expect(screen.getByText('$3,415 short of the $50,000 goal')).toBeTruthy();
	});
});

describe('growth-projection: streaming', () => {
	it('streams the landing prompt and ends equal to the whole render', async () => {
		await expectStreamParity({
			state: { deposit: 300 },
			ui: {
				type: 'growth-projection',
				bind: '{state.deposit}',
				props: {
					title: 'Savings growth',
					verdict: { text: '$300 a month becomes about $46,600 in 10 years.', status: 'good' },
					currency: 'USD',
					rate: 5,
					years: 10,
					goal: 40000,
					inflation: 2
				}
			}
		});
	});

	it('streams a lump sum with no deposit key at all', async () => {
		await expectStreamParity({ ui: { type: 'growth-projection', props: { initial: 10000, rate: 4, years: 15, compounding: 'yearly' } } });
	});
});

describe('growth-projection: junk props', () => {
	it.each([
		['wrong types everywhere', { deposit: 'lots', rate: 'five', years: 'ten', initial: {}, goal: 'big', inflation: [], currency: '$$', compounding: 7 }],
		['absurd numbers', { deposit: -300, rate: -3, years: 1e9, initial: -1, goal: -5 }],
		['zeros', { deposit: 0, rate: 0, years: 0, initial: 0 }],
		['nothing at all', {}]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(GrowthProjection, { props: props as never });
		expect(container.querySelector('[data-widget="growth-projection"]')).not.toBeNull();
	});

	it('waits with a skeleton that names what is missing', () => {
		const { container } = render(GrowthProjection, { props: { deposit: 300 } });
		expect(container.querySelector('[data-slot="pending"]')?.textContent).toContain('Waiting for the rate, years');
	});
});
