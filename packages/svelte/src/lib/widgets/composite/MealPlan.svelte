<!--
  widgets/composite/MealPlan.svelte — `meal-plan`: a week of meals from one
  recipe library (design doc 2026-10-09 §3.6). The model writes `recipes` once
  and `days[{day, meals[{slot, recipe}]}]` pointing at them by id; the widget
  does the design: a people stepper, daily and weekly protein and calories
  against `goal`, the week as day cards below 720px and a days-by-slots grid
  above it, a swap per meal (a native select filtered by slot), the tapped
  meal's RecipeView inline under its day, and a derived shopping list summed
  per ingredient, scaled to the people count and grouped by aisle.

  Invariants:
  - `people` is the one bound field (bind contract `people` /
    `onpeoplechange`). `days` (a swap writes a NEW array) and `got` (ticked
    shopping keys) are Svelte-side $bindables with change callbacks, held as
    Edits so a host re-sending the original spec does not undo them.
  - Everything shown derives from props: the shopping list, totals and slot
    columns recompute as recipes and days stream in. A meal whose recipe has
    not arrived renders a skeleton row and adds nothing to the sums.
  - Nutrition is per serving, so day totals are per person and never scale;
    quantities scale by people / serves (rules in recipe.ts).
  - Days and meals key by `${id ?? ''}:${index}`; a day reads `day`, then
    `label`, so neither spelling crashes it.
