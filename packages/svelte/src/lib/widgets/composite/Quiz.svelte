<!--
  widgets/composite/Quiz.svelte — `quiz`: a trivia game the model fills. One
  question at a time with a progress rail, big choice tiles, instant right or
  wrong with the right answer marked and the `why` line, a streak, an optional
  per-question countdown, then a score screen with a verdict band, a review
  of the misses and Retry. Rules and scoring live in ./quiz.ts.

  Invariants:
  - `value` ({ index, answers, score, done }) is the bound field (default
    `value` / `onchange`). Nothing from props seeds $state: the play on show is
    the bound value when the host set one with answers in it, else a local Edit
    (data-kit/edit.ts) while it holds against the cleaned questions, else a
    fresh start. A re-sent spec keeps the progress; new questions start over.
  - `oncomplete` fires from the handler that records the last answer, once per
    run, never from an effect, so re-renders of a finished quiz stay quiet.
  - A timed quiz never counts down on its own: it waits for Start, so a
    streamed card and a whole one render the same. The clock is a deadline on
    Date.now() checked every 200ms; running out records null (a miss).
  - `shuffle_choices` is seeded from the run number and the question, never
    Math.random, so the server and the client deal the same order.
  - Choice tiles copy OptionList's card look but wrap real radios with right
    and wrong states, so every state also has an icon and a word.
