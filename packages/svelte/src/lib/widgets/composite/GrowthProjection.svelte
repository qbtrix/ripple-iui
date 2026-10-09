<!--
  widgets/composite/GrowthProjection.svelte — "save $300 a month at 5% for 10
  years, show me how it grows" (design doc 2026-10-09 §3.7). The model writes
  four numbers; the widget computes the schedule and draws it: the final
  balance up front, a stacked area chart (deposits under growth) with a
  crosshair readout, a yearly table, and sliders that retune the projection.

  Math (project(), unit-tested against closed forms): deposits land at the end
  of each month. `monthly` compounds every month. `yearly` accrues simple
  interest monthly and credits it at each year end, so a year's deposits are
  worth 12·D + 5.5·r·D at year end. Years round to whole months.

  Invariants:
  - `deposit` is the bound field (bind contract `deposit` / `ondepositchange`);
    `rate` and `years` are $bindable for Svelte parents and also emit
    `onratechange` / `onyearschange`. An edit emits a plain number.
  - A drag or a half-typed number lives in `draft`; the prop changes only on
    commit (`change`), so a slider's `max` never moves under the thumb.
  - Inputs clamp (negatives to 0, rate and inflation to 100%, years to 100)
    and the widget says what it clamped. `rate` is percent: 5 means 5%.
  - The chart is inline SVG on ripple tokens (viewBox 0..100, non-scaling
    strokes) with HTML labels, so it server-renders and themes for free. No
    generated ids in the markup (stream parity compares it).
-->
<script module lang="ts">
	import { finite } from '../data-kit/index.js';

	export type Compounding = 'monthly' | 'yearly';
	export interface YearRow {
		/** Years from now; the last row can be fractional (18 months is 1.5). */
		year: number;
		/** Everything put in so far, the starting amount included. */
		deposited: number;
		growth: number;
		balance: number;
	}
	export type ClampField = 'initial' | 'deposit' | 'rate' | 'years' | 'inflation';
	export interface Clamp {
		field: ClampField;
		from: number;
		to: number;
	}

	export const MAX_RATE = 100;
	export const MAX_YEARS = 100;

	/** Finite inputs held to sane ranges, plus the list of what was changed. */
	export function clampInputs(raw: Partial<Record<ClampField, unknown>>) {
		const clamped: Clamp[] = [];
		const fit = (field: ClampField, lo: number, hi: number, under = lo) => {
			const n = finite(raw[field]);
			if (n === undefined) return undefined;
			const to = n < lo ? under : n > hi ? hi : n;
			if (to !== n) clamped.push({ field, from: n, to });
			return to;
		};
		return {
			initial: fit('initial', 0, Infinity),
			deposit: fit('deposit', 0, Infinity),
			rate: fit('rate', 0, MAX_RATE),
			years: fit('years', 1 / 12, MAX_YEARS, 1),
			inflation: fit('inflation', 0, MAX_RATE),
			clamped
		};
	}

	/** Year-by-year schedule, starting with year 0 (the starting amount). */
	export function project(
		{ initial = 0, deposit = 0, rate, years }: { initial?: number; deposit?: number; rate: number; years: number },
		compounding: Compounding = 'monthly'
	): YearRow[] {
		const months = Math.max(1, Math.round(years * 12));
		const r = rate / 100 / 12;
		let balance = initial;
		let put = initial;
		let accrued = 0;
		const rows: YearRow[] = [{ year: 0, deposited: initial, growth: 0, balance: initial }];
		for (let m = 1; m <= months; m++) {
			const close = m % 12 === 0 || m === months;
			if (compounding === 'yearly') {
				accrued += balance * r;
				if (close) {
					balance += accrued;
					accrued = 0;
				}
			} else balance += balance * r;
			balance += deposit;
			put += deposit;
			if (close) rows.push({ year: m / 12, deposited: put, growth: balance - put, balance });
		}
		return rows;
	}

	/** Smallest step × 10^k at or above v (1, 2, 2.5, 5, 10 by default). */
	export function niceCeil(v: number, steps: readonly number[] = [1, 2, 2.5, 5, 10]): number {
		if (!(v > 0) || !Number.isFinite(v)) return 1;
		const p = 10 ** Math.floor(Math.log10(v));
		return (steps.find((s) => s * p >= v * (1 - 1e-9)) ?? 10) * p;
	}

	/** First year the balance reaches the goal, else undefined. */
	export function goalYear(rows: readonly YearRow[], goal: number | undefined): number | undefined {
		return goal === undefined ? undefined : rows.find((r) => r.balance >= goal)?.year;
	}

	const SLIDER_STEPS = [1, 2, 3, 5, 10];
	/** A slider ceiling with room above the value; grows only after a commit. */
	export function roomy(v: number | undefined, floor: number, cap = Infinity): number {
		return Math.min(cap, niceCeil(Math.max((v ?? 0) * 1.25, floor), SLIDER_STEPS));
	}
