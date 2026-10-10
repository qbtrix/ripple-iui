<!--
  widgets/composite/IntervalWorkout.svelte — `interval-workout`: a real
  interval timer for a model-written workout (design doc 2026-10-09 §3.8).
  The model writes exercises, work and rest seconds and rounds; the widget
  builds the session (work, rest, work, ... across rounds), counts each
  interval down in seconds on a ring, shows the current and next exercise,
  and tracks the whole session by round.

  Invariants:
  - `workSec` is the one bound field (bind contract `workSec` /
    `onworksecchange`); the work stepper writes it. `restSec` and `step` (the
    interval index) are Svelte-side $bindables.
  - An interval's length is read when it starts, so a changed work time
    applies from the next interval. Until Start the display follows the
    props, so a streamed card ends equal to a whole one; nothing starts on
    its own.
  - The clock is a deadline on Date.now() checked every 200ms, so a late tick
    never adds time. It pauses when the tab is hidden and never auto-resumes.
  - Reduced motion swaps the ring for plain digits in CSS (motion-reduce),
    not JS, so the prerendered page hydrates the same everywhere.
-->
<script module lang="ts">
	import type { ExerciseKind } from '../data-kit/icons.js';
	import { clampSec, clock, finite } from '../data-kit/format.js';

	// Shared with focus-timer; re-exported for this widget's callers and tests.
	export { clampSec, clock };

	export interface WorkoutExercise {
		id?: string;
		name: string;
		cue?: string;
		kind?: ExerciseKind;
	}
	/** One timed block. On an automatic rest, `ex` is the exercise coming up. */
	export interface WorkoutInterval {
		phase: 'work' | 'rest';
		ex: number;
		round: number;
	}

	export const WORK = { min: 5, max: 600, step: 5, fallback: 40 } as const;
	export const REST = { min: 0, max: 300, step: 5, fallback: 20 } as const;
	export const MAX_ROUNDS = 20;

	/**
	 * Work, rest, work, ... across rounds. A `rest`-kind exercise is itself a
	 * rest, so no automatic rest is added next to it.
	 */
	export function buildPlan(kinds: readonly (string | undefined)[], rounds: number): WorkoutInterval[] {
		const plan: WorkoutInterval[] = [];
		for (let round = 0; round < rounds; round++) {
			kinds.forEach((kind, ex) => {
				const isRest = kind === 'rest';
				const prev = plan.at(-1);
				if (prev && prev.phase === 'work' && !isRest) plan.push({ phase: 'rest', ex, round });
				plan.push({ phase: isRest ? 'rest' : 'work', ex, round });
			});
		}
		return plan;
	}

	function rec(v: unknown): Record<string, unknown> {
		return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
	}
</script>