-->
<script lang="ts">
	import { safeStyle, safeUrl } from '@ripple-ui/core';
	import { tick } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Clock from '@lucide/svelte/icons/clock';
	import Flame from '@lucide/svelte/icons/flame';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Play from '@lucide/svelte/icons/play';
	import Trophy from '@lucide/svelte/icons/trophy';
	import { PhotoTile, VerdictLine, holds, nextEdit, plain, rise } from '../data-kit/index.js';
	import type { Edit } from '../data-kit/edit.js';
	import { shuffled } from './FlashcardDeck.svelte';
	import {
		bandOf,
		bestStreakOf,
		clampSeconds,
		cleanQuestions,
		scoreOf,
		streakOf,
		toPlay,
		toValue,
		type QuizItem,
		type QuizPlay,
		type QuizValue
	} from './quiz.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		topic?: string;
		questions?: QuizItem[];
		/** Seconds per question; off when unset. A timeout counts as wrong. */
		seconds_per_question?: number;
		/** Shuffle each question's choices (a new order on every Retry). */
		shuffle_choices?: boolean;
		value?: QuizValue;
		onchange?: (value: QuizValue) => void;
		/** Fires once per run when the last question is answered. */
		oncomplete?: (result: { score: number; total: number }) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		topic,
		questions,
		seconds_per_question,
		shuffle_choices = false,
		value = $bindable(),
		onchange,
		oncomplete
	}: Props = $props();

	const uid = $props.id();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);
	const heading = $derived(plain(title));
	const sub = $derived(plain(topic));

	// One warning per message per instance: questions re-derive on every streamed chunk.
	const warned = new Set<string>();
	const warnOnce = (msg: string) => {
		if (warned.has(msg)) return;
		warned.add(msg);
		console.warn(msg);
	};
	const list = $derived(cleanQuestions(questions, warnOnce));
	const total = $derived(list.length);
	const secs = $derived(clampSeconds(seconds_per_question));

	// ── The play on show: bound value, else a holding edit, else a fresh start ──
	const FRESH: QuizPlay = { index: 0, answers: [] };
	let edit = $state.raw<Edit<QuizPlay> | null>(null);
	const same = (a: QuizPlay, b: QuizPlay) => a.index === b.index && JSON.stringify(a.answers) === JSON.stringify(b.answers);
	const play = $derived.by((): QuizPlay => {
		const bound = toPlay(value);
		// An empty bound value is a spec's initial state re-sent; it never wipes progress.
		if (bound && bound.answers.length && !(edit && same(bound, edit.value))) return bound;
		return holds(edit, list) ? edit.value : FRESH;
	});

	const answers = $derived(play.answers.slice(0, total));
	const at = $derived(Math.min(play.index, total));
	const onScoreScreen = $derived(total > 0 && at >= total && answers.length >= total);
	const q = $derived(onScoreScreen ? undefined : list[at]);
	const picked = $derived(at < answers.length ? answers[at] : undefined);
	const revealed = $derived(picked !== undefined);
	const score = $derived(scoreOf(list, answers));
	const streak = $derived(streakOf(list, answers));
	const band = $derived(bandOf(score, total));
	const misses = $derived(list.flatMap((item, i) => (i < answers.length && answers[i] !== item.answer ? [{ item, pick: answers[i] }] : [])));

	/** Shuffle seed: changes on Retry, so a new run gets a new order. */
	let run = $state(0);
	const order = $derived(
		q
			? shuffle_choices === true
				? shuffled(q.choices.map((_, i) => i), `${run}|${q.prompt}|${q.choices.join('|')}`)
				: q.choices.map((_, i) => i)
			: []
	);

	function commit(next: QuizPlay) {
		const v = toValue(list, next);
		edit = nextEdit(edit, list, { index: v.index, answers: v.answers });
		value = v;
		onchange?.(v);
	}

	// ── The clock ───────────────────────────────────────────────────────────
	let armed = $state(false);
	let leftMs = $state(0);
	let deadline = 0;
	const waitingToStart = $derived(secs !== undefined && !armed && !!q && !revealed);
	const ticking = $derived(secs !== undefined && armed && !!q && !revealed);
	const secsLeft = $derived(Math.max(0, Math.ceil(leftMs / 1000)));
	const C = 2 * Math.PI * 16;
	const frac = $derived(secs ? Math.min(Math.max(leftMs / (secs * 1000), 0), 1) : 1);

	function arm() {
		if (secs === undefined) return;
		armed = true;
		leftMs = secs * 1000;
		deadline = Date.now() + leftMs;
	}

	$effect(() => {
		if (!ticking) return;
		const timer = setInterval(() => {
			leftMs = deadline - Date.now();
			if (leftMs <= 0) answer(null);
		}, 200);
		return () => clearInterval(timer);
	});

	// ── Play ────────────────────────────────────────────────────────────────
	let root = $state<HTMLElement>();
	let arrowing = false;

	async function focusSlot(selector: '[data-slot="next"]' | '[data-slot="prompt"]' | '[data-slot="score"]') {
		await tick();
		root?.querySelector<HTMLElement>(selector)?.focus();
	}

	function answer(choice: number | null) {
		if (!q || revealed || waitingToStart) return;
		const next = [...answers, choice];
		commit({ index: at, answers: next });
		if (next.length === total) oncomplete?.({ score: scoreOf(list, next), total });
		void focusSlot('[data-slot="next"]');
	}

	function next() {
		if (!revealed) return;
		const n = at + 1;
		commit({ index: n, answers });
		if (n < total) {
			arm();
			void focusSlot('[data-slot="prompt"]');
		} else void focusSlot('[data-slot="score"]');
	}

	function start() {
		arm();
		void focusSlot('[data-slot="prompt"]');
	}

	function retry() {
		run += 1;
		commit(FRESH);
		arm();
		void focusSlot('[data-slot="prompt"]');
	}

	function onChoiceChange(i: number) {
		if (!arrowing) answer(i);
	}

	function onChoiceKey(e: KeyboardEvent, i: number) {
		if (e.key.startsWith('Arrow')) arrowing = true; // arrows browse; they never answer
		else if (e.key === 'Enter' || (e.key === ' ' && (e.currentTarget as HTMLInputElement).checked)) {
			e.preventDefault();
			answer(i);
		}
	}

	function onRootKey(e: KeyboardEvent) {
		if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
		if (/^[1-5]$/.test(e.key) && q && !revealed && !waitingToStart) {
			const choice = order[Number(e.key) - 1];
			if (choice === undefined) return;
			e.preventDefault();
			answer(choice);
		} else if (e.key === 'Enter' && revealed && !(e.target instanceof HTMLButtonElement)) {
			e.preventDefault();
			next();
		}
	}

	// A listener, not an attribute: the root is a plain container, not a control.
	$effect(() => {
		const el = root;
		if (!el) return;
		el.addEventListener('keydown', onRootKey);
		return () => el.removeEventListener('keydown', onRootKey);
	});

	const live = $derived.by(() => {
		if (onScoreScreen) return `Quiz complete. ${score} of ${total}. ${band.word}.`;
		if (!q || !revealed) return '';
		const right = q.choices[q.answer];
		if (picked === q.answer) return streak > 1 ? `Correct. ${streak} in a row.` : 'Correct.';
		return `${picked === null ? "Time's up." : 'Not quite.'} The answer is ${right}.`;
	});

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const primaryBtn = [
		'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ripple-accent px-5 text-body-emph text-ripple-accent-foreground transition-opacity hover:opacity-90',
		focusRing
	];
	const meta = $derived(
		[total ? `${total} ${total === 1 ? 'question' : 'questions'}` : '', secs ? `${secs}s each` : ''].filter(Boolean).join(' · ')
	);
