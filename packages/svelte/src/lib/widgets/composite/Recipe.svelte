<!--
  widgets/composite/Recipe.svelte — `recipe`: one dish you can cook from, and
  the RecipeView that `meal-plan` opens inline (design doc 2026-10-09 §3.6).
  The model fills plain data (serves, minutes, per-serving kcal and protein,
  ingredients with numeric qty + unit, steps with minutes and tips); the
  widget does the design: a photo hero or a kind icon beside the title, meta
  chips, a servings stepper that rescales every numeric quantity, nutrition
  per serving, ingredients you tick while shopping or prepping, and numbered
  steps you tick while cooking. Ingredients and steps stack below 720px and
  sit side by side above it; there are no tabs, so no half-empty panel.

  Invariants:
  - `servings` is the one bound field (bind contract `servings` /
    `onservingschange`). The count shown is derived (`servings`, else
    `serves`), never seeded into $state, so a streamed card ends equal to a
    whole one. Without a usable `serves` nothing scales and the stepper hides.
  - `done` (ticked step indexes) is a Svelte-side $bindable; a tick writes a
    NEW array, held as an Edit. Ingredient ticks are local view state.
  - Quantities are numbers; scaling multiplies them (recipe.ts). Nutrition is
    per serving and does not scale.
  - The `stepper` snippet is exported for meal-plan's people count.
-->
<script module lang="ts">
	// The stepper snippet below may only use module-scope names to be exportable.
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';

	export { stepper };
</script>

