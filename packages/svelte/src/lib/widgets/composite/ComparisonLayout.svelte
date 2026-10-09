<!--
  @file ComparisonLayout.svelte
  @description "Which should I pick": 2 to 6 items side by side (design doc
  2026-10-09 §3.2), on the data kit and the ripple tokens.
  Order: title, the verdict line, the best-pick card (`winner`, with its
  reason, photo, price and runner-up), the other items as compact cards (photo,
  price with its difference from the winner, `picks` tags, spec pills), then
  the detailed comparison: section chips, a differences-only filter, and per
  item cards below 720px of container width or a table with a sticky label
  column at 720px+. A feature with `better` marks its best numeric cell (ties
  mark all; non-finite values skip).
  Choose is state only: it sets the bindable `chosen` id (bind contract
  `chosen` / `onchosenchange`) and calls `onchoose({id, name, product_id?})`,
  the hook a spec's `on_choose` reaches. Legacy item `actions` and `onselect`
  still fire. No network from here.
  Backward compatible: feature `type` is read when `kind` is missing, `title`
  stands in for `name`, `description` for `subtitle`, a string price renders
  as written, a feature `icon` outside FEATURE_ICONS renders by Lucide name,
  and `defaultView` is followed until the visitor picks a view (a streamed
  spec can deliver it after mount).
  Streaming: every list keys by `${id ?? ''}:${index}`, everything is
  $derived, and the winner card appears only once its id matches an item.