</script>

<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import TableIcon from '@lucide/svelte/icons/table-2';
	import { StatusPill, VerdictLine, num, plain } from '../data-kit/index.js';
	import type { Verdict } from '../data-kit/types.js';

	type Field = 'deposit' | 'rate' | 'years';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		subtitle?: string;
		verdict?: Verdict;
		/** ISO 4217, default USD. */
		currency?: string;
		/** Starting balance. */
		initial?: number;
		/** Added at the end of every month. Two-way bindable. */
		deposit?: number;
		/** Percent a year: 5 means 5%. Bindable. */
		rate?: number;
		/** Bindable. Fractions round to whole months. */
		years?: number;
		compounding?: Compounding | 'annual' | 'annually';
		/** Target balance: a goal line and the year it is reached. */
		goal?: number;
		/** Percent a year; adds the final balance in today's money. */
		inflation?: number;
		ondepositchange?: (deposit: number) => void;
		onratechange?: (rate: number) => void;
		onyearschange?: (years: number) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		subtitle,
		verdict,
		currency = 'USD',
		initial,
		deposit = $bindable(),
		rate = $bindable(),
		years = $bindable(),
		compounding,
		goal,
		inflation,
		ondepositchange,
		onratechange,
		onyearschange
	}: Props = $props();

	const uid = $props.id();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);
	const heading = $derived(plain(title));
	const sub = $derived(plain(subtitle));
	const code = $derived(typeof currency === 'string' && /^[a-z]{3}$/i.test(currency.trim()) ? currency.trim().toUpperCase() : 'USD');

	/** Whole units for a projection (cents are noise); compact for axis ticks. */
	function cash(v: number, compact = false): string {
		const o: Intl.NumberFormatOptions = {
			style: 'currency',
			minimumFractionDigits: 0,
			maximumFractionDigits: compact ? 1 : 0,
			...(compact && { notation: 'compact' as const })
		};
		try {
			return new Intl.NumberFormat(undefined, { ...o, currency: code }).format(v);
		} catch {
			return new Intl.NumberFormat(undefined, { ...o, currency: 'USD' }).format(v);
		}
	}
	const symbol = $derived.by(() => {
		try {
			return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? code;
		} catch {
			return '$';
		}
	});

	// A drag or a half-typed number; the bound prop changes only on commit.
	let draft = $state<{ key: Field; value: number } | null>(null);
	const pick = (key: Field, v: unknown) => (draft?.key === key ? draft.value : v);

	const inp = $derived(clampInputs({ initial, inflation, deposit: pick('deposit', deposit), rate: pick('rate', rate), years: pick('years', years) }));
	const committed = $derived(clampInputs({ deposit, rate, years }));
	const mode: Compounding = $derived(compounding === 'yearly' || compounding === 'annual' || compounding === 'annually' ? 'yearly' : 'monthly');

	const missing = $derived(
		[
			inp.deposit === undefined && inp.initial === undefined && 'deposit',
			inp.rate === undefined && 'rate',
			inp.years === undefined && 'years'
		].filter(Boolean) as string[]
	);
	const rows = $derived(
		missing.length ? [] : project({ initial: inp.initial, deposit: inp.deposit, rate: inp.rate!, years: inp.years! }, mode)
	);
	const final = $derived(rows.at(-1));
	const span = $derived(final?.year || 1);

	const goalAmt = $derived.by(() => {
		const g = finite(goal);
		return g !== undefined && g > 0 ? g : undefined;
	});
	const reached = $derived(goalYear(rows, goalAmt));
	const real = $derived(final && inp.inflation ? final.balance / (1 + inp.inflation / 100) ** final.year : undefined);

	const WORD: Record<ClampField, string> = { initial: 'Starting amount', deposit: 'Deposit', rate: 'Rate', years: 'Years', inflation: 'Inflation' };
	const show = (field: ClampField, v: number) => (field === 'rate' || field === 'inflation' ? `${num(v)}%` : field === 'years' ? num(v) : cash(v));
	const clampNote = $derived(inp.clamped.map((c) => `${WORD[c.field]} ${show(c.field, c.from)} → ${show(c.field, c.to)}`).join(', '));

	const yearWord = (y: number) => `${num(y, { digits: 1 })} ${y === 1 ? 'year' : 'years'}`;
	const yearLabel = (y: number) => (y === 0 ? 'Start' : `Year ${num(y, { digits: 1 })}`);

	// Chart geometry: x in % of the horizon, y in % from the top.
	const top = $derived(Math.max(final?.balance ?? 0, goalAmt ?? 0) * 1.08 || 1);
	const X = (year: number) => (year / span) * 100;
	const Y = (v: number) => 100 - (v / top) * 100;
	const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('');
	const depPts = $derived(rows.map((r): [number, number] => [X(r.year), Y(r.deposited)]));
	const balPts = $derived(rows.map((r): [number, number] => [X(r.year), Y(r.balance)]));
	const depLine = $derived(line(depPts));
	const balLine = $derived(line(balPts));
	const depArea = $derived(`${depLine}L100 100L0 100Z`);
	const growArea = $derived(`${balLine}${line([...depPts].reverse()).replace(/^M/, 'L')}Z`);

	const yTicks = $derived.by(() => {
		const step = niceCeil(top / 4);
		const out: number[] = [];
		for (let t = 0; t <= top; t += step) out.push(t);
		return out;
	});
	const goalY = $derived(goalAmt === undefined ? undefined : Y(goalAmt));
	const tickLabels = $derived(yTicks.filter((t) => goalY === undefined || Math.abs(Y(t) - goalY) > 9));

	const xTicks = $derived.by(() => {
		const s = [1, 2, 5, 10, 20, 25, 50].find((s) => span / s <= 5) ?? 50;
		const out: number[] = [];
		for (let t = 0; t <= span + 1e-9; t += s) out.push(t);
		const last = out[out.length - 1];
		if (last < span - 1e-9) {
			if (span - last >= s * 0.6 || out.length === 1) out.push(span);
			else out[out.length - 1] = span;
		}
		return out;
	});
	const xLabel = (t: number) => (t === 0 ? 'Now' : t === span ? `${num(t, { digits: 1 })} ${t === 1 ? 'yr' : 'yrs'}` : num(t, { digits: 1 }));

	/** Direct labels at the right end, only where the band is tall enough to hold one. */
	const ends = $derived.by(() => {
		if (!final) return [];
		const dep = final.deposited;
		const grow = final.balance - dep;
		return [
			...(dep / top >= 0.14 ? [{ key: 'dep', label: 'Deposits', value: dep, y: Y(dep / 2) }] : []),
			...(grow / top >= 0.14 ? [{ key: 'grow', label: 'Growth', value: grow, y: Y(dep + grow / 2) }] : [])
		];
	});

	// Crosshair: the pointer or the arrow keys pick a row.
	let hover = $state<number | null>(null);
	const active = $derived(hover === null || !rows.length ? null : Math.min(hover, rows.length - 1));
	const cursor = $derived(active ?? Math.max(rows.length - 1, 0));
	const point = $derived(rows[cursor]);
	const pointText = $derived(
		point
			? `${yearLabel(point.year)}: balance ${cash(point.balance)}, deposits ${cash(point.deposited)}, growth ${cash(point.growth)}`
			: ''
	);

	function scrub(e: PointerEvent & { currentTarget: HTMLElement }) {
		const box = e.currentTarget.getBoundingClientRect();
		if (!box.width || !rows.length) return;
		const at = ((e.clientX - box.left) / box.width) * span;
		let best = 0;
		for (let i = 1; i < rows.length; i++) if (Math.abs(rows[i].year - at) < Math.abs(rows[best].year - at)) best = i;
		hover = best;
	}

	function keys(e: KeyboardEvent) {
		const last = rows.length - 1;
		const step: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
		if (e.key in step) hover = Math.min(Math.max(cursor + step[e.key], 0), last);
		else if (e.key === 'Home') hover = 0;
		else if (e.key === 'End') hover = last;
		else return;
		e.preventDefault();
	}

	// Inputs: input events move the draft, change commits a clamped number.
	function onDraft(key: Field, e: Event & { currentTarget: HTMLInputElement }) {
		const v = e.currentTarget.valueAsNumber;
		if (Number.isFinite(v)) draft = { key, value: v };
	}

	function onCommit(key: Field, e: Event & { currentTarget: HTMLInputElement }) {
		const v = clampInputs({ [key]: e.currentTarget.valueAsNumber })[key];
		draft = null;
		if (v === undefined) {
			e.currentTarget.value = String(committed[key] ?? '');
			return;
		}
		if (key === 'deposit') {
			deposit = v;
			ondepositchange?.(v);
		} else if (key === 'rate') {
			rate = v;
			onratechange?.(v);
		} else {
			years = v;
			onyearschange?.(v);
		}
	}

	const controls = $derived([
		{
			key: 'deposit' as const,
			label: 'Monthly deposit',
			value: inp.deposit ?? 0,
			max: roomy(committed.deposit, 1000),
			cap: undefined,
			prefix: symbol,
			suffix: '',
			text: `${cash(inp.deposit ?? 0)} a month`
		},
		{
			key: 'rate' as const,
			label: 'Interest rate',
			value: inp.rate ?? 0,
			max: roomy(committed.rate, 10, MAX_RATE),
			cap: MAX_RATE,
			prefix: '',
			suffix: '% a year',
			text: `${num(inp.rate ?? 0)}% a year`
		},
		{
			key: 'years' as const,
			label: 'Years',
			value: inp.years ?? 1,
			max: roomy(committed.years, 30, MAX_YEARS),
			cap: MAX_YEARS,
			prefix: '',
			suffix: 'yrs',
			text: yearWord(inp.years ?? 1)
		}
	]);

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const caption = 'text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase';
	const key = 'inline-block h-0.5 w-3 shrink-0 rounded-full';
