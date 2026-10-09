// widgets/composite/ExecDashboard.test.ts — exec-dashboard as a widget:
// registry and bind-contract wiring for every alias, the rows mode (a bound
// filter emits a NEW filters object and recomputes every number, the
// `on_filter` host hook, colours that follow the entity through a filter,
// columns capped at 24px on one scale, totals for the picked region),
// streamed parity with id-less rows, junk props, the spec-level
// `on_date_range_change` (alone and next to a bind), and the KPI mode the
// existing specs use.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { _resetBindContractWarnings, getBindContract, warnUnregisteredBindContract } from '@ripple-ui/core';
import type { ComponentProps } from 'svelte';
import ExecDashboard from './ExecDashboard.svelte';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const orders = () => [
	{ id: 'o1', date: '2026-07-04', region: 'North', channel: 'Web', amount: 120 },
	{ id: 'o2', date: '2026-07-20', region: 'West', channel: 'Social', amount: 80 },
	{ id: 'o3', date: '2026-08-02', region: 'North', channel: 'Marketplace', amount: 200 },
	{ id: 'o4', date: '2026-08-15', region: 'West', channel: 'Web', amount: 160 },
	{ id: 'o5', date: '2026-09-09', region: 'North', channel: 'Web', amount: 300 },
	{ id: 'o6', date: '2026-09-27', region: 'West', channel: 'Social', amount: 140 }
];

const salesProps = (): ComponentProps<typeof ExecDashboard> => ({
	title: 'Q3 sales',
	rows: orders(),
	measures: [
		{ key: 'amount', label: 'Revenue', format: 'money' },
		{ label: 'Orders', agg: 'count' },
		{ key: 'amount', label: 'Avg order', format: 'money', agg: 'avg' }
	],
	dimensions: [{ key: 'region', label: 'Region' }],
	x: 'date',
	split: 'channel',
	table: { title: 'Orders' }
});

// A KPI tile by its label (the label also heads a chart, a column and a card).
const kpi = (label: string) =>
	screen.getAllByText(label).find((el) => el.closest('[data-slot="kpis"]'))!.closest('[data-slot="kpis"] > div') as HTMLElement;
const cells = (row: Element) => [...row.children].map((c) => c.textContent!.trim());

