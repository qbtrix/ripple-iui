<!--
  widgets/composite/Itinerary.svelte — a day-by-day trip plan you can tick off
  and add to (design doc 2026-10-09 §3.5). The model fills plain data (route,
  budget, days of stops, legs, packing); the widget does the design: a route
  strip, planned spend against budget, collapsible day cards with a time rail
  whose dots carry the stop's kind icon, transport legs and packing paired by
  the section rule.

  Invariants:
  - `days` is the one bound field (bind contract `days` / `ondayschange`).
    Ticking or adding a stop builds a NEW days array, assigns the $bindable
    and calls ondayschange; nothing mutates the prop in place.
  - Rows key by `${id ?? ''}:${index}`, never by a model string; a stop with
    no title (mid-stream, junk) is skipped but keeps its index for edits.
  - Nothing parses a date or time for display. `when` goes through dateLabel,
    `time` renders as written; HH:MM is read only to place an added stop.
  - The route strip is the static fallback the route globe (GL-2) replaces;
    `geo` is accepted and unused until then.
-->
<script module lang="ts">
	import type { StopKind, LegKind } from '../data-kit/icons.js';

	export interface ItineraryStop {
		id?: string;
		time?: string;
		title: string;
		kind?: StopKind;
		place?: string;
		cost?: number;
		minutes?: number;
		must?: boolean;
		done?: boolean;
		image?: string;
		geo?: [number, number];
	}
	export interface ItineraryDay {
		id?: string;
		label?: string;
		when?: string;
		theme?: string;
		stay?: string;
		stops?: ItineraryStop[];
	}
	export interface ItineraryLeg {
		id?: string;
		from: string;
		to: string;
		kind?: LegKind;
		ref?: string;
		minutes?: number;
		cost?: number;
	}
	export interface PackingGroup {
		id?: string;
		group: string;
		items: string[];
	}

	const HHMM = /^(\d{1,2}):(\d{2})$/;

	/** Minutes past midnight for an `HH:MM` time, else undefined ("Morning", "8 AM"). */
	export function clockMinutes(t: unknown): number | undefined {
		const m = typeof t === 'string' ? HHMM.exec(t.trim()) : null;
		return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
	}

	/** Insert before the first stop timed later than this one; untimed on either side appends. */
	export function insertByTime<T>(stops: readonly T[], stop: ItineraryStop): (T | ItineraryStop)[] {
		const t = clockMinutes(stop.time);
		const at = t === undefined ? -1 : stops.findIndex((s) => (clockMinutes(rec(s).time) ?? -1) > t);
		return at < 0 ? [...stops, stop] : [...stops.slice(0, at), stop, ...stops.slice(at)];
	}

	/** "1h 30m", "45m", "2h"; nothing for a missing or non-positive value. */
	export function duration(minutes: number | undefined): string {
		if (minutes === undefined || minutes <= 0) return '';
		const h = Math.floor(minutes / 60);
		const m = Math.round(minutes % 60);
		return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
	}

	/** Planned spend against budget: warn past 90%, bad over; neutral without a budget. */
	export function budgetStatus(planned: number, budget: number | undefined): 'good' | 'warn' | 'bad' | 'neutral' {
		if (!budget || budget <= 0) return 'neutral';
		const r = planned / budget;
		return r > 1 ? 'bad' : r > 0.9 ? 'warn' : 'good';
	}

	function rec(v: unknown): Record<string, unknown> {
		return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
	}
</script>

