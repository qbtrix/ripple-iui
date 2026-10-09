<!--
  widgets/composite/ExecDashboardRows.svelte — exec-dashboard's rows mode
  (design doc 2026-10-09 §3.10). Internal: ExecDashboard renders it when a
  spec carries `rows`; it is not registered on its own.

  The model writes raw rows plus measures and dimensions; every number here is
  derived from the FILTERED rows by exec-dashboard.ts, so one filter chip
  recomputes the KPIs and their trends, the chart, the breakdown and the table
  totals. The filter state lives in the parent (it is the bound field); this
  component only reports picks through `onpick`.

  Chart rules (dataviz): drawn as markup, not canvas, so it reads the theme's
  --chart-N variables, renders on the server and is keyboard reachable. Columns
  at most 24px wide with 4px rounded tops on one baseline, a 2px surface gap
  between stacked segments, one y axis with a hairline grid, a per-column
  readout on hover, focus or tap, cap labels on few columns (and the largest
  and last on many), and a Table view. One series wears --chart-1; a `split`
  colours each value by its fixed slot from the unfiltered rows, so a filter
  never repaints a survivor, and past five values the tail folds into Other.
-->
<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
	import ChartBarIcon from '@lucide/svelte/icons/chart-bar';
	import TableIcon from '@lucide/svelte/icons/table';
	import Rows3Icon from '@lucide/svelte/icons/rows-3';
	import VerdictLine from '../data-kit/VerdictLine.svelte';
	import StatChip from '../data-kit/StatChip.svelte';
	import SectionCard from '../data-kit/SectionCard.svelte';
	import { dateLabel, plain } from '../data-kit/format.js';
	import type { Verdict } from '../data-kit/types.js';
	import {
		OTHER,
		breakdown,
		bucketer,
		defaultColumns,
		distinct,
		filterRows,
		fmt,
		kpis,
		measureFor,
		readDimensions,
		readFilters,
		readMeasures,
		readRows,
		series,
		splitKeys,
		ticks,
		title as titleCase,
		totals,
		type Column,
		type Row,
		type SeriesPoint
	} from './exec-dashboard.js';

	interface Props {
		title?: string;
		subtitle?: string;
		verdict?: Verdict;
		currency?: string;
		rows?: unknown;
		measures?: unknown;
		dimensions?: unknown;
		x?: string;
		split?: string;
		compare?: unknown;
		compareLabel?: string;
		tableTitle?: string;
		tableColumns?: unknown;
		filters?: unknown;
		onpick?: (key: string, value: string | undefined) => void;
	}

	let {
		title,
		subtitle,
		verdict,
		currency,
		rows,
		measures,
		dimensions,
		x,
		split,
		compare,
		compareLabel,
		tableTitle,
		tableColumns,
		filters,
		onpick
	}: Props = $props();

	const PAGE = 10;
	const VIEWS = [
		['chart', 'Chart'],
		['table', 'Table']
	] as const;
	const SLOT = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
	const KPI_COLS: Record<number, string> = { 3: '@min-[720px]:grid-cols-3', 4: '@min-[720px]:grid-cols-4' };

	const xKey = $derived(typeof x === 'string' && x ? x : undefined);
	const splitKey = $derived(typeof split === 'string' && split ? split : undefined);
	const allRows = $derived(readRows(rows));
	const ms = $derived(readMeasures(measures));
	const headline = $derived(ms[0]);
	const dims = $derived(readDimensions(dimensions));
	const pins = $derived(readFilters(filters));
	const shown = $derived(filterRows(allRows, pins));
	const b = $derived(bucketer(allRows, xKey));
	const keys = $derived(splitKeys(allRows, splitKey));
	const stacked = $derived(keys.length > 1);
	const points = $derived(series(shown, b, headline, stacked && splitKey ? { key: splitKey, keys } : undefined));
	const yTicks = $derived(ticks(Math.max(0, ...points.map((p) => p.total))));
	const top = $derived(yTicks.at(-1) || 1);
	const maxAt = $derived(points.reduce((m, p, i) => (p.total > points[m].total ? i : m), 0));
	const liveKeys = $derived(keys.filter((k) => points.some((p) => (p.parts[k] ?? 0) > 0)));
	const kpiList = $derived(
		kpis(shown, ms, { compare: filterRows(readRows(compare), pins), compareLabel, bucketer: b, currency })
	);
	const breakdownKey = $derived([...dims.map((d) => d.key), ...(splitKey ? [splitKey] : [])].find((k) => !pins[k]));
	const slices = $derived(breakdownKey ? breakdown(shown, breakdownKey, headline) : []);
	const sliceMax = $derived(Math.max(0, ...slices.map((s) => s.value)) || 1);
	const cols = $derived.by<Column[]>(() => {
		const given = (Array.isArray(tableColumns) ? tableColumns : []).filter(
			(c): c is Column => !!c && typeof c === 'object' && typeof (c as Column).key === 'string'
		);
		return given.length ? given : defaultColumns(xKey, dims, splitKey, ms);
	});
	const sums = $derived(totals(shown, cols, ms));
	const scope = $derived(Object.values(pins).join(', '));

	let view = $state<'chart' | 'table'>('chart');
	let active = $state<number | null>(null);
	let showAll = $state(false);
	const listed = $derived(showAll ? shown : shown.slice(0, PAGE));

	const pct = (v: number) => `${Math.max(0, Math.min(100, (v / top) * 100))}%`;
	const money = (v: unknown, compact = false) => fmt(v, headline.format, currency, compact ? 'compact' : 'auto');
	const slotClass = (k: string) => (k === OTHER ? 'bg-ripple-muted-foreground' : (SLOT[keys.indexOf(k)] ?? SLOT[0]));
	const labelled = (i: number) => points.length <= 6 || i === maxAt || i === points.length - 1;
	const tickShown = (i: number) => {
		const step = Math.ceil(points.length / 6);
		return i % step === 0 || i === points.length - 1;
	};
	const readout = (p: SeriesPoint) =>
		[`${p.label}: ${money(p.total)}`, ...(stacked ? liveKeys.map((k) => `${k} ${money(p.parts[k])}`) : [])].join(', ');
	const dimLabel = (key: string) => dims.find((d) => d.key === key)?.label ?? titleCase(key);

	function cell(r: Row, c: Column): string {
		if (c.key === xKey) return dateLabel(r[c.key]);
		const m = measureFor(c.key, ms);
		if (m) return fmt(r[c.key], m.format, currency, 'exact');
		const v = r[c.key];
		return typeof v === 'string' || typeof v === 'number' ? plain(String(v)) : '';
	}
	const sumCell = (c: Column) => (c.key in sums ? fmt(sums[c.key], measureFor(c.key, ms)!.format, currency, 'exact') : '');
	const right = (c: Column) => c.align === 'right' || (c.align === undefined && !!measureFor(c.key, ms));

	function pick(key: string, value: string | undefined) {
		onpick?.(key, value === pins[key] ? undefined : value);
	}