describe('exec-dashboard: registry and bind contract', () => {
	it('resolves the type and both aliases to one component', () => {
		for (const t of ['exec-dashboard', 'kpi-dashboard', 'executive-dashboard']) expect(hasWidget(t)).toBe(true);
		expect(getWidget('kpi-dashboard')).toBe(getWidget('exec-dashboard'));
		expect(getWidget('executive-dashboard')).toBe(getWidget('exec-dashboard'));
	});

	it('binds filters through onfilterschange for every alias, without the unregistered warning', () => {
		expect(getBindContract('exec-dashboard')).toEqual({ prop: 'filters', event: 'onfilterschange' });
		expect(getBindContract('kpi-dashboard')).toEqual(getBindContract('exec-dashboard'));
		expect(getBindContract('executive-dashboard')).toEqual(getBindContract('exec-dashboard'));
		_resetBindContractWarnings();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		warnUnregisteredBindContract('exec-dashboard');
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('exec-dashboard: rows mode', () => {
	const mountBound = (extra: Record<string, unknown> = {}) => {
		const onStateChange = vi.fn();
		const initial = { region: 'West' };
		render(Ripple, {
			props: {
				spec: { state: { pick: initial }, ui: { type: 'exec-dashboard', bind: '{state.pick}', props: salesProps(), ...extra } },
				onStateChange
			}
		});
		return { onStateChange, initial };
	};

	it('computes the KPIs from the bound filter, and a pick writes a NEW filters object and recomputes them', async () => {
		const { onStateChange, initial } = mountBound();
		// West: 80 + 160 + 140.
		expect(within(kpi('Revenue')).getByText('$380')).toBeTruthy();
		expect(within(kpi('Orders')).getByText('3')).toBeTruthy();

		await fireEvent.click(screen.getByRole('button', { name: 'North' }));
		const next = onStateChange.mock.calls.at(-1)![1];
		expect(onStateChange).toHaveBeenLastCalledWith('pick', { region: 'North' }, expect.anything());
		expect(next).not.toBe(initial);
		expect(initial).toEqual({ region: 'West' });
		expect(within(kpi('Revenue')).getByText('$620')).toBeTruthy();
		expect(within(kpi('Avg order')).getByText('$207')).toBeTruthy();

		// "All" clears the dimension.
		await fireEvent.click(screen.getByRole('button', { name: 'All' }));
		expect(onStateChange.mock.calls.at(-1)![1]).toEqual({});
		expect(within(kpi('Revenue')).getByText('$1,000')).toBeTruthy();
	});

	it('trends each KPI on the last month against the one before it', () => {
		mountBound();
		// West: Sep 140 vs Aug 160.
		expect(within(kpi('Revenue')).getByText('−13% Sep vs Aug')).toBeTruthy();
	});

	it('trends against filtered compare rows when given', () => {
		mountBound({
			props: {
				...salesProps(),
				compare: [
					{ region: 'West', amount: 190 },
					{ region: 'North', amount: 999 }
				],
				compareLabel: 'vs Q2'
			}
		});
		expect(within(kpi('Revenue')).getByText('+100% vs Q2')).toBeTruthy();
	});

	it('fires the spec on_filter hook with { key, value } next to the bind writer', async () => {
		const onStateChange = vi.fn();
		render(Ripple, {
			props: {
				spec: {
					state: { pick: {} },
					ui: {
						type: 'exec-dashboard',
						bind: '{state.pick}',
						props: salesProps(),
						on_filter: { action: 'set', target: 'last', value: '{event.value}' }
					}
				},
				onStateChange
			}
		});
		await fireEvent.click(screen.getByRole('button', { name: 'West' }));
		expect(onStateChange).toHaveBeenCalledWith('pick', { region: 'West' }, expect.anything());
		expect(onStateChange).toHaveBeenCalledWith('last', 'West', expect.anything());
	});

	it('keeps each channel on its colour slot when a filter removes another channel', async () => {
		const { container } = render(ExecDashboard, { props: salesProps() });
		const legend = () =>
			Object.fromEntries(
				[...container.querySelectorAll('figcaption > span')].map((s) => [s.textContent!.trim(), s.querySelector('span')!.className])
			);
		const before = legend();
		expect(before.Web).toMatch(/bg-chart-1/);
		expect(before.Social).toMatch(/bg-chart-2/);
		expect(before.Marketplace).toMatch(/bg-chart-3/);
		await fireEvent.click(screen.getByRole('button', { name: 'West' }));
		// West has no Marketplace orders: it leaves the legend, the others keep their slots.
		expect(legend()).toEqual({ Web: before.Web, Social: before.Social });
	});

	it('draws columns at most 24px wide, on one shared scale, with a readout per column', () => {
		const { container } = render(ExecDashboard, { props: salesProps() });
		const cols = [...container.querySelectorAll<HTMLElement>('[data-slot="column"]')];
		expect(cols).toHaveLength(3);
		for (const c of cols) expect(c.className).toContain('w-[min(24px,60%)]');
		// Jul 200, Aug 360, Sep 440 on a 0..500 axis.
		expect(cols.map((c) => c.style.height)).toEqual(['40%', '72%', '88%']);
		expect(screen.getByRole('button', { name: /^Sep: \$440, Web \$300, Social \$140/ })).toBeTruthy();
	});

	it('shows the breakdown by the first unfiltered dimension, then by the split once region is picked', async () => {
		const { container } = render(ExecDashboard, { props: salesProps() });
		const labels = () => [...container.querySelectorAll('[data-slot="breakdown"] li')].map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
		expect(labels()).toEqual(['North $620 62%', 'West $380 38%']);
		await fireEvent.click(screen.getByRole('button', { name: 'Show only West' }));
		expect(labels()).toEqual(['Social $220 58%', 'Web $160 42%']);
	});

	it('totals the table for the picked region', async () => {
		const { container } = render(ExecDashboard, { props: salesProps() });
		await fireEvent.click(screen.getByRole('button', { name: 'West' }));
		expect(cells(container.querySelector('[data-slot="totals"]')!)).toEqual(['Total (West)', '', '', '$380.00']);
		expect(container.querySelectorAll('[data-slot="table"] tbody tr')).toHaveLength(3);
	});

	it('switches the chart to its table view', async () => {
		const { container } = render(ExecDashboard, { props: salesProps() });
		await fireEvent.click(screen.getByRole('button', { name: 'Table' }));
		const rows = [...container.querySelectorAll('[data-slot="chart-table"] tbody tr')].map(cells);
		expect(rows[2]).toEqual(['Sep', '$300', '$140', '$0.00', '$440']);
	});

	it('streams id-less rows to the same final render', async () => {
		await expectStreamParity({
			ui: {
				type: 'exec-dashboard',
				props: {
					title: 'Fernleaf Ceramics, Q3',
					verdict: { text: 'September was the best month; East leads.', status: 'good' },
					rows: [
						{ date: '2026-07-04', region: 'North', channel: 'Web', amount: 120 },
						{ date: '2026-08-02', region: 'East', channel: 'Social', amount: 75.5 },
						{ region: 'East' },
						{ date: '2026-09-09', region: 'North', channel: 'Web', amount: 300 },
						{}
					],
					measures: [{ key: 'amount', label: 'Revenue', format: 'money' }, { label: 'Orders', agg: 'count' }],
					dimensions: [{ key: 'region', label: 'Region' }],
					x: 'date',
					split: 'channel'
				}
			}
		});
	});
});

describe('exec-dashboard: junk props', () => {
	it.each([
		['wrong types everywhere', { rows: 'soon', measures: 5, dimensions: 'region', filters: 'x', x: 9, split: {}, compare: 'q2' }],
		['junk rows', { rows: [null, 7, 'order', [1], { amount: 'NaN', region: { a: 1 } }, { date: '2026-02-31', amount: Infinity }], x: 'date', measures: [{ key: 'amount', label: 'Rev', format: 'money' }] }],
		['junk measures and dimensions', { rows: [{ a: 1 }], measures: [null, { agg: 'sum' }, { key: 'a', format: 'yen' }], dimensions: [null, { label: 'x' }, { key: 'a' }] }],
		['a filter for a value that is not there', { ...salesProps(), filters: { region: 'Mars' } }],
		['nothing at all', {}],
		['legacy junk', { kpis: 'many', charts: 4, table: { columns: null, rows: 'x' }, activity: { a: 1 } }]
	])('%s renders without throwing', (_name, props) => {
		const { container } = render(ExecDashboard, { props: props as never });
		expect(container.querySelector('[data-widget="exec-dashboard"]')).not.toBeNull();
	});

	it('shows the empty line when rows mode has no rows', () => {
		render(ExecDashboard, { props: { rows: [] } });
		expect(screen.getByText('No rows yet. Ask for the records to summarise.')).toBeTruthy();
	});

	it('says no rows match when a filter empties the table', () => {
		render(ExecDashboard, { props: { ...salesProps(), filters: { region: 'Mars' } } as never });
		expect(screen.getByText('No rows match this filter.')).toBeTruthy();
	});
});

describe('exec-dashboard: on_date_range_change', () => {
	const kpiSpec = (extra: Record<string, unknown>) => ({
		type: 'exec-dashboard',
		props: {
			dateRanges: ['7d', '30d'],
			showRefresh: false,
			kpis: [{ id: 'rev', label: 'Revenue', value: '$0', byKey: { '7d': { value: '$7k' }, '30d': { value: '$30k' } } }]
		},
		...extra
	});

	it('fires the spec handler (on_date_range_change becomes ondaterangechange) when a chip is picked', async () => {
		const onStateChange = vi.fn();
		render(Ripple, {
			props: { spec: { state: {}, ui: kpiSpec({ on_date_range_change: { action: 'set', target: 'range', value: '{event}' } }) }, onStateChange }
		});
		await fireEvent.click(screen.getByRole('tab', { name: '30d' }));
		expect(onStateChange).toHaveBeenLastCalledWith('range', '30d', expect.anything());
		expect(screen.getByText('$30k')).toBeTruthy();
	});

	it('fires next to a bind without either replacing the other', async () => {
		const onStateChange = vi.fn();
		render(Ripple, {
			props: {
				spec: {
					state: { pick: {} },
					ui: kpiSpec({ bind: '{state.pick}', on_date_range_change: { action: 'set', target: 'range', value: '{event}' } })
				},
				onStateChange
			}
		});
		await fireEvent.click(screen.getByRole('tab', { name: '30d' }));
		expect(onStateChange).toHaveBeenCalledWith('range', '30d', expect.anything());
		// The date range is not the bound field, so the bind path is untouched.
		expect(onStateChange).not.toHaveBeenCalledWith('pick', expect.anything(), expect.anything());
	});

	it('still calls the camel-cased Svelte prop', async () => {
		const camel = vi.fn();
		const lower = vi.fn();
		render(ExecDashboard, { props: { dateRanges: ['7d', '30d'], ondateRangeChange: camel, ondaterangechange: lower } });
		await fireEvent.click(screen.getByRole('tab', { name: '30d' }));
		expect(camel).toHaveBeenCalledWith('30d');
		expect(lower).toHaveBeenCalledWith('30d');
	});
});

describe('exec-dashboard: KPI mode (existing specs)', () => {
	it('renders prebuilt KPIs, byKey overrides and the table footer as before', async () => {
		render(ExecDashboard, {
			props: {
				title: 'Q2 performance',
				dateRanges: ['7d', '30d'],
				kpis: [{ id: 'rev', label: 'Revenue', value: '$2.4M', delta: '+18%', trend: 'up', byKey: { '30d': { value: '$780k' } } }],
				primaryChart: { title: 'Revenue', type: 'line', data: [{ label: 'Jan', value: 1 }] },
				table: { title: 'Top accounts', columns: [{ key: 'name', label: 'Account' }], rows: [{ name: 'Globex' }] }
			}
		});
		expect(screen.getByText('Q2 performance')).toBeTruthy();
		expect(screen.getByText('$2.4M')).toBeTruthy();
		expect(screen.getByText('Top accounts')).toBeTruthy();
		expect(screen.getByText('Globex')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
		await fireEvent.click(screen.getByRole('tab', { name: '30d' }));
		expect(screen.getByText('$780k')).toBeTruthy();
	});
});

describe('exec-dashboard: local choices survive a re-sent spec', () => {
	// When the bound filter changes, the host re-sends the whole spec with the
	// original values for every other prop. The visitor's other choices (chart
	// or table view, show all, the KPI-mode chips) must not snap back.
	const twelve = () =>
		Array.from({ length: 12 }, (_, i) => ({ date: `2026-0${7 + (i % 3)}-1${i % 9}`, region: i % 2 ? 'North' : 'West', amount: 10 + i }));

	it('rows mode keeps the Table view and Show all when the bound filter changes', async () => {
		const spec = (pick: Record<string, string>) => ({
			state: { pick },
			ui: {
				type: 'exec-dashboard',
				bind: '{state.pick}',
				props: { rows: twelve(), measures: [{ key: 'amount', label: 'Revenue', format: 'money' }], dimensions: [{ key: 'region', label: 'Region' }], x: 'date' }
			}
		});
		const { rerender } = render(Ripple, { props: { spec: spec({}) } });
		await fireEvent.click(screen.getByRole('button', { name: 'Table' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Show all 12' }));

		await rerender({ spec: spec({ region: 'North' }) });
		expect(screen.getByRole('button', { name: 'North' }).getAttribute('aria-pressed')).toBe('true');
		expect(screen.getByRole('button', { name: 'Table' }).getAttribute('aria-pressed')).toBe('true');
		// North has 6 rows, so the toggle is gone, and the table lists all 6.
		expect(document.querySelectorAll('[data-slot="table"] tbody tr')).toHaveLength(6);

		await rerender({ spec: spec({}) });
		expect(screen.getByRole('button', { name: 'Show fewer' })).toBeTruthy();
		expect(document.querySelectorAll('[data-slot="table"] tbody tr')).toHaveLength(12);
	});

	it('KPI mode keeps the picked range, granularity and activity filter across a re-send of the same props', async () => {
		const spec = (pick: Record<string, string>, activeDateRange = '7d') => ({
			state: { pick },
			ui: {
				type: 'exec-dashboard',
				bind: '{state.pick}',
				props: {
					dateRanges: ['7d', '30d', '90d'],
					activeDateRange,
					granularities: ['Day', 'Week'],
					activity: [
						{ id: 'a1', time: '1h', label: 'Deal closed', category: 'Sales' },
						{ id: 'a2', time: '2h', label: 'SLA breach', category: 'Alerts' }
					],
					kpis: [{ id: 'rev', label: 'Revenue', value: '$0', byKey: { '7d': { value: '$7k' }, '30d': { value: '$30k' } } }]
				}
			}
		});
		const { rerender } = render(Ripple, { props: { spec: spec({}) } });
		await fireEvent.click(screen.getByRole('tab', { name: '30d' }));
		await fireEvent.click(screen.getByRole('tab', { name: 'Week' }));
		await fireEvent.click(screen.getByRole('tab', { name: 'Alerts' }));

		await rerender({ spec: spec({ region: 'North' }) });
		expect(screen.getByRole('tab', { name: '30d' }).getAttribute('aria-selected')).toBe('true');
		expect(screen.getByRole('tab', { name: 'Week' }).getAttribute('aria-selected')).toBe('true');
		expect(screen.getByRole('tab', { name: 'Alerts' }).getAttribute('aria-selected')).toBe('true');
		expect(screen.getByText('$30k')).toBeTruthy();
		expect(screen.queryByText('Deal closed')).toBeNull();

		// Genuinely new data from the spec still wins.
		await rerender({ spec: spec({ region: 'North' }, '90d') });
		expect(screen.getByRole('tab', { name: '90d' }).getAttribute('aria-selected')).toBe('true');
		expect(screen.getByRole('tab', { name: 'Week' }).getAttribute('aria-selected')).toBe('true');
	});
});