<script lang="ts">
	import { safeStyle, safeUrl } from '@ripple-ui/core';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Star from '@lucide/svelte/icons/star';
	import Plus from '@lucide/svelte/icons/plus';
	import BedDouble from '@lucide/svelte/icons/bed-double';
	import RouteIcon from '@lucide/svelte/icons/route';
	import Luggage from '@lucide/svelte/icons/luggage';
	import { safeArray } from '$lib/utils/safe-props.js';
	import {
		PhotoTile,
		SectionCard,
		SectionGrid,
		StatusPill,
		VerdictLine,
		STOP_ICONS,
		LEG_ICONS,
		STATUS_CLASS,
		MAX_HALF_ROWS,
		kindIcon,
		finite,
		money,
		plain,
		sum,
		dateLabel,
		rise
	} from '../data-kit/index.js';
	import type { Verdict } from '../data-kit/types.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		subtitle?: string;
		verdict?: Verdict;
		/** ISO 4217, default USD. */
		currency?: string;
		budget?: number;
		/** City names in order; derived from `legs` when absent. */
		route?: string[];
		/** The trip. Two-way bindable: ticking or adding a stop emits a new array. */
		days?: ItineraryDay[];
		/** Index of the expanded day (-1 for none). Bindable. */
		open?: number;
		legs?: ItineraryLeg[];
		packing?: PackingGroup[];
		ondayschange?: (days: ItineraryDay[]) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		subtitle,
		verdict,
		currency = 'USD',
		budget,
		route,
		days = $bindable(),
		open = $bindable(0),
		legs,
		packing,
		ondayschange
	}: Props = $props();

	const uid = $props.id();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);

	const heading = $derived(plain(title));
	const sub = $derived(plain(subtitle));
	const at = $derived(Math.trunc(finite(open) ?? 0));
	const dayList = $derived(safeArray<unknown>(days, { widget: 'itinerary', key: 'days' }));

	const view = $derived(
		dayList.map((raw, di) => {
			const d = rec(raw);
			const stops = safeArray<unknown>(d.stops).flatMap((rs, si) => {
				const s = rec(rs);
				const name = plain(s.title);
				if (!name) return [];
				return [
					{
						key: `${s.id ?? ''}:${si}`,
						i: si,
						title: name,
						time: plain(s.time),
						kind: s.kind,
						place: plain(s.place),
						cost: finite(s.cost),
						minutes: finite(s.minutes),
						must: s.must === true,
						done: s.done === true,
						image: s.image
					}
				];
			});
			return {
				key: `${d.id ?? ''}:${di}`,
				label: plain(d.label) || `Day ${di + 1}`,
				when: dateLabel(d.when),
				theme: plain(d.theme),
				stay: plain(d.stay),
				stops,
				timed: stops.some((s) => s.time),
				planned: sum(stops.map((s) => s.cost)),
				done: stops.filter((s) => s.done).length
			};
		})
	);

	const legList = $derived(
		safeArray<unknown>(legs, { widget: 'itinerary', key: 'legs' })
			.map((raw, i) => {
				const l = rec(raw);
				return {
					key: `${l.id ?? ''}:${i}`,
					from: plain(l.from),
					to: plain(l.to),
					kind: l.kind,
					ref: plain(l.ref),
					minutes: finite(l.minutes),
					cost: finite(l.cost)
				};
			})
			.filter((l) => l.from || l.to)
	);

	const packList = $derived(
		safeArray<unknown>(packing, { widget: 'itinerary', key: 'packing' })
			.map((raw, i) => {
				const g = rec(raw);
				// A model habit: items as one comma-separated string.
				const items = typeof g.items === 'string' ? g.items.split(/\s*,\s*/) : safeArray<unknown>(g.items);
				return { key: `${g.id ?? ''}:${i}`, group: plain(g.group), items: items.map(plain).filter(Boolean) };
			})
			.filter((g) => g.group || g.items.length)
	);

	const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

	/** Cities with the leg that leaves each one (matched by from/to names). */
	const hops = $derived.by(() => {
		let cities = safeArray<unknown>(route, { widget: 'itinerary', key: 'route' }).map(plain).filter(Boolean);
		if (!cities.length && legList.length) cities = [legList[0].from, ...legList.map((l) => l.to)].filter(Boolean);
		return cities.map((city, i) => {
			const next = cities[i + 1];
			const leg = next ? legList.find((l) => same(l.from, city) && same(l.to, next)) : undefined;
			return { city, leg, last: i === cities.length - 1 };
		});
	});

	const cap = $derived.by(() => {
		const b = finite(budget);
		return b !== undefined && b > 0 ? b : undefined;
	});
	const legCost = $derived(sum(legList.map((l) => l.cost)));
	const planned = $derived(sum(view.map((d) => d.planned)) + legCost);
	const spent = $derived(sum(view.flatMap((d) => d.stops.filter((s) => s.done).map((s) => s.cost))));
	const spendStatus = $derived(budgetStatus(planned, cap));
	const scale = $derived(Math.max(cap ?? 0, planned, 1));
	const pct = (v: number) => `${Math.min(Math.max((v / scale) * 100, 0), 100)}%`;
	const spendWord = $derived(
		spendStatus === 'bad'
			? `Over by ${money(planned - (cap ?? 0), currency)}`
			: spendStatus === 'warn'
				? 'Near budget'
				: 'Within budget'
	);

	/** The first stop not yet ticked, in trip order: what's next. */
	const nextKey = $derived.by(() => {
		for (const [di, d] of view.entries()) for (const s of d.stops) if (!s.done) return `${di}/${s.key}`;
		return undefined;
	});

	const extras = $derived([
		...(legList.length ? [{ id: 'legs' as const, rows: legList.length }] : []),
		...(packList.length ? [{ id: 'packing' as const, rows: packList.length }] : [])
	]);
	const half = (s: { rows: number }) => s.rows <= MAX_HALF_ROWS;

	function commit(next: unknown[]) {
		days = next as ItineraryDay[];
		ondayschange?.(next as ItineraryDay[]);
	}

	function editStops(di: number, fn: (stops: unknown[]) => unknown[]) {
		commit(dayList.map((raw, i) => (i === di ? { ...rec(raw), stops: fn(safeArray<unknown>(rec(raw).stops)) } : raw)));
	}

	function toggle(di: number, si: number) {
		editStops(di, (stops) => stops.map((s, j) => (j === si ? { ...rec(s), done: rec(s).done !== true } : s)));
	}

	let adding = $state<number | null>(null);
	let draft = $state<{ title: string; time: string; cost: number | null }>({ title: '', time: '', cost: null });

	function startAdd(di: number) {
		adding = di;
		draft = { title: '', time: '', cost: null };
	}

	function addStop(di: number, e: SubmitEvent) {
		e.preventDefault();
		const name = draft.title.trim();
		if (!name) return;
		const cost = finite(draft.cost);
		const stop: ItineraryStop = {
			id: `added-${Date.now().toString(36)}`,
			title: name,
			kind: 'activity',
			...(draft.time && { time: draft.time }),
			...(cost !== undefined && cost >= 0 && { cost })
		};
		editStops(di, (stops) => insertByTime(stops, stop));
		draft = { title: '', time: '', cost: null };
	}

	const field =
		'h-8 min-w-0 rounded-md border border-ripple-border bg-ripple-input px-2 text-callout text-ripple-input-foreground placeholder:text-ripple-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ripple-ring';
	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