-->
<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import Check from '@lucide/svelte/icons/check';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Flame from '@lucide/svelte/icons/flame';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import { safeArray } from '$lib/utils/safe-props.js';
	import { AISLE_ICONS, MEAL_ICONS, SectionCard, StatChip, StatusPill, VerdictLine, STATUS_CLASS, holds, kindIcon, nextEdit, num, plain, rise } from '../data-kit/index.js';
	import type { Edit } from '../data-kit/edit.js';
	import type { Verdict } from '../data-kit/types.js';
	import Recipe, { stepper } from './Recipe.svelte';
	import {
		SLOTS,
		dayLabel,
		dayTotals,
		findRecipe,
		goalCheck,
		list,
		positive,
		qtyLabel,
		readLibrary,
		rec,
		shoppingList,
		slotLabel,
		swapMeal,
		type Goal,
		type PlanDay,
		type RecipeData
	} from './recipe.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		subtitle?: string;
		verdict?: Verdict;
		/** People cooked for. Bindable; scales the shopping list. */
		people?: number;
		/** Per person per day. */
		goal?: Goal;
		/** The library every meal points into. */
		recipes?: RecipeData[];
		/** The week. Bindable: a swap writes a new array. */
		days?: PlanDay[];
		/** Ticked shopping-list keys (`name|unit`). Bindable. */
		got?: string[];
		onpeoplechange?: (people: number) => void;
		ondayschange?: (days: PlanDay[]) => void;
		ongotchange?: (got: string[]) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		subtitle,
		verdict,
		people = $bindable(),
		goal,
		recipes,
		days = $bindable(),
		got = $bindable(),
		onpeoplechange,
		ondayschange,
		ongotchange
	}: Props = $props();

	const MAX_PEOPLE = 20;
	const uid = $props.id();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);

	const heading = $derived(plain(title));
	const sub = $derived(plain(subtitle));
	const count = $derived(Math.max(1, Math.min(Math.round(positive(people) ?? 1), MAX_PEOPLE)));
	const lib = $derived(readLibrary(safeArray<unknown>(recipes, { widget: 'meal-plan', key: 'recipes' })));
	const incomingDays = $derived(safeArray<unknown>(days, { widget: 'meal-plan', key: 'days' }));
	// Swaps and ticks are Edits (data-kit/edit.ts): a host that re-renders the same
	// spec (say on a people change) re-sends the original days, which must not
	// undo a swap. Plain $state.raw: nothing inside them is mutated.
	let daysEdit = $state.raw<Edit<unknown[]> | null>(null);
	let gotEdit = $state.raw<Edit<string[]> | null>(null);
	const dayList = $derived(holds(daysEdit, incomingDays) ? daysEdit.value : incomingDays);
	const gotList = $derived(holds(gotEdit, got) ? gotEdit.value : list(got));
	const goalObj = $derived(rec(goal));

	const view = $derived(
		dayList.map((raw, di) => {
			const d = rec(raw);
			const meals = list(d.meals).flatMap((rm, mi) => {
				const m = rec(rm);
				const ref = plain(m.recipe);
				const recipe = findRecipe(lib, ref);
				const slot = plain(m.slot).toLowerCase() || recipe?.kind || (ref ? 'other' : '');
				if (!slot) return [];
				return [{ key: `${m.id ?? ''}:${mi}`, mi, slot, ref, recipe }];
			});
			// Protein leads the day when the goal names it; calories otherwise.
			const t = dayTotals(raw, lib);
			const byProtein = goalCheck(t.protein, goalObj.protein_g, 'floor');
			const check = byProtein ?? goalCheck(t.kcal, goalObj.kcal, 'target');
			const ratio = byProtein ? t.protein! / positive(goalObj.protein_g)! : check ? t.kcal! / positive(goalObj.kcal)! : undefined;
			return { key: `${d.id ?? ''}:${di}`, di, label: dayLabel(raw, di), meals, kcal: t.kcal, protein: t.protein, check, ratio };
		})
	);

	/** Slot columns in meal order, then any slot the model invented, as written. */
	const slots = $derived.by(() => {
		const used = new Set(view.flatMap((d) => d.meals.map((m) => m.slot)));
		return [...SLOTS.filter((s) => used.has(s)), ...[...used].filter((s) => !(SLOTS as readonly string[]).includes(s))];
	});

	const mean = (xs: (number | undefined)[]) => {
		const ok = xs.filter((x): x is number => x !== undefined);
		return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : undefined;
	};
	const total = (xs: (number | undefined)[]) => {
		const ok = xs.filter((x): x is number => x !== undefined);
		return ok.length ? ok.reduce((a, b) => a + b, 0) : undefined;
	};
	const avgProtein = $derived(mean(view.map((d) => d.protein)));
	const avgKcal = $derived(mean(view.map((d) => d.kcal)));
	const weekProtein = $derived(total(view.map((d) => d.protein)));
	const weekKcal = $derived(total(view.map((d) => d.kcal)));
	const proteinCheck = $derived(goalCheck(avgProtein, goalObj.protein_g, 'floor'));
	const kcalCheck = $derived(goalCheck(avgKcal, goalObj.kcal, 'target'));

	const shop = $derived(shoppingList(dayList, lib, count));
	const shopCount = $derived(shop.reduce((n, g) => n + g.items.length, 0));
	const gotSet = $derived(new Set(gotList.filter((k): k is string => typeof k === 'string')));
	const gotCount = $derived(shop.reduce((n, g) => n + g.items.filter((i) => gotSet.has(i.key)).length, 0));

	/** Swap choices per slot: recipes of that kind, plus kind-less ones. */
	function choices(slot: string, current: { ref: string } | undefined) {
		const opts = lib.filter((r) => !r.kind || r.kind === slot);
		return current && !opts.some((o) => o.ref === current.ref) ? [current as (typeof lib)[number], ...opts] : opts;
	}

	// Which meal's recipe is open, as `${dayIndex}:${mealIndex}`: view state.
	let openAt = $state<string | null>(null);

	function setPeople(n: number) {
		people = n;
		onpeoplechange?.(n);
	}

	function swap(di: number, mi: number, ref: string) {
		const next = swapMeal(dayList, di, mi, ref) as PlanDay[];
		daysEdit = nextEdit(daysEdit, incomingDays, next);
		days = next;
		ondayschange?.(next);
	}

	function toggleGot(key: string) {
		const next = gotSet.has(key) ? [...gotSet].filter((k) => k !== key) : [...gotSet, key];
		gotEdit = nextEdit(gotEdit, got, next);
		got = next;
		ongotchange?.(next);
	}

	const g0 = (v: number | undefined) => (v === undefined ? undefined : Math.round(v));
	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const gridCols = '@min-[720px]:grid-cols-[8.5rem_repeat(var(--slots),minmax(0,1fr))]';