</script>

{#snippet swatch(k: string)}
	<span class={['size-2 shrink-0 rounded-[2px]', slotClass(k)]} aria-hidden="true"></span>
{/snippet}

{#snippet viewToggle()}
	<div role="group" aria-label="View" class="inline-flex rounded-md bg-ripple-muted p-0.5 normal-case">
		{#each VIEWS as [mode, label] (mode)}
			<button
				type="button"
				aria-pressed={view === mode}
				class={[
					'flex items-center gap-1 rounded px-2 py-0.5 text-footnote font-medium tracking-normal transition-colors focus-visible:ring-2 focus-visible:ring-ripple-ring focus-visible:outline-none',
					view === mode ? 'bg-ripple-surface text-ripple-surface-foreground' : 'text-ripple-muted-foreground hover:text-ripple-surface-foreground'
				]}
				onclick={() => (view = mode)}
			>
				{#if mode === 'chart'}<ChartColumnIcon size={12} aria-hidden="true" />{:else}<TableIcon size={12} aria-hidden="true" />{/if}
				{label}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet chartCard()}
	<SectionCard title={`${headline.label} by ${b.unit}`} icon={ChartColumnIcon} aside={viewToggle}>
		{#if view === 'chart'}
			<figure class="m-0" data-slot="chart">
				<div class="flex gap-2">
					<div class="relative h-48 w-11 shrink-0 text-caption-1 tabular-nums text-ripple-muted-foreground" aria-hidden="true">
						<div class="absolute inset-x-0 top-5 bottom-0">
							{#each yTicks as t, i (i)}
								<span class="absolute right-0 translate-y-1/2 leading-none" style={safeStyle(`bottom:${pct(t)}`)}>{money(t, true)}</span>
							{/each}
						</div>
					</div>
					<div class="relative h-48 min-w-0 flex-1">
						<div class="absolute inset-x-0 top-5 bottom-0">
							{#each yTicks as t, i (i)}
								<div class="absolute inset-x-0 h-px bg-ripple-border" style={safeStyle(`bottom:${pct(t)}`)} aria-hidden="true"></div>
							{/each}
							<ol class="absolute inset-0 m-0 flex list-none items-end p-0" aria-label={`${headline.label} by ${b.unit}`}>
								{#each points as p, i (`${p.key}:${i}`)}
									<li class="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
										<button
											type="button"
											class="absolute inset-0 z-[1] rounded-sm focus-visible:ring-2 focus-visible:ring-ripple-ring focus-visible:outline-none"
											aria-label={readout(p)}
											aria-pressed={active === i}
											onclick={() => (active = active === i ? null : i)}
										></button>
										{#if labelled(i) && p.total > 0}
											<span class="mb-1 text-caption-1 leading-none tabular-nums text-ripple-surface-foreground">{money(p.total, true)}</span>
										{/if}
										<div
											class="flex w-[min(24px,60%)] flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px] transition-[height] duration-200 group-hover:brightness-110 motion-reduce:transition-none"
											style={safeStyle(`height:${pct(p.total)}`)}
											data-slot="column"
										>
											{#if stacked}
												{#each keys as k (k)}
													{#if (p.parts[k] ?? 0) > 0}
														<div class={['min-h-0', slotClass(k)]} style={safeStyle(`flex:${p.parts[k]} 1 0`)}></div>
													{/if}
												{/each}
											{:else}
												<div class="flex-1 bg-chart-1"></div>
											{/if}
										</div>
										<div
											aria-hidden="true"
											class={[
												'pointer-events-none absolute bottom-full z-10 mb-1 w-max max-w-56 flex-col gap-1 rounded-md border border-ripple-border bg-ripple-popover px-2.5 py-2 text-ripple-popover-foreground',
												i === 0 ? 'left-0' : i === points.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2',
												active === i ? 'flex' : 'hidden group-focus-within:flex group-hover:flex'
											]}
										>
											<span class="text-footnote text-ripple-muted-foreground">{p.label}</span>
											<span class="text-callout font-semibold tabular-nums">{money(p.total)}</span>
											{#if stacked}
												{#each liveKeys as k (k)}
													<span class="flex items-center gap-1.5 text-footnote tabular-nums">
														<span class={['h-0.5 w-3 rounded-full', slotClass(k)]} aria-hidden="true"></span>
														<span class="text-ripple-muted-foreground">{k}</span>
														<span class="ml-auto pl-2">{money(p.parts[k])}</span>
													</span>
												{/each}
											{/if}
										</div>
									</li>
								{/each}
							</ol>
						</div>
					</div>
				</div>
				<div class="mt-1.5 ml-[3.25rem] flex text-caption-1 text-ripple-muted-foreground" aria-hidden="true">
					{#each points as p, i (`${p.key}:${i}`)}
						<span class="min-w-0 flex-1 truncate text-center">{tickShown(i) ? p.label : ''}</span>
					{/each}
				</div>
				{#if stacked && liveKeys.length > 1}
					<figcaption class="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-footnote text-ripple-muted-foreground">
						{#each liveKeys as k (k)}
							<span class="inline-flex items-center gap-1.5">{@render swatch(k)}{k}</span>
						{/each}
					</figcaption>
				{/if}
			</figure>
		{:else}
			<div class="overflow-x-auto" data-slot="chart-table">
				<table class="w-full text-footnote tabular-nums">
					<thead class="text-ripple-muted-foreground">
						<tr>
							<th class="py-1.5 pr-3 text-left font-medium" scope="col">{titleCase(b.unit)}</th>
							{#if stacked}{#each liveKeys as k (k)}<th class="py-1.5 pl-3 text-right font-medium" scope="col">{k}</th>{/each}{/if}
							<th class="py-1.5 pl-3 text-right font-medium" scope="col">{headline.label}</th>
						</tr>
					</thead>
					<tbody>
						{#each points as p, i (`${p.key}:${i}`)}
							<tr class="border-t border-ripple-border">
								<th class="py-1.5 pr-3 text-left font-normal" scope="row">{p.label}</th>
								{#if stacked}{#each liveKeys as k (k)}<td class="py-1.5 pl-3 text-right">{money(p.parts[k])}</td>{/each}{/if}
								<td class="py-1.5 pl-3 text-right font-medium">{money(p.total)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</SectionCard>
{/snippet}

{#snippet breakdownCard()}
	{@const asFilter = dims.some((d) => d.key === breakdownKey)}
	<SectionCard title={`${headline.label} by ${dimLabel(breakdownKey!).toLowerCase()}`} icon={ChartBarIcon}>
		<ul class="m-0 flex list-none flex-col gap-1 p-0" data-slot="breakdown">
			{#each slices as s, i (`${s.label}:${i}`)}
				{@const entity = breakdownKey === splitKey && stacked}
				<li>
					<button
						type="button"
						class="flex w-full flex-col gap-1 rounded-md px-1.5 py-1 text-left transition-colors enabled:hover:bg-ripple-muted focus-visible:ring-2 focus-visible:ring-ripple-ring focus-visible:outline-none disabled:cursor-default"
						disabled={!asFilter || s.label === OTHER}
						aria-label={asFilter && s.label !== OTHER ? `Show only ${s.label}` : undefined}
						onclick={() => pick(breakdownKey!, s.label)}
					>
						<span class="flex w-full min-w-0 items-center gap-1.5 text-footnote">
							{#if entity}{@render swatch(s.label)}{/if}
							<span class="min-w-0 truncate text-ripple-surface-foreground">{s.label}</span>
							<span class="ml-auto shrink-0 tabular-nums text-ripple-surface-foreground">{money(s.value)}</span>
							{#if s.share > 0}<span class="w-9 shrink-0 text-right tabular-nums text-ripple-muted-foreground">{Math.round(s.share * 100)}%</span>{/if}
						</span>
						<span class="block h-2 w-full" aria-hidden="true">
							<span
								class={['block h-full rounded-r-[4px]', entity ? slotClass(s.label) : 'bg-chart-1']}
								style={safeStyle(`width:${Math.max(0, (s.value / sliceMax) * 100)}%`)}
							></span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</SectionCard>
{/snippet}

{#snippet tableCard()}
	<SectionCard title={plain(tableTitle) || 'Rows'} icon={Rows3Icon}>
		{#snippet aside()}
			<span class="text-footnote tabular-nums normal-case tracking-normal">{shown.length}{scope ? ` in ${scope}` : ''}</span>
		{/snippet}
		{#if shown.length === 0}
			<p class="text-callout text-ripple-muted-foreground">No rows match this filter.</p>
		{:else}
			<!-- Wide: a real table with a totals footer. Narrow: label-value rows. -->
			<div class="hidden overflow-x-auto @min-[560px]:block" data-slot="table">
				<table class="w-full text-footnote">
					<thead class="text-ripple-muted-foreground">
						<tr>
							{#each cols as c, i (`${c.key}:${i}`)}
								<th scope="col" class={['py-1.5 font-medium whitespace-nowrap', i ? 'pl-3' : 'pr-3', right(c) ? 'text-right' : 'text-left']}>{plain(c.label)}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each listed as r, ri (`${r.id ?? ''}:${ri}`)}
							<tr class="border-t border-ripple-border">
								{#each cols as c, i (`${c.key}:${i}`)}
									<td class={['py-1.5 whitespace-nowrap', i ? 'pl-3' : 'pr-3', right(c) ? 'text-right tabular-nums' : 'text-left']}>{cell(r, c)}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
					{#if Object.keys(sums).length}
						<tfoot>
							<tr class="border-t-2 border-ripple-border font-semibold" data-slot="totals">
								{#each cols as c, i (`${c.key}:${i}`)}
									<td class={['py-2 whitespace-nowrap', i ? 'pl-3' : 'pr-3', right(c) ? 'text-right tabular-nums' : 'text-left']}>
										{i === 0 ? `Total${scope ? ` (${scope})` : ''}` : sumCell(c)}
									</td>
								{/each}
							</tr>
						</tfoot>
					{/if}
				</table>
			</div>
			<ul class="m-0 flex list-none flex-col gap-2 p-0 @min-[560px]:hidden" data-slot="table-rows">
				{#each listed as r, ri (`${r.id ?? ''}:${ri}`)}
					<li class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md bg-ripple-muted px-2.5 py-2 text-footnote">
						{#each cols as c, i (`${c.key}:${i}`)}
							<span class="text-ripple-muted-foreground">{plain(c.label)}</span>
							<span class={['min-w-0 truncate text-right', right(c) && 'tabular-nums']}>{cell(r, c)}</span>
						{/each}
					</li>
				{/each}
				{#if Object.keys(sums).length}
					<li class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md border border-ripple-border px-2.5 py-2 text-footnote font-semibold">
						<span class="col-span-2">Total{scope ? ` (${scope})` : ''}</span>
						{#each cols.filter((c) => c.key in sums) as c, i (`${c.key}:${i}`)}
							<span class="font-normal text-ripple-muted-foreground">{plain(c.label)}</span>
							<span class="text-right tabular-nums">{sumCell(c)}</span>
						{/each}
					</li>
				{/if}
			</ul>
			{#if shown.length > PAGE}
				<button
					type="button"
					class="mt-2 rounded-md px-2 py-1 text-footnote font-medium text-ripple-surface-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ripple-ring focus-visible:outline-none"
					onclick={() => (showAll = !showAll)}
				>
					{showAll ? 'Show fewer' : `Show all ${shown.length}`}
				</button>
			{/if}
		{/if}
	</SectionCard>
{/snippet}

<div class="@container flex w-full flex-col gap-3 text-ripple-surface-foreground" data-mode="rows">
	{#if plain(title) || plain(subtitle)}
		<header class="min-w-0">
			{#if plain(title)}<h2 class="text-title-3 font-semibold text-balance">{plain(title)}</h2>{/if}
			{#if plain(subtitle)}<p class="mt-0.5 text-callout text-pretty text-ripple-muted-foreground">{plain(subtitle)}</p>{/if}
		</header>
	{/if}

	<VerdictLine {verdict} />

	{#each dims as d, di (`${d.key}:${di}`)}
		{@const values = distinct(allRows, d.key)}
		{#if values.length > 1}
			<div role="group" aria-label={`Filter by ${d.label}`} class="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5" data-slot="filter">
				<span class="shrink-0 pr-1 text-footnote text-ripple-muted-foreground">{d.label}</span>
				{#each [undefined, ...values] as v, i (`${v ?? ''}:${i}`)}
					{@const on = v === undefined ? !pins[d.key] : pins[d.key] === v}
					<button
						type="button"
						aria-pressed={on}
						class={[
							'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-footnote transition-colors focus-visible:ring-2 focus-visible:ring-ripple-ring focus-visible:outline-none',
							on
								? 'border-ripple-accent bg-ripple-accent/8 text-ripple-surface-foreground'
								: 'border-ripple-border text-ripple-muted-foreground hover:text-ripple-surface-foreground'
						]}
						onclick={() => pick(d.key, v)}
					>
						{#if v !== undefined && d.key === splitKey && stacked}{@render swatch(keys.includes(v) ? v : OTHER)}{/if}
						{v ?? 'All'}
					</button>
				{/each}
			</div>
		{/if}
	{/each}

	{#if allRows.length === 0}
		<SectionCard empty="No rows yet. Ask for the records to summarise." />
	{:else}
		{@const hasChart = points.length > 0}
		{@const hasBreakdown = slices.length > 1}
		{@const tableBeside = hasChart && !hasBreakdown && shown.length <= 6}
		<div class={['grid grid-cols-1 gap-2 @min-[360px]:grid-cols-2', KPI_COLS[Math.min(kpiList.length, 4)]]} data-slot="kpis">
			{#each kpiList as k, i (`${k.label}:${i}`)}
				<StatChip label={k.label} value={k.shown} trend={k.trend} />
			{/each}
		</div>

		{#if hasChart || hasBreakdown}
			<div class={['grid grid-cols-1 gap-3', hasChart && (hasBreakdown || tableBeside) && '@min-[720px]:grid-cols-[3fr_2fr]']}>
				{#if hasChart}{@render chartCard()}{/if}
				{#if hasBreakdown}{@render breakdownCard()}{:else if tableBeside}{@render tableCard()}{/if}
			</div>
		{/if}
		{#if !tableBeside}{@render tableCard()}{/if}
	{/if}
</div>