</script>

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="itinerary">
	<div class="flex flex-col gap-3">
		{#if heading || sub}
			<header class="flex min-w-0 flex-col gap-0.5">
				{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}
				{#if sub}<p class="text-callout text-ripple-muted-foreground">{sub}</p>{/if}
			</header>
		{/if}

		<VerdictLine {verdict} />

		{#if hops.length > 1}
			<nav aria-label="Route" class="-mx-1 overflow-x-auto px-1 pb-1" data-slot="route">
				<ol class="flex w-full min-w-max items-start">
					{#each hops as h, i (i)}
						<li class={['flex items-start', !h.last && 'min-w-14 flex-1']}>
							<div class="flex max-w-24 flex-col items-center gap-1">
								<span
									class={['size-2.5 rounded-full border-2 border-ripple-accent', i === 0 || h.last ? 'bg-ripple-accent' : 'bg-ripple-surface']}
									aria-hidden="true"
								></span>
								<span class="text-center text-footnote font-medium text-balance">{h.city}</span>
							</div>
							{#if !h.last}
								{@const LegIcon = kindIcon(LEG_ICONS, h.leg?.kind)}
								<div class="relative mx-1 flex h-2.5 flex-1 items-center justify-center" data-leg={h.leg?.kind ?? ''}>
									<svg class="absolute inset-x-0 top-1/2 h-px w-full -translate-y-1/2 overflow-visible text-ripple-border" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true">
										<line x1="0" y1="0.5" x2="100" y2="0.5" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray={h.leg?.kind === 'flight' ? '4 3' : undefined} />
									</svg>
									{#if h.leg}
										<span class="relative grid size-5 place-items-center rounded-full border border-ripple-border bg-ripple-surface text-ripple-muted-foreground">
											<LegIcon size={12} strokeWidth={1.75} aria-hidden="true" />
											<span class="sr-only">then by {h.leg.kind ?? 'road'}{h.leg.minutes ? `, ${duration(h.leg.minutes)}` : ''}</span>
										</span>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ol>
			</nav>
		{/if}

		{#if planned > 0 || cap}
			<div class="flex flex-col gap-1.5 rounded-md bg-ripple-muted px-3 py-2.5" data-slot="spend" data-status={spendStatus}>
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<span class="text-headline tabular-nums">{money(planned, currency)}</span>
					<span class="text-footnote text-ripple-muted-foreground tabular-nums">
						{cap ? `planned of ${money(cap, currency)} budget` : 'planned'}
					</span>
					{#if cap}<StatusPill class="ml-auto" status={spendStatus} label={spendWord} />{/if}
				</div>
				{#if cap}
					<div class="relative h-1.5 overflow-hidden rounded-full bg-ripple-border" aria-hidden="true">
						<div class={['absolute inset-y-0 left-0 rounded-full opacity-40', STATUS_CLASS[spendStatus].fill]} style:width={pct(planned)}></div>
						<div class={['absolute inset-y-0 left-0 rounded-full', STATUS_CLASS[spendStatus].fill]} style:width={pct(spent)}></div>
						{#if planned > cap}
							<div class="absolute inset-y-0 w-0.5 bg-ripple-surface-foreground" style:left={pct(cap)}></div>
						{/if}
					</div>
				{/if}
				{#if spent > 0}
					<p class="text-footnote text-ripple-muted-foreground tabular-nums">{money(spent, currency)} of it ticked off</p>
				{/if}
			</div>
		{/if}

		{#if view.length}
			<ol class="flex flex-col gap-2" aria-label="Days">
				{#each view as d, di (d.key)}
					{@const isOpen = at === di}
					{@const panel = `${uid}-day-${di}`}
					<li class="min-w-0 rounded-ripple border border-ripple-border bg-ripple-surface" in:rise={{ index: di }} data-open={isOpen}>
						<h3>
							<button
								type="button"
								class={['flex w-full items-center gap-3 rounded-ripple px-3 py-2.5 text-left', focusRing]}
								aria-expanded={isOpen}
								aria-controls={panel}
								onclick={() => (open = isOpen ? -1 : di)}
							>
								<span class="grid size-9 shrink-0 place-items-center rounded-md bg-ripple-muted text-headline tabular-nums" aria-hidden="true">{di + 1}</span>
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">
										{d.label}{#if d.when}<span class="normal-case"> · {d.when}</span>{/if}
									</span>
									<span class="truncate text-body-emph">{d.theme || `${d.stops.length} ${d.stops.length === 1 ? 'stop' : 'stops'}`}</span>
								</span>
								{#if d.planned > 0}
									<span class="hidden text-callout text-ripple-muted-foreground tabular-nums @min-[720px]:inline">{money(d.planned, currency)}</span>
								{/if}
								{#if d.stops.length}
									<span
										class={['inline-flex items-center gap-1 text-footnote tabular-nums', d.done === d.stops.length ? 'text-ripple-success-text' : 'text-ripple-muted-foreground']}
									>
										<Check size={12} strokeWidth={2} aria-hidden="true" />{d.done}/{d.stops.length}<span class="sr-only"> done</span>
									</span>
								{/if}
								<ChevronDown
									size={16}
									strokeWidth={1.75}
									aria-hidden="true"
									class="shrink-0 text-ripple-muted-foreground transition-transform duration-150 motion-reduce:transition-none {isOpen ? 'rotate-180' : ''}"
								/>
							</button>
						</h3>

						{#if isOpen}
							<div id={panel} class="border-t border-ripple-border px-3 pt-3 pb-2.5">
								{#if d.stops.length}
									<ol class="flex flex-col">
										{#each d.stops as s, k (s.key)}
											{@const KindIcon = kindIcon(STOP_ICONS, s.kind)}
											{@const isNext = nextKey === `${di}/${s.key}`}
											<li
												class={[
													'grid gap-x-2.5',
													d.timed ? 'grid-cols-[3rem_1.5rem_minmax(0,1fr)] @min-[560px]:grid-cols-[3.5rem_1.5rem_minmax(0,1fr)]' : 'grid-cols-[1.5rem_minmax(0,1fr)]'
												]}
												in:rise={{ index: k }}
												data-done={s.done}
												data-next={isNext || undefined}
											>
												{#if d.timed}
													<span class="pt-1 text-right text-footnote break-words text-ripple-muted-foreground tabular-nums">{s.time}</span>
												{/if}
												<div class="relative flex justify-center">
													{#if k < d.stops.length - 1}
														<span class={['absolute top-6 bottom-0 w-px', s.done ? 'bg-ripple-success' : 'bg-ripple-border']} aria-hidden="true"></span>
													{/if}
													<button
														type="button"
														role="checkbox"
														aria-checked={s.done}
														aria-label={s.title}
														class={[
															'relative grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-150 motion-reduce:transition-none',
															focusRing,
															s.done
																? 'border-ripple-success bg-ripple-success text-ripple-success-foreground'
																: 'border-ripple-border bg-ripple-surface text-ripple-muted-foreground hover:border-ripple-accent hover:text-ripple-surface-foreground',
															isNext && 'ring-2 ring-ripple-accent/50'
														]}
														onclick={() => toggle(di, s.i)}
													>
														{#if s.done}
															<Check size={14} strokeWidth={2.25} aria-hidden="true" />
														{:else}
															<KindIcon size={14} strokeWidth={1.75} aria-hidden="true" />
														{/if}
													</button>
												</div>
												<div class={['min-w-0', k < d.stops.length - 1 ? 'pb-3' : 'pb-1']}>
													<div class="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
														<span class={['text-body-emph text-pretty', s.done && 'text-ripple-muted-foreground line-through']}>{s.title}</span>
														{#if s.must}
															<span class="inline-flex items-center gap-1 rounded-md bg-ripple-muted px-1.5 py-0.5 text-subheadline font-medium whitespace-nowrap">
																<Star size={11} strokeWidth={2} fill="currentColor" aria-hidden="true" class="text-ripple-warning-text" />Must see
															</span>
														{/if}
														{#if isNext}
															<span class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">Next</span>
														{/if}
													</div>
													{#if s.place || s.minutes || s.cost !== undefined}
														<p class="text-footnote text-ripple-muted-foreground tabular-nums">
															{[s.place, duration(s.minutes), s.cost !== undefined ? (s.cost === 0 ? 'Free' : money(s.cost, currency)) : '']
																.filter(Boolean)
																.join(' · ')}
														</p>
													{/if}
													{#if s.image}
														<PhotoTile src={safeUrl(s.image, { kind: 'resource' })} alt={s.title} ratio="16:9" icon={KindIcon} class="mt-2 w-full max-w-80 max-h-[200px]" />
													{/if}
												</div>
											</li>
										{/each}
									</ol>
								{:else}
									<p class="pb-1 text-callout text-ripple-muted-foreground">No stops yet. Add one or ask for a day plan.</p>
								{/if}

								{#if d.stay}
									<p class="mt-1 flex items-center gap-2 border-t border-dashed border-ripple-border pt-2 text-callout">
										<BedDouble size={14} strokeWidth={1.75} aria-hidden="true" class="shrink-0 text-ripple-muted-foreground" />
										<span class="text-ripple-muted-foreground">Stay</span>
										<span class="min-w-0 truncate font-medium">{d.stay}</span>
									</p>
								{/if}

								{#if adding === di}
									<form
										class="mt-2 grid grid-cols-2 gap-2 rounded-md bg-ripple-muted p-2 @min-[560px]:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_auto]"
										onsubmit={(e) => addStop(di, e)}
										aria-label="Add a stop to {d.label}"
									>
										<input class={[field, 'col-span-2 @min-[560px]:col-span-1']} bind:value={draft.title} required placeholder="What, e.g. Ramen lunch" aria-label="Stop" />
										<input class={field} type="time" bind:value={draft.time} aria-label="Time" />
										<input class={field} type="number" min="0" step="any" inputmode="decimal" bind:value={draft.cost} placeholder="Cost" aria-label="Cost in {currency}" />
										<div class="col-span-2 flex gap-2 @min-[560px]:col-span-1">
											<button type="submit" class={['h-8 flex-1 rounded-md bg-ripple-accent px-3 text-callout font-medium text-ripple-accent-foreground', focusRing]}>Add</button>
											<button type="button" class={['h-8 rounded-md px-2 text-callout text-ripple-muted-foreground hover:text-ripple-surface-foreground', focusRing]} onclick={() => (adding = null)}>Done</button>
										</div>
									</form>
								{:else}
									<button
										type="button"
										class={['mt-1 inline-flex h-7 items-center gap-1.5 rounded-md px-1 text-callout text-ripple-muted-foreground hover:text-ripple-surface-foreground', focusRing]}
										onclick={() => startAdd(di)}
									>
										<Plus size={14} strokeWidth={1.75} aria-hidden="true" />Add a stop
									</button>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ol>
		{:else}
			<SectionCard title="Days" empty="No stops yet. Ask for a day plan." />
		{/if}

		{#if extras.length}
			<SectionGrid sections={extras} {half}>
				{#snippet section(x)}
					{#if x.id === 'legs'}
						<SectionCard title="Getting around" icon={RouteIcon}>
							{#snippet aside()}
								{#if legCost > 0}<span class="text-footnote text-ripple-muted-foreground tabular-nums">{money(legCost, currency)}</span>{/if}
							{/snippet}
							<ul class="flex flex-col divide-y divide-ripple-border">
								{#each legList as l, i (l.key)}
									{@const LegIcon = kindIcon(LEG_ICONS, l.kind)}
									<li class="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0" in:rise={{ index: i }}>
										<span class="grid size-8 shrink-0 place-items-center rounded-md bg-ripple-muted text-ripple-muted-foreground">
											<LegIcon size={16} strokeWidth={1.75} aria-hidden="true" />
										</span>
										<div class="min-w-0 flex-1">
											<p class="truncate text-body-emph">{l.from} <span aria-hidden="true">→</span><span class="sr-only">to</span> {l.to}</p>
											{#if l.ref || l.minutes}
												<p class="truncate text-footnote text-ripple-muted-foreground">{[l.ref, duration(l.minutes)].filter(Boolean).join(' · ')}</p>
											{/if}
										</div>
										{#if l.cost !== undefined}
											<span class="shrink-0 text-callout tabular-nums">{money(l.cost, currency)}</span>
										{/if}
									</li>
								{/each}
							</ul>
						</SectionCard>
					{:else}
						<SectionCard title="Packing" icon={Luggage}>
							<div class="flex flex-col gap-2.5">
								{#each packList as g, i (g.key)}
									<div in:rise={{ index: i }}>
										{#if g.group}<p class="text-footnote font-medium text-ripple-muted-foreground">{g.group}</p>{/if}
										<ul class="mt-1 flex flex-wrap gap-1">
											{#each g.items as item, j (j)}
												<li class="rounded-md bg-ripple-muted px-1.5 py-0.5 text-callout">{item}</li>
											{/each}
										</ul>
									</div>
								{/each}
							</div>
						</SectionCard>
					{/if}
				{/snippet}
			</SectionGrid>
		{/if}
	</div>
</div>