</script>

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="meal-plan">
	<div class="flex flex-col gap-3">
		{#if heading || sub}
			<header class="flex min-w-0 flex-col gap-0.5">
				{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}
				{#if sub}<p class="text-callout text-ripple-muted-foreground">{sub}</p>{/if}
			</header>
		{/if}

		<VerdictLine {verdict} />

		<!-- Two columns below 720px (the stepper spans both, an odd last chip too,
		     so no chip sits beside an empty half); one row above it. -->
		<div class="grid grid-cols-2 gap-2 @min-[720px]:flex" data-slot="totals">
			<div class="col-span-2 flex min-w-0 items-center justify-between gap-2 rounded-md bg-ripple-muted px-3 py-2 @min-[720px]:flex-[1.3]">
				<div class="flex min-w-0 flex-col">
					<span class="text-footnote text-ripple-muted-foreground">Cooking for</span>
					<span class="text-footnote text-ripple-muted-foreground">{count === 1 ? '1 person' : `${count} people`}</span>
				</div>
				{@render stepper(count, 1, MAX_PEOPLE, 'people', setPeople)}
			</div>
			{#if avgProtein !== undefined}
				<StatChip label="Protein a day" value={g0(avgProtein)} unit="g" status={proteinCheck?.status} icon={Dumbbell} class="@min-[720px]:flex-1" />
			{/if}
			{#if avgKcal !== undefined}
				<StatChip label="Calories a day" value={g0(avgKcal)} unit="kcal" status={kcalCheck?.status} icon={Flame} class="@min-[720px]:flex-1" />
			{/if}
			<StatChip
				label="To buy"
				value={shopCount}
				unit={shopCount === 1 ? 'item' : 'items'}
				icon={ShoppingCart}
				class={['@min-[720px]:flex-1', (avgProtein === undefined) === (avgKcal === undefined) && 'col-span-2'].filter(Boolean).join(' ')}
			/>
		</div>
		{#if weekProtein !== undefined || weekKcal !== undefined || goalObj.protein_g !== undefined}
			<p class="-mt-1 text-footnote text-ripple-muted-foreground tabular-nums" data-slot="week">
				Per person, the week comes to {[weekProtein !== undefined && `${num(g0(weekProtein))} g protein`, weekKcal !== undefined && `${num(g0(weekKcal))} kcal`]
					.filter(Boolean)
					.join(' and ') || 'nothing yet'}{#if positive(goalObj.protein_g)}{` against a goal of ${num(goalObj.protein_g)} g protein a day`}{/if}.
			</p>
		{/if}

		{#if view.length}
			<div class="rounded-ripple border border-ripple-border bg-ripple-surface" style:--slots={slots.length || 1} data-slot="week-grid">
				<div class={['hidden gap-3 border-b border-ripple-border px-3 pt-2.5 pb-2 @min-[720px]:grid', gridCols]} aria-hidden="true">
					<span class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">Day</span>
					{#each slots as s (s)}
						{@const SlotIcon = kindIcon(MEAL_ICONS, s)}
						<span class="flex items-center gap-1.5 px-2 text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">
							<SlotIcon size={12} strokeWidth={1.75} />{slotLabel(s)}
						</span>
					{/each}
				</div>
				<ol class="divide-y divide-ripple-border" aria-label="Days">
					{#each view as d, di (d.key)}
						{@const cells = slots.map((s) => d.meals.filter((m) => m.slot === s))}
						<li class={['grid grid-cols-1 gap-1.5 px-3 py-3 @min-[720px]:gap-3', gridCols]} in:rise={{ index: di }} data-day={d.label}>
							<div class="flex min-w-0 flex-col gap-1">
								<div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 @min-[720px]:flex-col @min-[720px]:items-start">
									<h3 class="text-caption-1 font-medium tracking-[0.04em] uppercase">{d.label}</h3>
									{#if d.check}<StatusPill status={d.check.status} label={d.check.word} />{/if}
								</div>
								{#if d.protein !== undefined || d.kcal !== undefined}
									<p class="text-footnote text-ripple-muted-foreground tabular-nums" data-slot="day-totals">
										{#if d.protein !== undefined}<span class="font-medium text-ripple-surface-foreground">{num(g0(d.protein))} g</span> protein{/if}{#if d.protein !== undefined && d.kcal !== undefined}{' · '}{/if}{#if d.kcal !== undefined}{num(g0(d.kcal))} kcal{/if}
									</p>
								{/if}
								{#if d.check && d.ratio !== undefined}
									<div class="h-1 overflow-hidden rounded-full bg-ripple-border @min-[720px]:max-w-28" aria-hidden="true">
										<div class={['h-full rounded-full', STATUS_CLASS[d.check.status].fill]} style:width="{Math.min(Math.max(d.ratio, 0), 1) * 100}%"></div>
									</div>
								{/if}
							</div>

							{#each cells as cell, ci (slots[ci])}
								<div class={['min-w-0 flex-col gap-1', cell.length ? 'flex' : 'hidden @min-[720px]:flex']}>
									{#each cell as m (m.key)}
										{@const SlotIcon = kindIcon(MEAL_ICONS, m.slot)}
										{@const at = `${d.di}:${m.mi}`}
										{@const isOpen = openAt === at}
										{#if m.recipe}
											{@const opts = choices(m.slot, m.recipe)}
											<div
												class={[
													'flex min-w-0 items-center gap-1 rounded-md border transition-colors duration-150 motion-reduce:transition-none',
													isOpen ? 'border-ripple-accent bg-ripple-accent/8' : 'border-transparent hover:bg-ripple-muted'
												]}
												data-meal={m.recipe.ref}
											>
												<button
													type="button"
													class={['flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left', focusRing]}
													aria-expanded={isOpen}
													aria-controls="{uid}-recipe-{d.di}"
													onclick={() => (openAt = isOpen ? null : at)}
												>
													<span class="grid size-8 shrink-0 place-items-center rounded-md bg-ripple-muted text-ripple-muted-foreground @min-[720px]:hidden" aria-hidden="true">
														<SlotIcon size={16} strokeWidth={1.75} />
													</span>
													<span class="flex min-w-0 flex-col">
														<span class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase @min-[720px]:sr-only">{slotLabel(m.slot)}</span>
														<span class="line-clamp-2 text-callout font-medium text-pretty">{m.recipe.name}</span>
														{#if m.recipe.kcal !== undefined || m.recipe.protein !== undefined}
															<span class="text-footnote text-ripple-muted-foreground tabular-nums">
																{[m.recipe.protein !== undefined && `${num(m.recipe.protein)} g protein`, m.recipe.kcal !== undefined && `${num(m.recipe.kcal)} kcal`].filter(Boolean).join(' · ')}
															</span>
														{/if}
													</span>
												</button>
												{#if opts.length > 1}
													<label
														class="relative mr-1 grid size-8 shrink-0 place-items-center rounded-md text-ripple-muted-foreground transition-colors hover:bg-ripple-border hover:text-ripple-surface-foreground focus-within:outline-2 focus-within:outline-ripple-ring motion-reduce:transition-none"
														title="Swap this meal"
													>
														<ArrowLeftRight size={14} strokeWidth={1.75} aria-hidden="true" />
														<select
															class="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
															aria-label="Swap {d.label} {slotLabel(m.slot)}"
															value={m.recipe.ref}
															onchange={(e) => swap(d.di, m.mi, e.currentTarget.value)}
														>
															{#each opts as o (o.key)}
																<option value={o.ref}>{o.name}{o.protein !== undefined ? ` (${num(o.protein)} g protein)` : ''}</option>
															{/each}
														</select>
													</label>
												{/if}
											</div>
										{:else}
											<div class="flex min-w-0 items-center gap-2.5 px-2 py-1.5" data-slot="meal-pending" aria-busy="true">
												<span class="grid size-8 shrink-0 place-items-center rounded-md bg-ripple-muted text-ripple-muted-foreground @min-[720px]:hidden" aria-hidden="true">
													<SlotIcon size={16} strokeWidth={1.75} />
												</span>
												<span class="flex min-w-0 flex-1 flex-col gap-1.5">
													<span class="truncate text-callout text-ripple-muted-foreground">{m.ref || slotLabel(m.slot)}</span>
													<span class="h-2.5 w-2/3 rounded bg-ripple-muted" aria-hidden="true"></span>
												</span>
											</div>
										{/if}
									{/each}
									{#if !cell.length}<span class="px-2 py-2 text-footnote text-ripple-muted-foreground" aria-hidden="true">–</span>{/if}
								</div>
							{/each}

							{#if !d.meals.length}
								<p class="text-callout text-ripple-muted-foreground @min-[720px]:hidden">Nothing planned yet.</p>
							{/if}

							{#each d.meals as m (m.key)}
								{#if openAt === `${d.di}:${m.mi}` && m.recipe}
									<div id="{uid}-recipe-{d.di}" class="col-span-full mt-1 rounded-ripple border border-ripple-border bg-ripple-muted/40 p-3" in:rise>
										<Recipe
											embedded
											name={m.recipe.name}
											kind={m.recipe.raw.kind as never}
											image={m.recipe.raw.image as never}
											minutes={m.recipe.raw.minutes as never}
											serves={m.recipe.raw.serves as never}
											kcal={m.recipe.raw.kcal as never}
											protein_g={m.recipe.raw.protein_g as never}
											tags={m.recipe.raw.tags as never}
											ingredients={m.recipe.raw.ingredients as never}
											steps={m.recipe.raw.steps as never}
											goal={goal}
											servings={count}
											onclose={() => (openAt = null)}
										/>
									</div>
								{/if}
							{/each}
						</li>
					{/each}
				</ol>
			</div>
		{:else}
			<SectionCard title="Week" empty="No meals yet. Ask for a week of meals." />
		{/if}

		<SectionCard title="Shopping list" icon={ShoppingCart} empty={shopCount ? undefined : 'The list fills in as meals are planned.'}>
			{#snippet aside()}
				{#if shopCount}
					<span class="text-footnote tabular-nums">{gotCount ? `${gotCount} of ${shopCount} got` : `for ${count === 1 ? '1 person' : `${count} people`}`}</span>
				{/if}
			{/snippet}
			<div class="grid grid-cols-1 gap-x-6 gap-y-4 @min-[560px]:grid-cols-2 @min-[720px]:grid-cols-3" data-slot="shopping">
				{#each shop as g (g.aisle)}
					{@const AisleIcon = kindIcon(AISLE_ICONS, g.aisle)}
					<section class="min-w-0" data-aisle={g.aisle}>
						<h4 class="mb-1 flex items-center gap-1.5 text-footnote font-medium text-ripple-muted-foreground">
							<AisleIcon size={14} strokeWidth={1.75} aria-hidden="true" />{slotLabel(g.aisle)}
							<span class="ml-auto tabular-nums">{g.items.length}</span>
						</h4>
						<ul class="flex flex-col">
							{#each g.items as it (it.key)}
								{@const ticked = gotSet.has(it.key)}
								{@const amount = qtyLabel(it.qty, it.unit)}
								<li class="border-b border-ripple-border/60 last:border-b-0">
									<button
										type="button"
										role="checkbox"
										aria-checked={ticked}
										class={['flex w-full items-start gap-2.5 rounded py-1.5 text-left', focusRing]}
										onclick={() => toggleGot(it.key)}
										data-item={it.key}
									>
										<span
											class={[
												'mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors duration-150 motion-reduce:transition-none',
												ticked ? 'border-ripple-success bg-ripple-success text-ripple-success-foreground' : 'border-ripple-muted-foreground/50'
											]}
											aria-hidden="true"
										>
											{#if ticked}<Check size={11} strokeWidth={3} />{/if}
										</span>
										<span class={['min-w-0 flex-1 text-callout', ticked && 'text-ripple-muted-foreground line-through']}>
											{it.name}
											{#if it.uses > 1}<span class="text-footnote text-ripple-muted-foreground no-underline"> · {it.uses} meals</span>{/if}
										</span>
										<span class={['shrink-0 text-callout tabular-nums', ticked ? 'text-ripple-muted-foreground' : 'font-medium']} data-slot="amount">{amount || 'to taste'}</span>
									</button>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		</SectionCard>
	</div>
</div>