</script>

<div {id} bind:this={root} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="quiz">
	<div class="flex flex-col gap-3">
		{#if heading || sub || meta}
			<header class="flex min-w-0 flex-col gap-0.5">
				{#if sub}<p class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase" data-slot="topic">{sub}</p>{/if}
				{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}
				{#if meta}<p class="text-footnote text-ripple-muted-foreground tabular-nums" data-slot="meta">{meta}</p>{/if}
			</header>
		{/if}

		{#if !total}
			<p class="rounded-ripple border border-ripple-border bg-ripple-surface px-3 py-4 text-callout text-ripple-muted-foreground">
				No questions yet. Ask for a quiz.
			</p>
		{:else if onScoreScreen}
			<section
				class="grid gap-4 rounded-ripple border border-ripple-border bg-ripple-surface p-4 @min-[720px]:grid-cols-2 @min-[720px]:gap-6"
				aria-label="Results"
				data-slot="results"
				in:rise={{ index: 0 }}
			>
				<div class="flex flex-col items-center gap-3 text-center @min-[720px]:justify-center">
					<span class="grid size-12 place-items-center rounded-full bg-ripple-accent/12 text-ripple-accent" aria-hidden="true">
						<Trophy size={22} strokeWidth={1.75} />
					</span>
					<h3 class="tabular-nums outline-none" tabindex="-1" data-slot="score">
						<span class="sr-only">Score: </span>
						<span class="text-[44px] leading-none font-semibold">{score}</span>
						<span class="text-title-2 text-ripple-muted-foreground">/ {total}</span>
					</h3>
					<p class="text-title-3 font-semibold" data-slot="band">{band.word}</p>
					<VerdictLine verdict={{ text: band.line, status: band.status }} class="justify-center" />
					<p class="text-callout text-ripple-muted-foreground tabular-nums">Best streak: {bestStreakOf(list, answers)}</p>
					<button type="button" class={[primaryBtn, 'w-full max-w-72']} onclick={retry}>
						<RotateCcw size={16} strokeWidth={2} aria-hidden="true" />Retry
					</button>
				</div>

				<div class="flex min-w-0 flex-col gap-2">
					{#if misses.length}
						<p class="text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase">
							{misses.length === 1 ? '1 to review' : `${misses.length} to review`}
						</p>
						<ul class="flex flex-col divide-y divide-ripple-border" data-slot="review">
							{#each misses as m, k (m.item.key)}
								<li class="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0" in:rise={{ index: k }}>
									<span class="grid size-8 shrink-0 place-items-center rounded-md bg-ripple-error/12 text-ripple-error-text">
										{#if m.pick === null}<Clock size={16} strokeWidth={1.75} aria-hidden="true" />{:else}<X size={16} strokeWidth={1.75} aria-hidden="true" />{/if}
									</span>
									<span class="flex min-w-0 flex-1 flex-col gap-0.5">
										<span class="text-body-emph text-pretty">{m.item.prompt}</span>
										<span class="text-callout text-pretty text-ripple-muted-foreground">
											{m.pick === null ? 'Ran out of time' : `You said ${m.item.choices[m.pick] ?? 'nothing'}`}
										</span>
										<span class="text-callout text-pretty"><span class="font-medium text-ripple-success-text">Answer:</span> {m.item.choices[m.item.answer]}</span>
										{#if m.item.why}<span class="text-callout text-pretty text-ripple-muted-foreground">{m.item.why}</span>{/if}
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="flex items-center gap-2 rounded-md bg-ripple-success/12 px-3 py-2.5 text-body-emph text-ripple-success-text">
							<Check size={16} strokeWidth={2} aria-hidden="true" />A perfect run. Nothing to review.
						</p>
					{/if}
				</div>
			</section>
		{:else if q}
			<section class="flex flex-col gap-4 rounded-ripple border border-ripple-border bg-ripple-surface p-4" aria-label="Question" data-slot="play">
				<div class="flex items-center gap-3">
					<ol class="flex min-w-0 flex-1 flex-wrap gap-1" aria-label="Progress" data-slot="rail">
						{#each list as item, k (item.key)}
							{@const a = k < answers.length ? answers[k] : undefined}
							{@const mark = a === undefined ? (k === at ? 'now' : 'todo') : a === item.answer ? 'right' : 'wrong'}
							<li
								class={[
									'grid size-5 place-items-center rounded-full text-[10px] font-semibold tabular-nums',
									mark === 'right'
										? 'bg-ripple-success text-ripple-success-foreground'
										: mark === 'wrong'
											? 'bg-ripple-error text-ripple-error-foreground'
											: mark === 'now'
												? 'bg-ripple-accent text-ripple-accent-foreground ring-2 ring-ripple-accent/30'
												: 'bg-ripple-muted text-ripple-muted-foreground'
								]}
								data-mark={mark}
								aria-current={mark === 'now' ? 'step' : undefined}
							>
								{#if mark === 'right'}<Check size={11} strokeWidth={3} aria-hidden="true" />{:else if mark === 'wrong'}<X size={11} strokeWidth={3} aria-hidden="true" />{:else}<span aria-hidden="true">{k + 1}</span>{/if}
								<span class="sr-only">Question {k + 1}: {mark === 'right' ? 'right' : mark === 'wrong' ? 'wrong' : mark === 'now' ? 'current' : 'to do'}</span>
							</li>
						{/each}
					</ol>
					{#if secs !== undefined && !waitingToStart}
						<div class="relative grid size-11 shrink-0 place-items-center" data-slot="countdown">
							<svg class="absolute inset-0 size-full -rotate-90 motion-reduce:hidden" viewBox="0 0 36 36" aria-hidden="true">
								<circle cx="18" cy="18" r="16" fill="none" stroke-width="2.5" class="stroke-ripple-border" />
								<circle
									cx="18"
									cy="18"
									r="16"
									fill="none"
									stroke-width="3"
									stroke-linecap="round"
									stroke-dasharray={C}
									stroke-dashoffset={C * (1 - (revealed ? 0 : frac))}
									class={[secsLeft <= 3 && !revealed ? 'stroke-ripple-warning' : 'stroke-ripple-accent', 'transition-[stroke-dashoffset] duration-200 ease-linear']}
								/>
							</svg>
							<span role="timer" aria-label="{revealed ? 0 : secsLeft} seconds left" class="relative text-callout font-semibold tabular-nums">
								{revealed ? '·' : secsLeft}
							</span>
						</div>
					{/if}
				</div>

				<div class="flex items-center justify-between gap-2 text-footnote text-ripple-muted-foreground tabular-nums">
					<span data-slot="position">Question {at + 1} of {total}</span>
					<span class="inline-flex items-center gap-3">
						<span data-slot="tally">Score {score}</span>
						<span class={['inline-flex items-center gap-1', streak > 1 && 'font-medium text-ripple-warning-text']} data-slot="streak">
							<Flame size={13} strokeWidth={2} aria-hidden="true" />Streak {streak}
						</span>
					</span>
				</div>

				{#if waitingToStart}
					<div class="flex flex-col items-center gap-3 py-6 text-center" data-slot="start">
						<p class="text-callout text-ripple-muted-foreground">
							{at === 0 ? `${total} questions, ${secs} seconds each. Running out counts as a miss.` : 'Paused. The clock restarts when you resume.'}
						</p>
						<button type="button" class={primaryBtn} onclick={start}>
							<Play size={16} strokeWidth={2} aria-hidden="true" />{at === 0 ? 'Start quiz' : 'Resume'}
						</button>
					</div>
				{:else}
					{#key at}
						<div class="flex flex-col gap-3" in:rise>
							{#if q.image && safeUrl(q.image, { kind: 'resource' })}
								<PhotoTile src={safeUrl(q.image, { kind: 'resource' })} ratio="16:9" class="w-full max-h-[200px]" />
							{/if}
							<div class="flex min-w-0 flex-col gap-3">
								<h3 id="{uid}-prompt" class="text-title-2 font-semibold text-balance outline-none" tabindex="-1" data-slot="prompt">{q.prompt}</h3>
								<div role="radiogroup" aria-labelledby="{uid}-prompt" class="grid grid-cols-1 gap-2 @min-[480px]:grid-cols-2" data-slot="choices">
									{#each order as ci, pos (ci)}
										{@const isRight = revealed && ci === q.answer}
										{@const isWrongPick = revealed && ci === picked && ci !== q.answer}
										<label
											data-choice={ci}
											data-state={isRight ? 'right' : isWrongPick ? 'wrong' : revealed ? 'idle' : 'open'}
											class={[
												'relative flex min-h-14 min-w-0 items-center gap-3 rounded-ripple border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out motion-reduce:transition-none',
												'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ripple-ring',
												isRight
													? 'border-ripple-success bg-ripple-success/10 ring-1 ring-inset ring-ripple-success/30'
													: isWrongPick
														? 'border-ripple-error bg-ripple-error/10 ring-1 ring-inset ring-ripple-error/30'
														: revealed
															? 'border-ripple-border/70 bg-ripple-surface opacity-60'
															: 'cursor-pointer border-ripple-border/70 bg-ripple-surface hover:-translate-y-0.5 hover:border-ripple-accent/50 hover:shadow-sm has-[:checked]:border-ripple-accent motion-reduce:hover:translate-y-0'
											]}
										>
											<input
												class="sr-only"
												type="radio"
												name={uid}
												value={ci}
												checked={revealed && ci === picked}
												disabled={revealed}
												aria-keyshortcuts={pos < 5 ? String(pos + 1) : undefined}
												onchange={() => onChoiceChange(ci)}
												onkeydown={(e) => onChoiceKey(e, ci)}
												onkeyup={() => (arrowing = false)}
											/>
											<span
												aria-hidden="true"
												class={[
													'grid size-8 shrink-0 place-items-center rounded-lg text-callout font-semibold tabular-nums',
													isRight
														? 'bg-ripple-success text-ripple-success-foreground'
														: isWrongPick
															? 'bg-ripple-error text-ripple-error-foreground'
															: 'bg-ripple-muted text-ripple-muted-foreground'
												]}
											>
												{#if isRight}<Check size={16} strokeWidth={3} />{:else if isWrongPick}<X size={16} strokeWidth={3} />{:else}{pos + 1}{/if}
											</span>
											<span class="min-w-0 flex-1 text-body-emph text-pretty">{q.choices[ci]}</span>
											{#if isRight}
												<span class="shrink-0 text-footnote font-medium text-ripple-success-text">{picked === ci ? 'Your pick, correct' : 'Correct answer'}</span>
											{:else if isWrongPick}
												<span class="shrink-0 text-footnote font-medium text-ripple-error-text">Your pick</span>
											{/if}
										</label>
									{/each}
								</div>
							</div>

							{#if revealed}
								<div class="flex flex-col gap-3 @min-[480px]:flex-row @min-[480px]:items-center @min-[480px]:justify-between" in:rise>
									<div class="flex min-w-0 flex-col gap-1" data-slot="feedback">
										<p
											class={[
												'inline-flex items-center gap-1.5 text-body-emph',
												picked === q.answer ? 'text-ripple-success-text' : 'text-ripple-error-text'
											]}
											data-slot="outcome"
										>
											{#if picked === q.answer}
												<Check size={16} strokeWidth={2.5} aria-hidden="true" />Correct{streak > 1 ? `, ${streak} in a row` : ''}
											{:else if picked === null}
												<Clock size={16} strokeWidth={2.5} aria-hidden="true" />Time's up
											{:else}
												<X size={16} strokeWidth={2.5} aria-hidden="true" />Not quite
											{/if}
										</p>
										{#if q.why}<p class="max-w-prose text-callout text-pretty text-ripple-muted-foreground" data-slot="why">{q.why}</p>{/if}
									</div>
									<button type="button" class={[primaryBtn, 'shrink-0']} data-slot="next" onclick={next}>
										{at + 1 < total ? 'Next' : 'See results'}<ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
									</button>
								</div>
							{:else}
								<p class="hidden text-center text-footnote text-ripple-muted-foreground @min-[480px]:block">
									Press 1 to {Math.min(order.length, 5)} to answer, Enter for the next question.
								</p>
							{/if}
						</div>
					{/key}
				{/if}
			</section>
		{/if}

		<p class="sr-only" aria-live="polite">{live}</p>
	</div>
</div>