<script lang="ts">
	import { safeStyle, safeUrl } from '@ripple-ui/core';
	import { SvelteSet } from 'svelte/reactivity';
	import Check from '@lucide/svelte/icons/check';
	import ChefHat from '@lucide/svelte/icons/chef-hat';
	import Clock from '@lucide/svelte/icons/clock';
	import Flame from '@lucide/svelte/icons/flame';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ShoppingBasket from '@lucide/svelte/icons/shopping-basket';
	import Timer from '@lucide/svelte/icons/timer';
	import X from '@lucide/svelte/icons/x';
	import { MEAL_ICONS, PhotoTile, SectionCard, StatChip, VerdictLine, finite, kindIcon, plain, sum } from '../data-kit/index.js';
	import type { Verdict } from '../data-kit/types.js';
	import { duration } from './Itinerary.svelte';
	import {
		holds,
		list,
		nextEdit,
		positive,
		qtyLabel,
		readIngredients,
		readSteps,
		scaleFactor,
		slotLabel,
		type Edit,
		type Goal,
		type Ingredient,
		type RecipeStep,
		type Slot
	} from './recipe.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		/** Dish name. `title` is read when `name` is missing. */
		name?: string;
		title?: string;
		subtitle?: string;
		verdict?: Verdict;
		kind?: Slot;
		image?: string;
		/** Total time in minutes; the steps' minutes are summed when absent. */
		minutes?: number;
		/** How many servings the written quantities make. */
		serves?: number;
		/** Per serving. */
		kcal?: number;
		/** Per serving. */
		protein_g?: number;
		tags?: string[];
		difficulty?: 'easy' | 'medium' | 'hard';
		ingredients?: Ingredient[];
		steps?: RecipeStep[];
		/** Daily goal per person; protein per serving is shown against it. */
		goal?: Goal;
		/** Servings to cook. Bindable; defaults to `serves`. */
		servings?: number;
		/** Indexes of ticked steps. Bindable. */
		done?: number[];
		/** Inside meal-plan: a smaller title, no verdict, a close button. */
		embedded?: boolean;
		onservingschange?: (servings: number) => void;
		ondonechange?: (done: number[]) => void;
		onclose?: () => void;
	}

	let {
		id,
		class: className,
		style,
		name,
		title,
		subtitle,
		verdict,
		kind,
		image,
		minutes,
		serves,
		kcal,
		protein_g,
		tags,
		difficulty,
		ingredients,
		steps,
		goal,
		servings = $bindable(),
		done = $bindable(),
		embedded = false,
		onservingschange,
		ondonechange,
		onclose
	}: Props = $props();

	const MAX = 99;

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);

	const heading = $derived(plain(name) || plain(title));
	const sub = $derived(plain(subtitle));
	const KindIcon = $derived(kindIcon(MEAL_ICONS, kind));
	const kindWord = $derived(typeof kind === 'string' ? slotLabel(plain(kind)) : '');

	const base = $derived(positive(serves));
	const count = $derived(Math.min(Math.round(positive(servings) ?? base ?? 1), MAX));
	const factor = $derived(scaleFactor(count, base));

	const rows = $derived(readIngredients(ingredients));
	const stepRows = $derived(readSteps(steps));
	// A step tick is an Edit (recipe.ts), so a host re-sending `done` from the
	// spec does not untick it.
	let doneEdit = $state.raw<Edit<number[]> | null>(null);
	const doneSet = $derived(new Set((holds(doneEdit, done) ? doneEdit.value : list(done)).filter((n) => typeof n === 'number')));
	const stepMinutes = $derived(sum(stepRows.map((s) => s.minutes)));
	const totalMinutes = $derived(positive(minutes) ?? (stepMinutes || undefined));

	const level = $derived(difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard' ? difficulty : undefined);
	const tagList = $derived(list(tags).map(plain).filter(Boolean).slice(0, 4));

	const kcalN = $derived(finite(kcal));
	const proteinN = $derived(finite(protein_g));
	const proteinGoal = $derived(positive(goal?.protein_g));
	const share = $derived(proteinN !== undefined && proteinGoal ? Math.round((proteinN / proteinGoal) * 100) : undefined);

	// Ticked ingredients are view state: what is in the basket right now.
	const got = new SvelteSet<string>();

	function setServings(n: number) {
		servings = n;
		onservingschange?.(n);
	}

	function toggleStep(i: number) {
		const next = doneSet.has(i) ? [...doneSet].filter((n) => n !== i) : [...doneSet, i].toSorted((a, b) => a - b);
		doneEdit = nextEdit(doneEdit, done, next);
		done = next;
		ondonechange?.(next);
	}

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
</script>

{#snippet stepper(value: number, min: number, max: number, noun: string, set: (n: number) => void)}
	<div class="inline-flex items-center gap-1 rounded-md bg-ripple-muted p-0.5" role="group" aria-label={noun}>
		<button
			type="button"
			class="grid size-8 place-items-center rounded-[5px] text-ripple-surface-foreground transition-colors hover:bg-ripple-border focus-visible:outline-2 focus-visible:outline-ripple-ring disabled:opacity-40 motion-reduce:transition-none"
			aria-label="Fewer {noun}"
			disabled={value <= min}
			onclick={() => set(value - 1)}
		>
			<Minus size={14} strokeWidth={2} aria-hidden="true" />
		</button>
		<output class="min-w-7 text-center text-headline tabular-nums" aria-live="polite">{value}</output>
		<button
			type="button"
			class="grid size-8 place-items-center rounded-[5px] text-ripple-surface-foreground transition-colors hover:bg-ripple-border focus-visible:outline-2 focus-visible:outline-ripple-ring disabled:opacity-40 motion-reduce:transition-none"
			aria-label="More {noun}"
			disabled={value >= max}
			onclick={() => set(value + 1)}
		>
			<Plus size={14} strokeWidth={2} aria-hidden="true" />
		</button>
	</div>
{/snippet}

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="recipe">
	<div class="flex flex-col gap-3">
		{#if image}
			<PhotoTile src={safeUrl(image, { kind: 'resource' })} alt={heading} ratio="16:9" icon={KindIcon} iconSize={28} class="max-h-[200px] w-full" />
		{/if}

		<header class="flex min-w-0 items-start gap-3">
			{#if !image}
				<span class="grid size-11 shrink-0 place-items-center rounded-md bg-ripple-muted text-ripple-muted-foreground" aria-hidden="true">
					<KindIcon size={20} strokeWidth={1.75} />
				</span>
			{/if}
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				{#if kindWord}
					<span class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">{kindWord}</span>
				{/if}
				{#if embedded}
					<h3 class="text-headline text-pretty">{heading || 'Recipe'}</h3>
				{:else}
					<h2 class="text-title-3 font-semibold text-pretty">{heading || 'Recipe'}</h2>
				{/if}
				{#if sub}<p class="text-callout text-ripple-muted-foreground">{sub}</p>{/if}
			</div>
			{#if embedded && onclose}
				<button
					type="button"
					class={['grid size-8 shrink-0 place-items-center rounded-md text-ripple-muted-foreground hover:bg-ripple-muted hover:text-ripple-surface-foreground', focusRing]}
					aria-label="Close {heading || 'recipe'}"
					onclick={onclose}
				>
					<X size={16} strokeWidth={1.75} aria-hidden="true" />
				</button>
			{/if}
		</header>

		{#if !embedded}<VerdictLine {verdict} />{/if}

		{#if totalMinutes || level || tagList.length}
			<ul class="flex flex-wrap items-center gap-1.5" aria-label="About this dish" data-slot="meta">
				{#if totalMinutes}
					<li class="inline-flex items-center gap-1 rounded-md bg-ripple-muted px-2 py-1 text-footnote tabular-nums">
						<Clock size={12} strokeWidth={2} aria-hidden="true" class="text-ripple-muted-foreground" />{duration(totalMinutes)}
					</li>
				{/if}
				{#if level}
					<li class="inline-flex items-center gap-1 rounded-md bg-ripple-muted px-2 py-1 text-footnote capitalize">
						<ChefHat size={12} strokeWidth={2} aria-hidden="true" class="text-ripple-muted-foreground" />{level}
					</li>
				{/if}
				{#each tagList as t, i (i)}
					<li class="rounded-md border border-ripple-border px-2 py-[3px] text-footnote text-ripple-muted-foreground">{t}</li>
				{/each}
			</ul>
		{/if}

		{#if base || kcalN !== undefined || proteinN !== undefined}
			<div class="grid grid-cols-2 gap-2 @min-[720px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
				{#if base}
					<div class="col-span-2 flex min-w-0 items-center justify-between gap-2 rounded-md bg-ripple-muted px-3 py-2 @min-[720px]:col-span-1" data-slot="servings">
						<div class="flex min-w-0 flex-col">
							<span class="text-footnote text-ripple-muted-foreground">Servings</span>
							{#if count !== base}
								<button
									type="button"
									class={['inline-flex items-center gap-1 self-start rounded text-footnote text-ripple-muted-foreground hover:text-ripple-surface-foreground', focusRing]}
									onclick={() => setServings(base)}
								>
									<RotateCcw size={11} strokeWidth={2} aria-hidden="true" />Written for {base}
								</button>
							{:else}
								<span class="text-footnote text-ripple-muted-foreground">As written</span>
							{/if}
						</div>
						{@render stepper(count, 1, MAX, 'servings', setServings)}
					</div>
				{/if}
				{#if kcalN !== undefined}
					<StatChip label="Per serving" value={kcalN} unit="kcal" icon={Flame} />
				{/if}
				{#if proteinN !== undefined}
					<StatChip label="Protein" value={proteinN} unit="g" icon={Dumbbell} />
				{/if}
			</div>
			{#if share !== undefined}
				<p class="-mt-1 text-footnote text-ripple-muted-foreground tabular-nums" data-slot="goal-share">
					One serving covers {share}% of the {proteinGoal} g daily protein goal.
				</p>
			{/if}
		{/if}

		<div class={['grid grid-cols-1 gap-3', stepRows.length && '@min-[720px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]']}>
			<SectionCard title="Ingredients" icon={ShoppingBasket} empty={rows.length ? undefined : 'No ingredients yet. Ask for the full recipe.'}>
				{#snippet aside()}
					{#if rows.length}
						<span class="text-footnote tabular-nums">{got.size ? `${rows.filter((r) => got.has(r.key)).length} of ${rows.length}` : `${rows.length} items`}</span>
					{/if}
				{/snippet}
				<ul class={['flex flex-col', !stepRows.length && '@min-[560px]:grid @min-[560px]:grid-cols-2 @min-[560px]:gap-x-4']} data-slot="ingredients">
					{#each rows as r (r.key)}
						{@const ticked = got.has(r.key)}
						{@const amount = qtyLabel(r.qty === undefined ? undefined : r.qty * factor, r.unit)}
						<li class="border-b border-ripple-border/60 last:border-b-0">
							<button
								type="button"
								role="checkbox"
								aria-checked={ticked}
								class={['flex w-full items-start gap-2.5 rounded py-2 text-left', focusRing]}
								onclick={() => (ticked ? got.delete(r.key) : got.add(r.key))}
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
									{#if amount}<span class="font-semibold tabular-nums" data-slot="qty">{amount}</span>{' '}{/if}{r.name}{#if r.note}<span class="text-ripple-muted-foreground">, {r.note}</span>{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</SectionCard>

			{#if stepRows.length}
				<SectionCard title="Steps" icon={ListOrdered}>
					{#snippet aside()}
						<span class="text-footnote tabular-nums">{doneSet.size ? `${stepRows.filter((s) => doneSet.has(s.i)).length} of ${stepRows.length} done` : `${stepRows.length} steps`}</span>
					{/snippet}
					<ol class="flex flex-col" data-slot="steps">
						{#each stepRows as s, k (s.key)}
							{@const isDone = doneSet.has(s.i)}
							<li class="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2.5" data-done={isDone}>
								<div class="relative flex justify-center">
									{#if k < stepRows.length - 1}
										<span class={['absolute top-8 bottom-1 w-px', isDone ? 'bg-ripple-success' : 'bg-ripple-border']} aria-hidden="true"></span>
									{/if}
									<button
										type="button"
										role="checkbox"
										aria-checked={isDone}
										aria-label="Step {k + 1}"
										class={[
											'relative grid size-7 place-items-center rounded-full text-footnote font-semibold tabular-nums transition-colors duration-150 motion-reduce:transition-none',
											focusRing,
											isDone ? 'bg-ripple-success text-ripple-success-foreground' : 'bg-ripple-muted hover:bg-ripple-border'
										]}
										onclick={() => toggleStep(s.i)}
									>
										{#if isDone}<Check size={14} strokeWidth={2.5} aria-hidden="true" />{:else}{k + 1}{/if}
									</button>
								</div>
								<div class={['min-w-0 pt-1', k < stepRows.length - 1 ? 'pb-4' : 'pb-1']}>
									<p class={['text-callout text-pretty', isDone && 'text-ripple-muted-foreground']}>{s.text}</p>
									{#if s.minutes || s.tip}
										<div class="mt-1.5 flex flex-wrap items-start gap-1.5">
											{#if s.minutes}
												<span class="inline-flex items-center gap-1 rounded-md bg-ripple-muted px-1.5 py-0.5 text-footnote tabular-nums">
													<Timer size={12} strokeWidth={2} aria-hidden="true" class="text-ripple-muted-foreground" />{duration(s.minutes)}
												</span>
											{/if}
											{#if s.tip}
												<p class="flex min-w-0 basis-full items-start gap-1.5 rounded-md border border-dashed border-ripple-border px-2 py-1.5 text-footnote text-ripple-muted-foreground">
													<Lightbulb size={12} strokeWidth={2} aria-hidden="true" class="mt-[3px] shrink-0 text-ripple-warning-text" /><span class="min-w-0">{s.tip}</span>
												</p>
											{/if}
										</div>
									{/if}
								</div>
							</li>
						{/each}
					</ol>
				</SectionCard>
			{/if}
		</div>
	</div>
</div>