<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import SkipBack from '@lucide/svelte/icons/skip-back';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import { safeArray } from '$lib/utils/safe-props.js';
	import { VerdictLine, EXERCISE_ICONS, kindIcon, plain, sum, rise } from '../data-kit/index.js';
	import type { Verdict } from '../data-kit/types.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		subtitle?: string;
		verdict?: Verdict;
		exercises?: WorkoutExercise[];
		/** Seconds of work per exercise. Bindable; a change applies from the next interval. */
		workSec?: number;
		/** Seconds of rest between exercises; 0 skips rests. Bindable. */
		restSec?: number;
		/** Times through the list. Default 1. */
		rounds?: number;
		/** Index of the current interval (work and rest both count). Bindable. */
		step?: number;
		onworksecchange?: (sec: number) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		subtitle,
		verdict,
		exercises,
		workSec = $bindable(),
		restSec = $bindable(),
		rounds,
		step = $bindable(0),
		onworksecchange
	}: Props = $props();

	const uid = $props.id();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);

	const heading = $derived(plain(title));
	const sub = $derived(plain(subtitle));

	const list = $derived(
		safeArray<unknown>(exercises, { widget: 'interval-workout', key: 'exercises' }).flatMap((raw, i) => {
			// A model habit: exercises as bare names.
			const e = typeof raw === 'string' ? { name: raw } : rec(raw);
			const name = plain(e.name);
			if (!name) return [];
			return [{ key: `${e.id ?? ''}:${i}`, name, cue: plain(e.cue), kind: typeof e.kind === 'string' ? e.kind : undefined }];
		})
	);
	const work = $derived(clampSec(workSec, WORK));
	const rest = $derived(clampSec(restSec, REST));
	const roundCount = $derived(Math.min(Math.max(Math.trunc(finite(rounds) ?? 1), 1), MAX_ROUNDS));
	const plan = $derived(buildPlan(list.map((e) => e.kind), roundCount));
	const secOf = (iv: WorkoutInterval) => (iv.phase === 'work' ? work : rest);

	const at = $derived(Math.min(Math.max(Math.trunc(finite(step) ?? 0), 0), Math.max(plan.length - 1, 0)));
	const cur = $derived(plan[at] as WorkoutInterval | undefined);

	// ── The clock ───────────────────────────────────────────────────────────
	let running = $state(false);
	let done = $state(false);
	/** null until the current interval starts: the display then follows the props. */
	let leftMs = $state<number | null>(null);
	/** The current interval's length, read when it started. */
	let lenMs = $state(0);
	let hiddenPause = $state(false);
	let endsAt = 0;

	const liveLen = $derived(cur ? secOf(cur) * 1000 : 0);
	const len = $derived(leftMs === null ? liveLen : lenMs);
	const left = $derived(Math.min(Math.max(leftMs ?? liveLen, 0), len));
	const secsLeft = $derived(Math.ceil(left / 1000));

	function begin(i: number, carry = 0) {
		step = i;
		lenMs = plan[i] ? secOf(plan[i]) * 1000 : 0;
		leftMs = Math.max(lenMs + carry, 0);
		endsAt = Date.now() + leftMs;
	}

	function tickClock() {
		leftMs = endsAt - Date.now();
		if (leftMs > 0) return;
		// Carry the overshoot so a late tick never stretches the session.
		if (at + 1 >= plan.length) finish();
		else begin(at + 1, leftMs);
	}

	function play() {
		if (!plan.length) return;
		if (done) {
			done = false;
			step = 0;
			leftMs = null;
		}
		hiddenPause = false;
		if (leftMs === null) begin(at);
		else endsAt = Date.now() + leftMs;
		running = true;
	}

	function pause() {
		if (!running) return;
		leftMs = Math.max(endsAt - Date.now(), 0);
		running = false;
	}

	function finish() {
		running = false;
		done = true;
		leftMs = null;
	}

	function jump(i: number) {
		if (!plan[i]) return;
		done = false;
		if (running) begin(i);
		else {
			step = i;
			leftMs = null;
		}
	}

	$effect(() => {
		if (!running) return;
		const timer = setInterval(tickClock, 200);
		return () => clearInterval(timer);
	});

	function onVisibility() {
		if (document.hidden && running) {
			pause();
			hiddenPause = true;
		}
	}

	// ── Navigation ──────────────────────────────────────────────────────────
	const workAt = $derived(plan.flatMap((iv, i) => (iv.phase === 'work' ? [i] : [])));
	const prevWork = $derived(workAt.findLast((i) => i < at) ?? 0);
	const nextWork = $derived(workAt.find((i) => i > at));

	const back = () => jump(prevWork);
	const next = () => (nextWork === undefined ? finish() : jump(nextWork));

	/** Exercise i in the current round (for a rest-kind exercise, its own rest). */
	function jumpToExercise(i: number) {
		const r = cur?.round ?? 0;
		jump(plan.findIndex((iv) => iv.round === r && iv.ex === i && (iv.phase === 'work' || list[i]?.kind === 'rest')));
	}

	// ── Settings ────────────────────────────────────────────────────────────
	function setWork(sec: number) {
		const v = clampSec(sec, WORK);
		if (v === work) return;
		workSec = v;
		onworksecchange?.(v);
	}
	function setRest(sec: number) {
		const v = clampSec(sec, REST);
		if (v !== rest) restSec = v;
	}
	/** The current interval started before a change to its own setting. */
	const pending = $derived(leftMs !== null && !done && lenMs !== liveLen);

	// ── What to show ────────────────────────────────────────────────────────
	const curEx = $derived(cur ? list[cur.ex] : undefined);
	const isRest = $derived(cur?.phase === 'rest');
	const manualRest = $derived(isRest && curEx?.kind === 'rest');
	const upNext = $derived(nextWork === undefined ? undefined : list[plan[nextWork].ex]);
	const heroName = $derived(isRest && !manualRest ? 'Rest' : (curEx?.name ?? ''));
	const heroCue = $derived(isRest && !manualRest ? '' : (curEx?.cue ?? ''));
	const HeroIcon = $derived(isRest ? EXERCISE_ICONS.rest : kindIcon(EXERCISE_ICONS, curEx?.kind));
	const started = $derived(leftMs !== null);
	const phaseWord = $derived(
		running ? (isRest ? 'Rest' : 'Work') : started ? 'Paused' : at === 0 ? 'Ready' : isRest ? 'Rest' : 'Work'
	);
	const playLabel = $derived(running ? 'Pause' : started ? 'Resume' : 'Start');

	/** Time per round, the current interval at its started length. */
	const segs = $derived.by(() => {
		const out = Array.from({ length: roundCount }, () => ({ total: 0, gone: 0 }));
		plan.forEach((iv, i) => {
			const ms = i === at ? len : secOf(iv) * 1000;
			const seg = out[iv.round];
			seg.total += ms;
			if (done || i < at) seg.gone += ms;
			else if (i === at) seg.gone += len - left;
		});
		return out;
	});
	const totalMs = $derived(sum(segs.map((s) => s.total)));
	const goneMs = $derived(sum(segs.map((s) => s.gone)));
	const pct = $derived(totalMs > 0 ? Math.round((goneMs / totalMs) * 100) : 0);

	const meta = $derived(
		[
			totalMs ? `${Math.max(1, Math.round(totalMs / 60000))} min` : '',
			list.length ? `${list.length} ${list.length === 1 ? 'exercise' : 'exercises'}` : '',
			roundCount > 1 ? `${roundCount} rounds` : '',
			`${work}s on, ${rest}s off`
		]
			.filter(Boolean)
			.join(' · ')
	);

	/** Announced once per interval, not per second. */
	const live = $derived(
		done
			? 'Workout complete.'
			: running && cur
				? isRest && !manualRest
					? `Rest, ${Math.round(len / 1000)} seconds.${upNext ? ` Up next: ${upNext.name}.` : ''}`
					: `${heroName}, ${Math.round(len / 1000)} seconds.`
				: ''
	);

	// Ring geometry: r=46 in a 100 box.
	const C = 2 * Math.PI * 46;
	const frac = $derived(len > 0 ? left / len : 1);

	let showList = $state(false);
	const listId = `${uid}-list`;

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const roundBtn = [
		'grid size-10 place-items-center rounded-full border border-ripple-border text-ripple-surface-foreground transition-colors duration-150 hover:bg-ripple-muted disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none',
		focusRing
	];