</script>

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="growth-projection">
	<div class="flex flex-col gap-3">
		{#if heading || sub}
			<header class="flex min-w-0 flex-col gap-0.5">
				{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}
				{#if sub}<p class="text-callout text-ripple-muted-foreground">{sub}</p>{/if}
			</header>
		{/if}

		<VerdictLine {verdict} />

		{#if final}
			<div class="grid items-start gap-3 @min-[720px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @min-[720px]:gap-x-5">
				<div class="flex min-w-0 flex-col gap-1" data-slot="hero">
					<p class={caption}>Balance after {yearWord(final.year)}</p>
					<p class="text-title-2 font-semibold [overflow-wrap:anywhere]" data-slot="final">{cash(final.balance)}</p>
					<p class="text-callout text-ripple-muted-foreground">
						You put in {cash(final.deposited)}{#if inp.initial && inp.deposit}{` (${cash(inp.initial)} up front)`}{/if}; growth adds {cash(final.growth)}.
					</p>
					{#if real !== undefined}
						<p class="text-footnote text-ripple-muted-foreground">About {cash(real)} in today's money at {num(inp.inflation)}% inflation.</p>
					{/if}
					{#if goalAmt !== undefined}
						<StatusPill
							class="mt-1 self-start"
							status={reached !== undefined ? 'good' : 'warn'}
							label={reached === 0
								? `Goal of ${cash(goalAmt)} already met`
								: reached !== undefined
									? `${cash(goalAmt)} goal reached in year ${num(reached, { digits: 1 })}`
									: `${cash(goalAmt - final.balance)} short of the ${cash(goalAmt)} goal`}
						/>
					{/if}
					{#if clampNote}
						<p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-footnote text-ripple-muted-foreground" data-slot="clamped">
							<StatusPill status="warn" label="Adjusted" />
							<span>{clampNote}</span>
						</p>
					{/if}
				</div>

				<figure class="m-0 flex min-w-0 flex-col gap-2 @min-[720px]:col-start-2 @min-[720px]:row-span-2 @min-[720px]:row-start-1" data-slot="chart">
					<ul class="flex flex-wrap gap-x-4 gap-y-1 text-footnote" aria-label="Legend">
						<li class="flex items-center gap-1.5">
							<span class="size-2.5 rounded-[3px] bg-ripple-muted-foreground" aria-hidden="true"></span>
							<span class="text-ripple-muted-foreground">Deposits</span>
							<span class="font-medium tabular-nums">{cash(final.deposited)}</span>
						</li>
						<li class="flex items-center gap-1.5">
							<span class="size-2.5 rounded-[3px] bg-ripple-accent" aria-hidden="true"></span>
							<span class="text-ripple-muted-foreground">Growth</span>
							<span class="font-medium tabular-nums">{cash(final.growth)}</span>
						</li>
						{#if goalAmt !== undefined}
							<li class="flex items-center gap-1.5">
								<span class="w-3 shrink-0 border-t border-dashed border-ripple-surface-foreground" aria-hidden="true"></span>
								<span class="text-ripple-muted-foreground">Goal</span>
								<span class="font-medium tabular-nums">{cash(goalAmt)}</span>
							</li>
						{/if}
					</ul>

					<div
						class={['relative h-44 cursor-crosshair touch-pan-y rounded-sm select-none @min-[560px]:h-52 @min-[720px]:h-56', focusRing]}
						role="slider"
						tabindex="0"
						aria-label="Balance by year. Arrow keys step through the years."
						aria-valuemin={0}
						aria-valuemax={Math.max(rows.length - 1, 0)}
						aria-valuenow={cursor}
						aria-valuetext={pointText}
						data-slot="plot"
						onpointermove={scrub}
						onpointerdown={scrub}
						onpointerleave={() => (hover = null)}
						onkeydown={keys}
						onblur={() => (hover = null)}
					>
						<svg class="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
							{#each yTicks as t (t)}
								<line x1="0" x2="100" y1={Y(t)} y2={Y(t)} class="stroke-ripple-border" stroke-width="1" vector-effect="non-scaling-stroke" />
							{/each}
							<path d={depArea} class="fill-ripple-muted-foreground" fill-opacity="0.16" data-series="deposits" />
							<path d={growArea} class="fill-ripple-accent" fill-opacity="0.2" data-series="growth" />
							<path d={depLine} fill="none" class="stroke-ripple-muted-foreground" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
							<path d={balLine} fill="none" class="stroke-ripple-accent" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
							{#if goalY !== undefined}
								<line x1="0" x2="100" y1={goalY} y2={goalY} class="stroke-ripple-surface-foreground" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" data-slot="goal" />
							{/if}
							{#if active !== null}
								<line x1={X(rows[active].year)} x2={X(rows[active].year)} y1="0" y2="100" class="stroke-ripple-surface-foreground" stroke-opacity="0.35" stroke-width="1" vector-effect="non-scaling-stroke" />
							{/if}
						</svg>

						{#each tickLabels as t (t)}
							<span class="pointer-events-none absolute left-0 -translate-y-full pb-0.5 text-footnote text-ripple-muted-foreground tabular-nums" style:top="{Y(t)}%" aria-hidden="true">{cash(t, true)}</span>
						{/each}
						{#if goalY !== undefined && goalAmt !== undefined}
							<span class="pointer-events-none absolute left-0 -translate-y-full pb-0.5 text-footnote font-medium" style:top="{goalY}%" aria-hidden="true">
								Goal {cash(goalAmt, true)}{reached !== undefined && reached > 0 ? ` · year ${num(reached, { digits: 1 })}` : ''}
							</span>
							{#if reached !== undefined}
								<span class="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full bg-ripple-accent ring-2 ring-ripple-surface" style:left="{X(reached)}%" style:top="{Y(rows.find((r) => r.year === reached)?.balance ?? 0)}%" aria-hidden="true"></span>
							{/if}
						{/if}
						{#if active === null}
							{#each ends as e (e.key)}
								<span class="pointer-events-none absolute right-1.5 -translate-y-1/2 text-footnote font-medium whitespace-nowrap" style:top="{e.y}%" aria-hidden="true" data-end={e.key}>
									{e.label} <span class="tabular-nums">{cash(e.value, true)}</span>
								</span>
							{/each}
						{:else}
							{@const r = rows[active]}
							{@const flip = X(r.year) > 55}
							<span class="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full bg-ripple-muted-foreground ring-2 ring-ripple-surface" style:left="{X(r.year)}%" style:top="{Y(r.deposited)}%" aria-hidden="true"></span>
							<span class="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full bg-ripple-accent ring-2 ring-ripple-surface" style:left="{X(r.year)}%" style:top="{Y(r.balance)}%" aria-hidden="true"></span>
							<div
								class={[
									'pointer-events-none absolute top-1 z-10 grid grid-cols-[auto_auto] items-center gap-x-2 gap-y-0.5 rounded-md border border-ripple-border bg-ripple-popover px-2.5 py-2 text-footnote whitespace-nowrap text-ripple-popover-foreground',
									flip ? '-translate-x-full -ml-2' : 'ml-2'
								]}
								style:left="{X(r.year)}%"
								aria-hidden="true"
								data-slot="tooltip"
							>
								<span class="col-span-2 text-ripple-muted-foreground">{yearLabel(r.year)}</span>
								<span class="text-headline font-semibold tabular-nums">{cash(r.balance)}</span>
								<span class="text-ripple-muted-foreground">Balance</span>
								<span class="font-medium tabular-nums">{cash(r.growth)}</span>
								<span class="flex items-center gap-1.5 text-ripple-muted-foreground"><span class={[key, 'bg-ripple-accent']}></span>Growth</span>
								<span class="font-medium tabular-nums">{cash(r.deposited)}</span>
								<span class="flex items-center gap-1.5 text-ripple-muted-foreground"><span class={[key, 'bg-ripple-muted-foreground']}></span>Deposits</span>
							</div>
						{/if}
					</div>

					<div class="relative h-4" aria-hidden="true">
						{#each xTicks as t, i (i)}
							<span
								class={[
									'absolute top-0 text-footnote whitespace-nowrap text-ripple-muted-foreground tabular-nums',
									i === xTicks.length - 1 ? '-translate-x-full' : i > 0 && '-translate-x-1/2'
								]}
								style:left="{X(t)}%">{xLabel(t)}</span
							>
						{/each}
					</div>

					<figcaption class="text-footnote text-ripple-muted-foreground">
						{num(inp.rate)}% a year, compounded {mode === 'yearly' ? 'yearly' : 'monthly'}; deposits at the end of each month.
					</figcaption>

					<details class="group rounded-ripple border border-ripple-border bg-ripple-surface" data-slot="table">
						<summary class={['flex cursor-pointer list-none items-center gap-1.5 rounded-ripple px-3 py-2 text-callout font-medium [&::-webkit-details-marker]:hidden', focusRing]}>
							<TableIcon size={14} strokeWidth={1.75} aria-hidden="true" class="text-ripple-muted-foreground" />Yearly table
							<ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" class="ml-auto text-ripple-muted-foreground transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
						</summary>
						<div class="max-h-72 overflow-auto border-t border-ripple-border">
							<table class="w-full text-callout tabular-nums">
								<caption class="sr-only">Deposits, growth and balance by year</caption>
								<thead class="sticky top-0 bg-ripple-surface text-footnote text-ripple-muted-foreground">
									<tr class="border-b border-ripple-border">
										<th scope="col" class="px-3 py-1.5 text-left font-medium">Year</th>
										<th scope="col" class="px-3 py-1.5 text-right font-medium">Deposits</th>
										<th scope="col" class="px-3 py-1.5 text-right font-medium">Growth</th>
										<th scope="col" class="px-3 py-1.5 text-right font-medium">Balance</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-ripple-border">
									{#each rows as r (r.year)}
										<tr class={[reached !== undefined && r.year === reached && 'bg-ripple-muted']}>
											<th scope="row" class="px-3 py-1.5 text-left font-normal text-ripple-muted-foreground">{yearLabel(r.year)}</th>
											<td class="px-3 py-1.5 text-right">{cash(r.deposited)}</td>
											<td class="px-3 py-1.5 text-right">{cash(r.growth)}</td>
											<td class="px-3 py-1.5 text-right font-medium">{cash(r.balance)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</details>
				</figure>

				<section class="flex min-w-0 flex-col gap-3 rounded-ripple border border-ripple-border bg-ripple-surface p-3" aria-label="Try other numbers" data-slot="inputs">
					<h3 class={caption}>Try other numbers</h3>
					{#each controls as c (c.key)}
						<div class="flex flex-col gap-1.5" data-control={c.key}>
							<div class="flex items-center justify-between gap-2">
								<label for="{uid}-{c.key}" class="text-callout">{c.label}</label>
								<div class="flex h-8 items-center gap-1 rounded-md border border-ripple-border bg-ripple-input px-2 text-callout text-ripple-input-foreground focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ripple-ring">
									{#if c.prefix}<span class="text-ripple-muted-foreground" aria-hidden="true">{c.prefix}</span>{/if}
									<input
										id="{uid}-{c.key}"
										type="number"
										inputmode="decimal"
										min={c.key === 'years' ? 1 : 0}
										max={c.cap}
										step="any"
										value={c.value}
										class="w-16 bg-transparent text-right tabular-nums outline-none"
										oninput={(e) => onDraft(c.key, e)}
										onchange={(e) => onCommit(c.key, e)}
									/>
									{#if c.suffix}<span class="text-footnote text-ripple-muted-foreground" aria-hidden="true">{c.suffix}</span>{/if}
								</div>
							</div>
							<input
								type="range"
								min={c.key === 'years' ? 1 : 0}
								max={c.max}
								step={c.key === 'years' ? 1 : c.key === 'rate' ? 0.1 : c.max / 100}
								value={c.value}
								aria-label={c.label}
								aria-valuetext={c.text}
								class={['h-5 w-full cursor-pointer accent-ripple-accent', focusRing]}
								oninput={(e) => onDraft(c.key, e)}
								onchange={(e) => onCommit(c.key, e)}
							/>
						</div>
					{/each}
				</section>
			</div>
		{:else}
			<div class="flex flex-col gap-3" aria-busy="true" data-slot="pending">
				<div class="h-7 w-40 rounded bg-ripple-muted"></div>
				<div class="h-44 rounded-ripple bg-ripple-muted"></div>
				<p class="text-callout text-ripple-muted-foreground">Waiting for the {missing.join(', ')}. Ask for a savings projection.</p>
			</div>
		{/if}
	</div>
</div>