-->
<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import type { EventDispatcher, EventHandler, EventHandlerOrArray } from '@ripple-ui/core';
	import { getContext } from 'svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import StarIcon from '@lucide/svelte/icons/star';
	import AwardIcon from '@lucide/svelte/icons/award';
	import PackageIcon from '@lucide/svelte/icons/package';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import TableIcon from '@lucide/svelte/icons/table';
	import Icon from '$lib/widgets/display/Icon.svelte';
	import PhotoTile from '$lib/widgets/data-kit/PhotoTile.svelte';
	import VerdictLine from '$lib/widgets/data-kit/VerdictLine.svelte';
	import { finite, money, num, plain } from '$lib/widgets/data-kit/format.js';
	import { FEATURE_ICONS, kindIcon } from '$lib/widgets/data-kit/icons.js';
	import { rise } from '$lib/widgets/data-kit/motion.js';
	import type { Verdict } from '$lib/widgets/data-kit/types.js';
	import type { StateManager } from '$lib/core/state-manager.svelte.js';

	type FeatureKind = 'text' | 'number' | 'boolean' | 'rating' | 'icon' | 'price' | 'color' | 'image';

	interface CompareFeature {
		key: string;
		label?: string;
		section?: string;
		kind?: FeatureKind;
		/** Legacy name of `kind`; read only when `kind` is missing. */
		type?: FeatureKind;
		better?: 'higher' | 'lower';
		unit?: string;
		/** A FEATURE_ICONS kind (legacy: any Lucide name). */
		icon?: string;
		highlight?: boolean;
	}

	interface CompareItem {
		id: string;
		name?: string;
		title?: string;
		subtitle?: string;
		chip?: string;
		image?: string;
		price?: string | number;
		product_id?: string;
		rating?: number;
		actions?: EventHandlerOrArray;
		learn_more?: EventHandlerOrArray;
		[key: string]: unknown;
	}

	interface Winner {
		id: string;
		reason?: string;
		runner_up?: { id: string; reason?: string };
	}

	interface Props {
		id?: string;
		class?: string;
		style?: Record<string, string> | string;
		title?: string;
		subtitle?: string;
		/** Legacy name of `subtitle`. */
		description?: string;
		verdict?: Verdict;
		/** ISO 4217, for numeric prices. */
		currency?: string;
		items?: CompareItem[];
		features?: CompareFeature[];
		winner?: Winner;
		/** At most 3 tags, e.g. "Best value", "Lightest". */
		picks?: Array<{ id: string; label: string }>;
		/** The chosen item's id. Bindable. */
		chosen?: string;
		primaryLabel?: string;
		secondaryLabel?: string;
		showPrimary?: boolean;
		showSecondary?: boolean;
		/** View mode for the detailed grid below 720px until the visitor picks one. */
		defaultView?: 'card' | 'table';
		showDiffToggle?: boolean;
		onchoose?: (detail: { id: string; name: string; product_id?: string }) => void;
		onchosenchange?: (id: string) => void;
		onselect?: (id: string) => void;
		onlearnmore?: (id: string) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		subtitle,
		description,
		verdict,
		currency = 'USD',
		items = [],
		features,
		winner,
		picks,
		chosen = $bindable(),
		primaryLabel = 'Choose',
		secondaryLabel = 'Learn more',
		showPrimary = true,
		showSecondary = true,
		defaultView = 'card',
		showDiffToggle = true,
		onchoose,
		onchosenchange,
		onselect,
		onlearnmore
	}: Props = $props();

	const KINDS = new Set<FeatureKind>(['text', 'number', 'boolean', 'rating', 'icon', 'price', 'color', 'image']);
	const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
	const missing = (v: unknown) => v === undefined || v === null || v === '';
	const humanize = (s: string) => s.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

	const styleString = $derived(
		typeof style === 'string'
			? style
			: isObj(style)
				? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';')
				: undefined
	);
	const heading = $derived(plain(title));
	const sub = $derived(plain(subtitle ?? description));

	const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
	const stateManager = getContext<StateManager | undefined>('ui-state');

	const list = $derived((Array.isArray(items) ? items.filter(isObj) : []) as CompareItem[]);

	const nameOf = (item: CompareItem) => plain(item.name ?? item.title);
	const itemId = (item: CompareItem) => (typeof item.id === 'string' ? item.id : '');

	function priceText(item: CompareItem): string {
		if (finite(item.price) !== undefined) return money(item.price, currency);
		return typeof item.price === 'string' ? plain(item.price) : '';
	}

	// The winner card waits until its id matches an item that has arrived.
	const winnerItem = $derived(
		isObj(winner) && typeof winner.id === 'string' && winner.id ? list.find((i) => i.id === winner.id) : undefined
	);
	const runnerUp = $derived.by(() => {
		const r = isObj(winner) ? winner.runner_up : undefined;
		if (!winnerItem || !isObj(r) || typeof r.id !== 'string') return undefined;
		const item = list.find((i) => i.id === r.id && i !== winnerItem);
		return item ? { item, reason: plain(r.reason) } : undefined;
	});
	const others = $derived(winnerItem ? list.filter((i) => i !== winnerItem) : list);

	const pickLabels = $derived.by(() => {
		const out = new Map<string, string[]>();
		const src = Array.isArray(picks) ? picks.filter(isObj).slice(0, 3) : [];
		for (const p of src) {
			const label = plain(p.label);
			if (typeof p.id === 'string' && label) out.set(p.id, [...(out.get(p.id) ?? []), label]);
		}
		return out;
	});

	/** "+$700.00 vs Aero 14" under each non-winner price; numbers only. */
	function priceDelta(item: CompareItem): string {
		if (!winnerItem || item === winnerItem) return '';
		const a = finite(item.price);
		const b = finite(winnerItem.price);
		if (a === undefined || b === undefined) return '';
		const w = nameOf(winnerItem) || 'the best pick';
		return a === b ? `Same price as ${w}` : `${money(a - b, currency, { sign: true })} vs ${w}`;
	}

	// ── features ────────────────────────────────────────────────────────────
	const NOT_FEATURES = new Set([
		'id', 'title', 'name', 'subtitle', 'chip', 'image', 'description', 'price', 'product_id',
		'kind', 'actions', 'learn_more', 'url', 'href', 'icon'
	]);

	/** Explicit `features` when any are usable, else inferred from item keys. */
	const allFeatures = $derived.by<CompareFeature[]>(() => {
		const given = Array.isArray(features)
			? (features.filter((f) => isObj(f) && typeof f.key === 'string' && f.key) as CompareFeature[])
			: [];
		if (given.length > 0) return given;
		const keys = new Set<string>();
		for (const item of list) for (const k of Object.keys(item)) if (!NOT_FEATURES.has(k)) keys.add(k);
		return [...keys].map((key) => {
			const first = list.find((i) => !missing(i[key]))?.[key];
			const kind: FeatureKind =
				key === 'rating' ? 'rating' : typeof first === 'boolean' ? 'boolean' : typeof first === 'number' ? 'number' : 'text';
			return { key, label: humanize(key), section: 'Features', kind };
		});
	});

	const kindOf = (f: CompareFeature): FeatureKind => {
		const k = f.kind ?? f.type;
		return k && KINDS.has(k) ? k : 'text';
	};
	const labelOf = (f: CompareFeature) => plain(f.label) || humanize(f.key);
	const sectionOf = (f: CompareFeature) => plain(f.section) || 'Features';

	const sectionNames = $derived([...new Set(allFeatures.map(sectionOf))]);
	let pickedSection = $state<string | null>(null);
	const activeSection = $derived(
		pickedSection !== null && sectionNames.includes(pickedSection) ? pickedSection : (sectionNames[0] ?? null)
	);

	// The visitor's pick wins; until then follow `defaultView`.
	let pickedView = $state<'card' | 'table' | null>(null);
	const viewMode = $derived(pickedView ?? (defaultView === 'table' ? 'table' : 'card'));
	let showDiffOnly = $state(false);

	function isDifferent(f: CompareFeature): boolean {
		if (list.length < 2) return true;
		const first = JSON.stringify(list[0][f.key]);
		return list.some((item) => JSON.stringify(item[f.key]) !== first);
	}

	const shownFeatures = $derived(
		allFeatures.filter((f) => sectionOf(f) === activeSection && (!showDiffOnly || isDifferent(f)))
	);

	const highlightFeatures = $derived.by(() => {
		const marked = allFeatures.filter((f) => f.highlight === true);
		return (marked.length > 0 ? marked : allFeatures).slice(0, 3);
	});

	/** Feature key → indexes (into `list`) of its best cells. */
	const best = $derived.by(() => {
		const out = new Map<string, Set<number>>();
		for (const f of allFeatures) {
			if (f.better !== 'higher' && f.better !== 'lower') continue;
			const vals = list.map((i) => finite(i[f.key]));
			const nums = vals.filter((v): v is number => v !== undefined);
			if (nums.length < 2) continue;
			const top = f.better === 'higher' ? Math.max(...nums) : Math.min(...nums);
			// Every value equal: nothing stands out, so nothing is marked.
			if (nums.every((v) => v === top)) continue;
			out.set(f.key, new Set(vals.flatMap((v, i) => (v === top ? [i] : []))));
		}
		return out;
	});
	const isBest = (f: CompareFeature, idx: number) => best.get(f.key)?.has(idx) ?? false;

	const NO = /^(no|false|n|none|0)$/i;
	const yes = (v: unknown) => !!v && !NO.test(String(v).trim());
	const CSS_COLOR = /^(#|rgb|hsl|oklch|oklab|lab|lch|color\()/i;
	const kinds = (v: unknown): string[] =>
		(Array.isArray(v) ? v : [v]).filter((k): k is string => typeof k === 'string' && k.trim() !== '');

	/** One value as plain text (spec pills, and the text cells). */
	function textOf(f: CompareFeature, v: unknown): string {
		if (missing(v)) return '—';
		const unit = plain(f.unit);
		switch (kindOf(f)) {
			case 'boolean':
				return yes(v) ? 'Yes' : 'No';
			case 'price':
				return finite(v) !== undefined ? money(v, currency) : plain(v);
			case 'number':
				return `${num(v)}${unit && finite(v) !== undefined ? ` ${unit}` : ''}`;
			case 'rating':
				return finite(v) !== undefined ? `${num(v, { digits: 1 })} / 5` : 'n/a';
			case 'icon':
				return kinds(v).map(humanize).join(', ');
			default:
				return `${plain(v)}${unit && finite(v) !== undefined ? ` ${unit}` : ''}`;
		}
	}

	// ── actions ─────────────────────────────────────────────────────────────
	function dispatchOrFallback(
		handler: EventHandlerOrArray | undefined,
		fallback: ((id: string) => void) | undefined,
		item: CompareItem
	) {
		if (handler && eventDispatcher) {
			const handlers = Array.isArray(handler) ? handler : [handler];
			const ctx = { state: stateManager?.state ?? {}, item };
			void eventDispatcher.dispatch(handlers as EventHandler[], ctx, item);
			return;
		}
		fallback?.(itemId(item));
	}

	function choose(item: CompareItem) {
		const cid = itemId(item);
		if (cid) {
			chosen = cid;
			onchosenchange?.(cid);
			// The hook. Choose is state only today; a spec's `on_choose` arrives
			// here as `onchoose`. FL-2 turns it into an `ask` ("I'll take the
			// Nimbus Pro 15"), or `add_to_cart` when the item has a product_id.
			const pid = typeof item.product_id === 'string' && item.product_id ? item.product_id : undefined;
			onchoose?.({ id: cid, name: nameOf(item), ...(pid && { product_id: pid }) });
		}
		dispatchOrFallback(item.actions, onselect, item);
	}

	const isChosen = (item: CompareItem) => !!chosen && itemId(item) === chosen;
	const hasSecondary = (item: CompareItem) =>
		showSecondary && (item.learn_more !== undefined || onlearnmore !== undefined);

	// Item grid columns by count; 3 stays one column until it fits three.
	const COLS: Record<number, string> = {
		2: '@min-[560px]:grid-cols-2',
		3: '@min-[720px]:grid-cols-3',
		4: '@min-[560px]:grid-cols-2 @min-[720px]:grid-cols-4'
	};
	const VIEWS = [['card', 'Cards'], ['table', 'Table']] as const;
	const colsFor = (n: number) => (n <= 1 ? '' : (COLS[n] ?? '@min-[560px]:grid-cols-2 @min-[720px]:grid-cols-3'));
</script>

{#snippet itemName(item: CompareItem, cls: string, tag: 'h3' | 'span' = 'h3')}
	{@const name = nameOf(item)}
	{#if name}
		<svelte:element this={tag} class={['block min-w-0 truncate', cls]}>{name}</svelte:element>
	{:else if item.product_id}
		<!-- A product_id the server has not hydrated yet: a placeholder, not a blank. -->
		<svelte:element this={tag} class="block min-w-0" data-slot="name-pending">
			<span class="block h-3.5 w-24 max-w-full rounded bg-ripple-muted" aria-hidden="true"></span>
			<span class="sr-only">Loading product</span>
		</svelte:element>
	{/if}
{/snippet}

{#snippet tags(item: CompareItem)}
	{@const labels = pickLabels.get(itemId(item)) ?? []}
	{#if labels.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each labels as label, i (`${label}:${i}`)}
				<span class="rounded-md border border-ripple-accent/40 px-1.5 py-0.5 text-footnote font-medium" data-slot="pick">{label}</span>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet chooseButton(item: CompareItem, primary: boolean)}
	{@const on = isChosen(item)}
	<button
		type="button"
		aria-pressed={on}
		data-slot="choose"
		class={[
			'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-callout font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ripple-ring focus-visible:outline-none',
			primary || on
				? 'bg-ripple-accent text-ripple-accent-foreground hover:bg-ripple-accent/90'
				: 'border border-ripple-border text-ripple-surface-foreground hover:bg-ripple-muted'
		]}
		onclick={() => choose(item)}
	>
		{#if on}<CheckIcon size={14} strokeWidth={2} aria-hidden="true" />Chosen{:else}{primaryLabel}{/if}
	</button>
{/snippet}

{#snippet actions(item: CompareItem, primary: boolean)}
	{#if showPrimary || hasSecondary(item)}
		<div class="mt-auto flex flex-wrap items-center gap-1.5">
			{#if showPrimary}{@render chooseButton(item, primary)}{/if}
			{#if hasSecondary(item)}
				<button
					type="button"
					class="inline-flex h-8 items-center rounded-md px-2.5 text-callout font-medium text-ripple-muted-foreground transition-colors hover:bg-ripple-muted hover:text-ripple-surface-foreground focus-visible:ring-2 focus-visible:ring-ripple-ring focus-visible:outline-none"
					onclick={() => dispatchOrFallback(item.learn_more, onlearnmore, item)}
				>
					{secondaryLabel}
				</button>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet featureIcon(f: CompareFeature)}
	{#if typeof f.icon === 'string' && Object.hasOwn(FEATURE_ICONS, f.icon)}
		{@const I = kindIcon(FEATURE_ICONS, f.icon)}
		<I size={14} strokeWidth={1.75} aria-hidden="true" class="shrink-0" />
	{:else if typeof f.icon === 'string' && f.icon}
		<Icon name={f.icon} size={14} class="shrink-0" />
	{/if}
{/snippet}

{#snippet cell(f: CompareFeature, item: CompareItem, idx: number)}
	{@const v = item[f.key]}
	{@const k = kindOf(f)}
	{@const top = isBest(f, idx)}
	<span class={['inline-flex items-center gap-1.5 tabular-nums', top && 'font-semibold']} data-best={top || undefined}>
		{#if top}
			<span class="size-1.5 shrink-0 rounded-full bg-ripple-success" aria-hidden="true"></span>
			<span class="sr-only">Best:</span>
		{/if}
		{#if missing(v)}
			<span class="text-ripple-muted-foreground">—</span>
		{:else if k === 'boolean'}
			{#if yes(v)}
				<span class="inline-flex items-center gap-1 text-ripple-success-text"><CheckIcon size={14} strokeWidth={2} aria-hidden="true" />Yes</span>
			{:else}
				<span class="text-ripple-muted-foreground">No</span>
			{/if}
		{:else if k === 'rating'}
			{@const n = finite(v)}
			{#if n === undefined}
				n/a
			{:else}
				<span class="inline-flex" aria-hidden="true">
					{#each [0, 1, 2, 3, 4] as s (s)}
						<StarIcon size={12} strokeWidth={1.75} class={s < Math.round(n) ? 'fill-ripple-accent text-ripple-accent' : 'text-ripple-muted-foreground/40'} />
					{/each}
				</span>
				<span>{num(n, { digits: 1 })}<span class="sr-only"> out of 5</span></span>
			{/if}
		{:else if k === 'color'}
			{@const c = plain(v)}
			<span class="size-3.5 shrink-0 rounded-full border border-ripple-border" style={safeStyle(`background-color: ${c}`)}></span>
			<span class={CSS_COLOR.test(c) ? 'sr-only' : ''}>{c}</span>
		{:else if k === 'icon'}
			<span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
				{#each kinds(v) as kind, i (`${kind}:${i}`)}
					{@const I = kindIcon(FEATURE_ICONS, kind)}
					<span class="inline-flex items-center gap-1"><I size={16} strokeWidth={1.75} aria-hidden="true" />{humanize(kind)}</span>
				{/each}
			</span>
		{:else if k === 'image'}
			<PhotoTile src={v} alt={labelOf(f)} class="w-8" iconSize={14} />
		{:else}
			{textOf(f, v)}
		{/if}
	</span>
{/snippet}

<div {id} class={['@container w-full text-ripple-surface-foreground', className]} style={styleString}>
	<div class="flex flex-col gap-4">
		{#if heading || sub}
			<header class="min-w-0">
				{#if heading}<h2 class="text-title-3 font-semibold text-balance">{heading}</h2>{/if}
				{#if sub}<p class="mt-0.5 text-callout text-pretty text-ripple-muted-foreground">{sub}</p>{/if}
			</header>
		{/if}

		<VerdictLine {verdict} />

		{#if winnerItem}
			{@const w = winnerItem}
			{@const reason = plain(winner?.reason)}
			<section
				aria-label="Best pick"
				data-slot="winner"
				class={[
					'flex flex-col gap-3 rounded-ripple border p-3 @min-[560px]:p-4',
					isChosen(w) ? 'border-ripple-accent bg-ripple-accent/8' : 'border-ripple-accent/50 bg-ripple-surface'
				]}
			>
				<div class="flex gap-3">
					<PhotoTile src={w.image} alt={nameOf(w)} icon={PackageIcon} class="w-14 shrink-0 self-start @min-[720px]:w-[72px]" />
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<p class="flex items-center gap-1 text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">
							<AwardIcon size={12} strokeWidth={2} aria-hidden="true" class="text-ripple-accent" />Best pick
						</p>
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								{@render itemName(w, 'text-headline')}
								{#if w.subtitle || w.chip}
									<p class="truncate text-footnote text-ripple-muted-foreground">{plain(w.subtitle ?? w.chip)}</p>
								{/if}
							</div>
							{#if priceText(w)}
								<p class="shrink-0 text-headline tabular-nums" data-slot="price">{priceText(w)}</p>
							{/if}
						</div>
						{#if reason}<p class="text-callout text-pretty" data-slot="reason">{reason}</p>{/if}
						{@render tags(w)}
					</div>
				</div>
				{@render actions(w, true)}
				{#if runnerUp}
					<p class="border-t border-ripple-border pt-2 text-footnote text-ripple-muted-foreground" data-slot="runner-up">
						<span class="font-medium text-ripple-surface-foreground">Runner-up: {nameOf(runnerUp.item)}</span>{#if runnerUp.reason}. {runnerUp.reason}{/if}
					</p>
				{/if}
			</section>
		{/if}

		{#if others.length > 0}
			<ul class={['grid grid-cols-1 gap-2', colsFor(others.length)]} aria-label={winnerItem ? 'Other options' : 'Options'}>
				{#each others as item, i (`${item.id ?? ''}:${i}`)}
					{@const delta = priceDelta(item)}
					<li
						in:rise={{ index: i }}
						data-slot="item"
						class={[
							'flex min-w-0 flex-col gap-2 rounded-ripple border p-3',
							isChosen(item) ? 'border-ripple-accent bg-ripple-accent/8' : 'border-ripple-border bg-ripple-surface'
						]}
					>
						<div class="flex gap-3">
							<PhotoTile src={item.image} alt={nameOf(item)} icon={PackageIcon} class="w-14 shrink-0 self-start" />
							<div class="min-w-0 flex-1">
								{@render itemName(item, 'text-headline')}
								{#if item.subtitle || item.chip}
									<p class="truncate text-footnote text-ripple-muted-foreground">{plain(item.subtitle ?? item.chip)}</p>
								{/if}
								{#if priceText(item)}
									<p class="mt-0.5 text-callout font-medium tabular-nums" data-slot="price">{priceText(item)}</p>
								{/if}
								{#if delta}
									<p class="text-footnote tabular-nums text-ripple-muted-foreground" data-slot="delta">{delta}</p>
								{/if}
							</div>
						</div>
						{@render tags(item)}
						{#if highlightFeatures.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each highlightFeatures as f, fi (`${f.key}:${fi}`)}
									{#if !missing(item[f.key])}
										<span class="inline-flex max-w-full items-center gap-1 rounded-md bg-ripple-muted px-1.5 py-0.5 text-footnote">
											{@render featureIcon(f)}
											<span class="text-ripple-muted-foreground">{labelOf(f)}</span>
											<span class="truncate font-medium tabular-nums">{textOf(f, item[f.key])}</span>
										</span>
									{/if}
								{/each}
							</div>
						{/if}
						{@render actions(item, false)}
					</li>
				{/each}
			</ul>
		{/if}

		{#if sectionNames.length > 0 && list.length > 0}
			<section class="flex flex-col gap-3 border-t border-ripple-border pt-4" aria-label="Detailed comparison">
				<div class="flex items-center gap-2">
					<div role="group" aria-label="View" class="inline-flex rounded-md bg-ripple-muted p-0.5 @min-[720px]:hidden">
						{#each VIEWS as [mode, label] (mode)}
							<button
								type="button"
								aria-pressed={viewMode === mode}
								class={[
									'flex items-center gap-1.5 rounded px-2.5 py-1 text-callout font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ripple-ring focus-visible:outline-none',
									viewMode === mode
										? 'bg-ripple-surface text-ripple-surface-foreground'
										: 'text-ripple-muted-foreground hover:text-ripple-surface-foreground'
								]}
								onclick={() => (pickedView = mode)}
							>
								{#if mode === 'card'}<LayoutGridIcon size={14} aria-hidden="true" />{:else}<TableIcon size={14} aria-hidden="true" />{/if}
								{label}
							</button>
						{/each}
					</div>
					{#if showDiffToggle && list.length > 1}
						<label class="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 text-callout text-ripple-muted-foreground select-none hover:text-ripple-surface-foreground">
							<input type="checkbox" bind:checked={showDiffOnly} class="size-3.5 accent-ripple-accent" />
							Differences only
						</label>
					{/if}
				</div>

				{#if sectionNames.length > 1}
					<div class="cmp-chips -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Sections">
						{#each sectionNames as section, si (`${section}:${si}`)}
							<button
								type="button"
								aria-pressed={activeSection === section}
								class={[
									'shrink-0 rounded-md px-2.5 py-1 text-callout font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ripple-ring focus-visible:outline-none',
									activeSection === section
										? 'bg-ripple-accent/12 text-ripple-surface-foreground ring-1 ring-ripple-accent/50'
										: 'bg-ripple-muted text-ripple-muted-foreground hover:text-ripple-surface-foreground'
								]}
								onclick={() => (pickedSection = section)}
							>
								{section}
							</button>
						{/each}
					</div>
				{/if}

				{#if shownFeatures.length === 0}
					<p class="text-callout text-ripple-muted-foreground">These options match on everything in {activeSection}.</p>
				{:else}
					<!-- Per-item cards: below 720px, unless the visitor picked the table. -->
					<div class={viewMode === 'table' ? 'hidden' : '@min-[720px]:hidden'} data-view="card">
						<div class={['grid grid-cols-1 gap-2', list.length % 2 === 0 && '@min-[560px]:grid-cols-2']}>
							{#each list as item, idx (`${item.id ?? ''}:${idx}`)}
								<article class="min-w-0 overflow-hidden rounded-ripple border border-ripple-border bg-ripple-surface">
									<header class="flex items-center gap-2.5 border-b border-ripple-border px-3 py-2">
										<PhotoTile src={item.image} alt={nameOf(item)} icon={PackageIcon} iconSize={14} class="w-8 shrink-0" />
										<div class="min-w-0 flex-1">
											{@render itemName(item, 'text-body-emph')}
											{#if priceText(item)}<p class="truncate text-footnote tabular-nums text-ripple-muted-foreground">{priceText(item)}</p>{/if}
										</div>
										{#if item === winnerItem}<AwardIcon size={14} strokeWidth={2} class="shrink-0 text-ripple-accent" aria-label="Best pick" />{/if}
									</header>
									<dl class="divide-y divide-ripple-border">
										{#each shownFeatures as f, fi (`${f.key}:${fi}`)}
											<div class="flex items-center justify-between gap-3 px-3 py-2 text-callout">
												<dt class="flex min-w-0 items-center gap-1.5 text-ripple-muted-foreground">
													{@render featureIcon(f)}<span class="truncate">{labelOf(f)}</span>
												</dt>
												<dd class="shrink-0 text-right">{@render cell(f, item, idx)}</dd>
											</div>
										{/each}
									</dl>
								</article>
							{/each}
						</div>
					</div>

					<!-- Table: always at 720px+; below that when picked. -->
					<div class={viewMode === 'card' ? 'hidden @min-[720px]:block' : ''} data-view="table">
						<div class="cmp-scroll overflow-x-auto rounded-ripple border border-ripple-border bg-ripple-surface">
							<table class="w-full min-w-[420px] border-collapse text-callout">
								<caption class="sr-only">{activeSection}</caption>
								<thead>
									<tr>
										<th scope="col" class="cmp-sticky px-3 py-2 text-left align-bottom text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">
											{activeSection ?? ''}
										</th>
										{#each list as item, idx (`${item.id ?? ''}:${idx}`)}
											<th
												scope="col"
												class={['border-l border-ripple-border px-3 py-2 text-center align-bottom font-normal', item === winnerItem && 'border-t-2 border-t-ripple-accent']}
											>
												<div class="flex flex-col items-center gap-1">
													<PhotoTile src={item.image} alt="" icon={PackageIcon} iconSize={14} class="w-8" />
													{@render itemName(item, 'text-body-emph', 'span')}
													{#if priceText(item)}<span class="text-footnote tabular-nums text-ripple-muted-foreground">{priceText(item)}</span>{/if}
													{#if item === winnerItem}
														<span class="inline-flex items-center gap-1 text-footnote font-medium"><AwardIcon size={12} strokeWidth={2} aria-hidden="true" class="text-ripple-accent" />Best pick</span>
													{/if}
												</div>
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each shownFeatures as f, fi (`${f.key}:${fi}`)}
										<tr class="border-t border-ripple-border">
											<th scope="row" class="cmp-sticky px-3 py-2 text-left font-normal text-ripple-muted-foreground">
												<span class="flex items-center gap-1.5">{@render featureIcon(f)}<span class="cmp-clamp-2">{labelOf(f)}</span></span>
											</th>
											{#each list as item, idx (`${item.id ?? ''}:${idx}`)}
												<td class="border-l border-ripple-border px-3 py-2 text-center">{@render cell(f, item, idx)}</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</section>
		{/if}
	</div>
</div>

<style>
	.cmp-chips {
		scrollbar-width: none;
	}
	.cmp-chips::-webkit-scrollbar {
		display: none;
	}
	.cmp-scroll {
		scrollbar-width: thin;
	}
	/* The label column stays put while the item columns scroll under it. */
	.cmp-sticky {
		position: sticky;
		left: 0;
		z-index: 1;
		min-width: 7rem;
		max-width: 11rem;
		background: var(--ripple-surface);
	}
	.cmp-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