</script>

<svelte:document onvisibilitychange={onVisibility} />

{#snippet stepper(label: string, value: number, set: (v: number) => void, r: typeof WORK | typeof REST)}
	<div role="group" aria-label="{label} time" class="inline-flex h-8 items-center rounded-md bg-ripple-muted">
		<button
			type="button"
			class={['grid size-8 place-items-center rounded-md text-ripple-muted-foreground hover:text-ripple-surface-foreground disabled:opacity-40', focusRing]}
			aria-label="Less {label.toLowerCase()} time"
			disabled={value <= r.min}
			onclick={() => set(value - r.step)}
		>
			<Minus size={14} strokeWidth={1.75} aria-hidden="true" />
		</button>
		<span class="min-w-16 px-1 text-center text-callout tabular-nums">
			<span class="text-ripple-muted-foreground">{label}</span>
			<span class="font-medium">{value}s</span>
		</span>
		<button
			type="button"
			class={['grid size-8 place-items-center rounded-md text-ripple-muted-foreground hover:text-ripple-surface-foreground disabled:opacity-40', focusRing]}
			aria-label="More {label.toLowerCase()} time"
			disabled={value >= r.max}
			onclick={() => set(value + r.step)}
		>
			<Plus size={14} strokeWidth={1.75} aria-hidden="true" />
		</button>
	</div>
{/snippet}

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="interval-workout">
	<div class="flex flex-col gap-3">
		{#if heading || sub || list.length}
			<header class="flex min-w-0 flex-col gap-0.5">
				{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}
				{#if sub}<p class="text-callout text-ripple-muted-foreground">{sub}</p>{/if}
				{#if list.length}<p class="text-footnote text-ripple-muted-foreground tabular-nums" data-slot="meta">{meta}</p>{/if}
			</header>
		{/if}

		<VerdictLine {verdict} />

		{#if !list.length}
			<p class="rounded-ripple border border-ripple-border bg-ripple-surface px-3 py-4 text-callout text-ripple-muted-foreground">
				No exercises yet. Ask for a workout.
			</p>
		{:else}
			<section
				class="flex flex-col gap-4 rounded-ripple border border-ripple-border bg-ripple-surface p-4"
				aria-label="Workout player"
				data-slot="player"
				data-phase={done ? 'done' : isRest ? 'rest' : 'work'}
				data-running={running}
			>
				{#if done}
					<div class="flex flex-col items-center gap-3 py-4 text-center" in:rise={{ index: 0 }}>
						<span class="grid size-14 place-items-center rounded-full bg-ripple-success text-ripple-success-foreground">
							<Check size={28} strokeWidth={2.25} aria-hidden="true" />
						</span>
						<div>
							<p class="text-title-2 font-semibold">Workout done</p>
							<p class="text-callout text-ripple-muted-foreground tabular-nums">
								{clock(totalMs / 1000)} · {list.length} {list.length === 1 ? 'exercise' : 'exercises'}{roundCount > 1 ? ` × ${roundCount} rounds` : ''}
							</p>
						</div>
						<button
							type="button"
							class={['inline-flex h-11 items-center gap-2 rounded-full bg-ripple-accent px-5 text-body-emph text-ripple-accent-foreground transition-opacity hover:opacity-90', focusRing]}
							onclick={play}
						>
							<RotateCcw size={16} strokeWidth={2} aria-hidden="true" />Start again
						</button>
					</div>
				{:else}
					<div class="grid items-center gap-4 @min-[560px]:grid-cols-[auto_minmax(0,1fr)] @min-[560px]:gap-6">
						<div class="relative mx-auto grid size-44 place-items-center @min-[720px]:size-52" data-slot="dial">
							<svg class="absolute inset-0 size-full -rotate-90 motion-reduce:hidden" viewBox="0 0 100 100" aria-hidden="true">
								<circle cx="50" cy="50" r="46" fill="none" stroke-width="3" class="stroke-ripple-border" />
								<circle
									cx="50"
									cy="50"
									r="46"
									fill="none"
									stroke-width="5"
									stroke-linecap="round"
									stroke-dasharray={C}
									stroke-dashoffset={C * (1 - frac)}
									class={[isRest ? 'stroke-ripple-success' : 'stroke-ripple-accent', 'transition-[stroke-dashoffset] duration-200 ease-linear']}
								/>
							</svg>
							<span class="absolute inset-3 hidden rounded-full bg-ripple-muted motion-reduce:block" aria-hidden="true"></span>
							<div class="relative flex flex-col items-center">
								<span
									class={[
										'text-caption-1 font-medium tracking-[0.04em] uppercase',
										isRest ? 'text-ripple-success-text' : 'text-ripple-muted-foreground'
									]}
									data-slot="phase">{phaseWord}</span
								>
								<span
									role="timer"
									aria-label="{secsLeft} seconds left"
									class="text-[44px] leading-none font-semibold tabular-nums @min-[720px]:text-[52px]"
									data-slot="clock">{secsLeft >= 60 ? clock(secsLeft) : secsLeft}</span
								>
								<span class="mt-1 text-footnote text-ripple-muted-foreground">{secsLeft >= 60 ? 'min' : 'sec'}</span>
							</div>
						</div>

						<div class="flex min-w-0 flex-col items-center gap-3 text-center @min-[560px]:items-start @min-[560px]:text-left">
							<p class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase tabular-nums">
								Exercise {(cur?.ex ?? 0) + 1} of {list.length}{roundCount > 1 ? ` · Round ${(cur?.round ?? 0) + 1} of ${roundCount}` : ''}
							</p>
							<div class="flex min-w-0 items-center gap-2.5">
								<span
									class={[
										'grid size-10 shrink-0 place-items-center rounded-md',
										isRest ? 'bg-ripple-success/12 text-ripple-success-text' : 'bg-ripple-muted text-ripple-surface-foreground'
									]}
								>
									<HeroIcon size={20} strokeWidth={1.75} aria-hidden="true" />
								</span>
								<h3 class="min-w-0 text-title-2 font-semibold text-balance" data-slot="current">{heroName}</h3>
							</div>
							{#if heroCue}<p class="max-w-prose text-callout text-pretty text-ripple-muted-foreground">{heroCue}</p>{/if}
							<p class="text-callout" data-slot="next">
								{#if upNext}
									<span class="text-ripple-muted-foreground">{isRest && !manualRest ? 'Up next:' : 'Next:'}</span>
									<span class="font-medium">{upNext.name}</span>
									{#if isRest && !manualRest && upNext.cue}<span class="block text-ripple-muted-foreground">{upNext.cue}</span>{/if}
								{:else}
									<span class="text-ripple-muted-foreground">Last one. Finish strong.</span>
								{/if}
							</p>

							<div class="flex items-center gap-3">
								<button type="button" class={roundBtn} aria-label="Previous exercise" disabled={at === 0 && !started} onclick={back}>
									<SkipBack size={16} strokeWidth={1.75} aria-hidden="true" />
								</button>
								<button
									type="button"
									class={['inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-full bg-ripple-accent px-5 text-body-emph text-ripple-accent-foreground transition-opacity hover:opacity-90', focusRing]}
									onclick={running ? pause : play}
								>
									{#if running}<Pause size={16} strokeWidth={2} aria-hidden="true" />{:else}<Play size={16} strokeWidth={2} aria-hidden="true" />{/if}
									{playLabel}
								</button>
								<button type="button" class={roundBtn} aria-label="Next exercise" onclick={next}>
									<SkipForward size={16} strokeWidth={1.75} aria-hidden="true" />
								</button>
							</div>
							{#if hiddenPause}
								<p class="text-footnote text-ripple-muted-foreground" data-slot="away">Paused while the tab was hidden. Resume when you're ready.</p>
							{/if}
						</div>
					</div>
				{/if}

				<div class="flex flex-col gap-1.5" data-slot="progress">
					<div class="flex items-center justify-between gap-2 text-footnote text-ripple-muted-foreground tabular-nums">
						<span>{pct}% done</span>
						<span>{clock((totalMs - goneMs) / 1000)} left</span>
					</div>
					<div
						class="flex gap-1"
						role="progressbar"
						aria-label="Session progress"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={pct}
					>
						{#each segs as s, i (i)}
							<div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ripple-border" title={roundCount > 1 ? `Round ${i + 1}` : undefined}>
								<div
									class="absolute inset-y-0 left-0 rounded-full bg-ripple-accent transition-[width] duration-200 ease-linear motion-reduce:transition-none"
									style:width="{s.total > 0 ? Math.min((s.gone / s.total) * 100, 100) : 0}%"
								></div>
							</div>
						{/each}
					</div>
				</div>

				<div class="flex flex-wrap items-center justify-center gap-2 @min-[560px]:justify-start" data-slot="settings">
					{@render stepper('Work', work, setWork, WORK)}
					{@render stepper('Rest', rest, setRest, REST)}
					{#if pending}
						<span class="text-footnote text-ripple-muted-foreground">Your change starts with the next interval.</span>
					{/if}
				</div>
			</section>

			<section class="rounded-ripple border border-ripple-border bg-ripple-surface" data-slot="list">
				<button
					type="button"
					class={['flex w-full items-center gap-2 rounded-ripple px-3 py-2.5 text-left @min-[720px]:hidden', focusRing]}
					aria-expanded={showList}
					aria-controls={listId}
					onclick={() => (showList = !showList)}
				>
					<ListOrdered size={16} strokeWidth={1.75} aria-hidden="true" class="text-ripple-muted-foreground" />
					<span class="flex-1 text-body-emph">All exercises</span>
					<span class="text-footnote text-ripple-muted-foreground tabular-nums">{list.length}</span>
					<ChevronDown
						size={16}
						strokeWidth={1.75}
						aria-hidden="true"
						class="text-ripple-muted-foreground transition-transform duration-150 motion-reduce:transition-none {showList ? 'rotate-180' : ''}"
					/>
				</button>
				<h3 class="hidden px-3 pt-3 text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase @min-[720px]:block">
					Exercises{roundCount > 1 ? ` · round ${(cur?.round ?? 0) + 1} of ${roundCount}` : ''}
				</h3>
				<ol id={listId} class={[showList ? 'flex' : 'hidden', 'flex-col divide-y divide-ripple-border px-3 pb-1.5 @min-[720px]:flex']}>
					{#each list as e, i (e.key)}
						{@const KindIcon = kindIcon(EXERCISE_ICONS, e.kind)}
						{@const isDone = done || (cur !== undefined && i < cur.ex)}
						{@const isNow = !done && cur?.ex === i}
						<li in:rise={{ index: i }} data-done={isDone || undefined} data-now={isNow || undefined}>
							<button
								type="button"
								class={['flex w-full items-center gap-2.5 rounded-md py-2 text-left', focusRing]}
								aria-current={isNow ? 'step' : undefined}
								onclick={() => jumpToExercise(i)}
							>
								<span
									class={[
										'grid size-8 shrink-0 place-items-center rounded-md',
										isDone
											? 'bg-ripple-success text-ripple-success-foreground'
											: isNow
												? 'bg-ripple-accent text-ripple-accent-foreground'
												: 'bg-ripple-muted text-ripple-muted-foreground'
									]}
								>
									{#if isDone}
										<Check size={16} strokeWidth={2.25} aria-hidden="true" />
									{:else}
										<KindIcon size={16} strokeWidth={1.75} aria-hidden="true" />
									{/if}
								</span>
								<span class="min-w-0 flex-1">
									<span class={['block truncate text-body-emph', isDone && 'text-ripple-muted-foreground']}>{e.name}</span>
									{#if e.cue}<span class="block truncate text-footnote text-ripple-muted-foreground @min-[720px]:whitespace-normal">{e.cue}</span>{/if}
								</span>
								{#if isNow}
									<span class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">{isRest && !manualRest ? 'Next' : 'Now'}</span>
								{:else if isDone}
									<span class="sr-only">done</span>
								{/if}
							</button>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<p class="sr-only" aria-live="polite">{live}</p>
	</div>
</div>
