<!--
  widgets/composite/FocusTimer.svelte: `focus-timer` (aliases `pomodoro`,
  `pomodoro-timer`). A focus-session timer: focus, short break, and a long
  break after every Nth focus round, with a rounds row against an optional
  daily goal, a log of when each focus round finished, an editable task line
  and a durations drawer. The model writes the durations; the widget runs it.

  Invariants:
  - `value` is the one bound field (default `value` / `onchange`):
    { phase, remaining_s, running, rounds_done, task, log }. It is written on
    events only (start, pause, reset, skip, phase end, task or duration
    edit), never per second, so `remaining_s` is as of the last event. A
    bound value that is not our own echo is adopted (a restored session);
    a restored running timer comes back paused, since its start is unknown.
  - The clock is a deadline on Date.now(). `settle()` runs on every tick and
    on `visibilitychange`, so a phase that ended while the tab was hidden is
    closed at its own end time (log entries use the deadline, not now), and
    with `auto_start_next` several phases can close in one settle.
  - Durations and the task are props the visitor can edit: a local Edit
    (data-kit/edit.ts) holds against a re-sent spec and gives way to new
    values. Nothing is seeded from a prop into $state, and before Start the
    display follows the props, so a streamed card ends equal to a whole one.
  - The dial is a button: Space or Enter on it (or on the play button) starts
    or pauses. The live region changes on phase changes and start or pause
    only. The widget never touches document.title and plays no sound.
-->
<script module lang="ts">
	export type FocusPhase = 'focus' | 'short' | 'long';

	export interface FocusValue {
		phase: FocusPhase;
		remaining_s: number;
		running: boolean;
		rounds_done: number;
		task: string;
		/** ISO time each focus round finished, oldest first. */
		log: string[];
	}

	export const FOCUS = { min: 1, max: 120, fallback: 25 } as const;
	export const SHORT = { min: 1, max: 60, fallback: 5 } as const;
	export const LONG = { min: 1, max: 60, fallback: 15 } as const;
	export const EVERY = { min: 1, max: 12, fallback: 4 } as const;
	export const GOAL = { min: 1, max: 24, fallback: 0 } as const;
	const MAX_LOG = 100;

	export const PHASE_LABEL: Record<FocusPhase, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };

	/** The phase after `ended`; `done` counts the focus rounds finished so far, the one that just ended included. */
	export function nextPhase(ended: FocusPhase, done: number, every: number): FocusPhase {
		if (ended !== 'focus') return 'focus';
		return done > 0 && done % every === 0 ? 'long' : 'short';
	}

	const isPhase = (v: unknown): v is FocusPhase => v === 'focus' || v === 'short' || v === 'long';
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { safeStyle } from '@ripple-ui/core';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { clampSec, clock, finite, holds, nextEdit, plain } from '../data-kit/index.js';
	import type { Edit } from '../data-kit/edit.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		/** Minutes of focus, 1 to 120. Default 25. */
		focus_min?: number;
		/** Minutes of short break, 1 to 60. Default 5. */
		short_break_min?: number;
		/** Minutes of long break, 1 to 60. Default 15. */
		long_break_min?: number;
		/** Focus rounds before a long break, 1 to 12. Default 4. */
		rounds_before_long?: number;
		/** Focus rounds to aim for today, 1 to 24. */
		goal_rounds?: number;
		/** What the visitor is focusing on; editable. */
		task?: string;
		/** Start the next phase on its own when one ends. Default false. */
		auto_start_next?: boolean;
		/** Two-way bindable session state. */
		value?: FocusValue;
		onchange?: (value: FocusValue) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		focus_min,
		short_break_min,
		long_break_min,
		rounds_before_long,
		goal_rounds,
		task,
		auto_start_next,
		value = $bindable(),
		onchange
	}: Props = $props();

	const uid = $props.id();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);
	const heading = $derived(plain(title));
	const auto = $derived(auto_start_next === true || (auto_start_next as unknown) === 'true');
	const goal = $derived(finite(goal_rounds) === undefined ? 0 : clampSec(goal_rounds, GOAL));

	// ── Durations and task: the props, unless a local edit holds ────────────
	type Durations = { focus: number; short: number; long: number; every: number };
	const seed = $derived<Durations>({
		focus: clampSec(focus_min, FOCUS),
		short: clampSec(short_break_min, SHORT),
		long: clampSec(long_break_min, LONG),
		every: clampSec(rounds_before_long, EVERY)
	});
	let durEdit = $state.raw<Edit<Durations> | null>(null);
	const dur = $derived(holds(durEdit, seed) ? durEdit.value : seed);

	const taskSeed = $derived(plain(task));
	let taskEdit = $state.raw<Edit<string> | null>(null);
	const taskNow = $derived(holds(taskEdit, taskSeed) ? taskEdit.value : taskSeed);

	const phaseMs = (p: FocusPhase) => (p === 'focus' ? dur.focus : p === 'short' ? dur.short : dur.long) * 60_000;

	// ── The session ─────────────────────────────────────────────────────────
	let phase = $state<FocusPhase>('focus');
	let roundsDone = $state(0);
	let log = $state.raw<string[]>([]);
	let running = $state(false);
	/** null until the phase starts: the display then follows the durations. */
	let leftMs = $state<number | null>(null);
	/** The phase's length, read when it started. */
	let lenMs = $state(0);
	/** A phase ended and the next waits for Start. */
	let waiting = $state(false);
	let flash = $state(false);
	let endsAt = 0;

	const started = $derived(leftMs !== null);
	const len = $derived(started ? lenMs : phaseMs(phase));
	const left = $derived(Math.min(Math.max(leftMs ?? len, 0), len));
	const secsLeft = $derived(Math.ceil(left / 1000));

	// ── Bound value ─────────────────────────────────────────────────────────
	let lastSig = '';
	const sig = (v: unknown) => {
		try {
			return JSON.stringify(v) ?? '';
		} catch {
			return '';
		}
	};

	function emit() {
		const v: FocusValue = { phase, remaining_s: secsLeft, running, rounds_done: roundsDone, task: taskNow, log: [...log] };
		lastSig = sig(v);
		value = v;
		onchange?.(v);
	}

	/** A bound value we did not write: a restored or host-set session. */
	function adopt(v: Record<string, unknown>) {
		lastSig = sig(v);
		running = false;
		waiting = false;
		phase = isPhase(v.phase) ? v.phase : 'focus';
		roundsDone = Math.max(0, Math.trunc(finite(v.rounds_done) ?? 0));
		log = Array.isArray(v.log) ? v.log.filter((s): s is string => typeof s === 'string' && !Number.isNaN(Date.parse(s))).slice(-MAX_LOG) : [];
		if (typeof v.task === 'string' && plain(v.task) !== taskNow) taskEdit = nextEdit(taskEdit, taskSeed, plain(v.task));
		const rs = finite(v.remaining_s);
		lenMs = phaseMs(phase);
		leftMs = rs === undefined || rs * 1000 >= lenMs ? null : Math.max(rs * 1000, 0);
	}

	$effect(() => {
		const v = value;
		if (v === null || typeof v !== 'object' || Array.isArray(v)) return;
		if (sig(v) === lastSig) return;
		untrack(() => adopt(v as unknown as Record<string, unknown>));
	});

	// ── The clock ───────────────────────────────────────────────────────────
	function begin(p: FocusPhase, at: number) {
		phase = p;
		lenMs = phaseMs(p);
		endsAt = at + lenMs;
		leftMs = endsAt - Date.now();
		running = true;
		waiting = false;
	}

	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	function flashNow() {
		flash = true;
		clearTimeout(flashTimer);
		flashTimer = setTimeout(() => (flash = false), 1200);
	}

	/** Close every phase whose deadline has passed, at its own end time. */
	function settle() {
		if (!running) return;
		const now = Date.now();
		let ended = false;
		while (running && endsAt <= now) {
			const at = endsAt;
			if (phase === 'focus') {
				roundsDone += 1;
				log = [...log, new Date(at).toISOString()].slice(-MAX_LOG);
			}
			const next = nextPhase(phase, roundsDone, dur.every);
			ended = true;
			if (auto) begin(next, at);
			else {
				phase = next;
				running = false;
				leftMs = null;
				waiting = true;
			}
		}
		if (running) leftMs = endsAt - now;
		if (ended) {
			flashNow();
			emit();
		}
	}

	function play() {
		if (running) return;
		if (leftMs === null) begin(phase, Date.now());
		else {
			endsAt = Date.now() + leftMs;
			running = true;
			waiting = false;
		}
		emit();
	}

	function pause() {
		settle();
		if (!running) return;
		leftMs = Math.max(endsAt - Date.now(), 0);
		running = false;
		emit();
	}

	const toggle = () => (running ? pause() : play());

	function reset() {
		running = false;
		waiting = false;
		leftMs = null;
		emit();
	}

	/** End this phase now, without credit: focus goes to a short break, a break to focus. */
	function skip() {
		const next: FocusPhase = phase === 'focus' ? 'short' : 'focus';
		if (running) begin(next, Date.now());
		else {
			phase = next;
			leftMs = null;
			waiting = false;
		}
		emit();
	}

	function clearRounds() {
		roundsDone = 0;
		log = [];
		phase = 'focus';
		running = false;
		waiting = false;
		leftMs = null;
		emit();
	}

	$effect(() => {
		if (!running) return;
		const timer = setInterval(settle, 250);
		return () => clearInterval(timer);
	});
	$effect(() => () => clearTimeout(flashTimer));

	function onVisibility() {
		if (!document.hidden) settle();
	}

	// ── Edits ───────────────────────────────────────────────────────────────
	type DurKey = keyof Durations;
	const RANGES: Record<DurKey, { min: number; max: number; fallback: number }> = { focus: FOCUS, short: SHORT, long: LONG, every: EVERY };

	function setDur(key: DurKey, e: Event & { currentTarget: HTMLInputElement }) {
		const v = clampSec(e.currentTarget.value === '' ? dur[key] : e.currentTarget.value, RANGES[key]);
		e.currentTarget.value = String(v);
		if (v === dur[key]) return;
		durEdit = nextEdit(durEdit, seed, { ...dur, [key]: v });
		if (!started) emit();
	}
	/** The running phase started before a change to its own length. */
	const pending = $derived(started && lenMs !== phaseMs(phase));

	function setTask(e: Event & { currentTarget: HTMLInputElement }) {
		const t = plain(e.currentTarget.value).slice(0, 120);
		if (t === taskNow) return;
		taskEdit = nextEdit(taskEdit, taskSeed, t);
		emit();
	}

	// ── What to show ────────────────────────────────────────────────────────
	const label = $derived(PHASE_LABEL[phase]);
	const isBreak = $derived(phase !== 'focus');
	const playLabel = $derived(
		running ? 'Pause' : waiting ? (isBreak ? `Start ${label.toLowerCase()}` : 'Start focus') : started ? 'Resume' : 'Start'
	);
	const stateWord = $derived(running ? label : started ? 'Paused' : waiting ? 'Up next' : 'Ready');
	const cta = $derived(
		waiting ? (isBreak ? `Round ${roundsDone} done. Take a ${label.toLowerCase()} when you're ready.` : 'Break over. Back to focus when you are ready.') : ''
	);

	/** Changes on phase changes and start or pause, never with the seconds. */
	const live = $derived(
		waiting
			? isBreak
				? `Focus round ${roundsDone} done. ${label} next, ${Math.round(len / 60_000)} minutes.`
				: `Break over. Focus next, ${Math.round(len / 60_000)} minutes.`
			: running
				? `${label}, ${Math.round(len / 60_000)} minutes.`
				: started
					? 'Paused.'
					: ''
	);

	const tone = $derived(
		phase === 'focus'
			? { stroke: 'stroke-ripple-accent', text: 'text-ripple-accent', dot: 'bg-ripple-accent' }
			: phase === 'short'
				? { stroke: 'stroke-ripple-success', text: 'text-ripple-success-text', dot: 'bg-ripple-success' }
				: { stroke: 'stroke-ripple-info', text: 'text-ripple-info-text', dot: 'bg-ripple-info' }
	);

	// Dots: the goal, else one set, grown to the rounds done; capped at 24.
	const dotCount = $derived(Math.min(Math.max(goal || dur.every, roundsDone), 24));
	const roundsText = $derived(
		goal ? `${roundsDone} of ${goal} rounds${roundsDone >= goal ? ' · goal reached' : ''}` : `${roundsDone} ${roundsDone === 1 ? 'round' : 'rounds'} done`
	);
	const meta = $derived(`${dur.focus} min focus · ${dur.short} min break · ${dur.long} min long break every ${dur.every}`);

	const timeOf = (iso: string) => {
		try {
			return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		} catch {
			return iso;
		}
	};

	// Ring geometry: r=46 in a 100 box.
	const C = 2 * Math.PI * 46;
	const frac = $derived(len > 0 ? left / len : 1);

	let showSettings = $state(false);
	const settingsId = `${uid}-settings`;
	const taskId = `${uid}-task`;

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const roundBtn = [
		'grid size-10 place-items-center rounded-full border border-ripple-border text-ripple-surface-foreground transition-colors duration-150 hover:bg-ripple-muted motion-reduce:transition-none',
		focusRing
	];
	const caption = 'text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase';
	const field =
		'h-8 w-full min-w-0 rounded-md border border-ripple-border bg-ripple-input px-2 text-callout text-ripple-input-foreground tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ripple-ring';
</script>

<svelte:document onvisibilitychange={onVisibility} />

{#snippet minutes(key: DurKey, text: string, unit: string)}
	<label class="flex min-w-0 flex-col gap-1">
		<span class="text-footnote text-ripple-muted-foreground">{text}</span>
		<span class="flex items-center gap-1.5">
			<input
				type="number"
				class={field}
				inputmode="numeric"
				aria-label={text}
				min={RANGES[key].min}
				max={RANGES[key].max}
				step="1"
				value={dur[key]}
				onchange={(e) => setDur(key, e)}
			/>
			<span class="text-footnote text-ripple-muted-foreground">{unit}</span>
		</span>
	</label>
{/snippet}

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="focus-timer">
	<div class="flex flex-col gap-3">
		<header class="flex min-w-0 flex-col gap-0.5">
			{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}
			<p class="text-footnote text-ripple-muted-foreground tabular-nums" data-slot="meta">{meta}</p>
		</header>

		<section
			class="flex flex-col gap-4 rounded-ripple border border-ripple-border bg-ripple-surface p-4"
			aria-label="Focus timer"
			data-slot="player"
			data-phase={phase}
			data-running={running}
		>
			<div class="grid items-center gap-4 @min-[560px]:grid-cols-[auto_minmax(0,1fr)] @min-[560px]:gap-6">
				<button
					type="button"
					class={['relative mx-auto grid size-48 place-items-center rounded-full @min-[720px]:size-56', focusRing, flash && 'motion-safe:animate-pulse']}
					aria-label="{playLabel}. {label}, {clock(secsLeft)} left"
					onclick={toggle}
					data-slot="dial"
					data-flash={flash || undefined}
				>
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
							class={[tone.stroke, 'transition-[stroke-dashoffset] duration-200 ease-linear']}
						/>
					</svg>
					<span class="absolute inset-3 hidden rounded-full bg-ripple-muted motion-reduce:block" aria-hidden="true"></span>
					<div class="relative flex flex-col items-center gap-1">
						<span class={['text-caption-1 font-semibold tracking-[0.04em] uppercase', tone.text]} data-slot="phase">{label}</span>
						<span class="text-[48px] leading-none font-semibold tabular-nums @min-[720px]:text-[56px]" data-slot="clock"
							>{clock(secsLeft)}</span
						>
						<span class="text-footnote text-ripple-muted-foreground" data-slot="state">{stateWord}</span>
					</div>
				</button>

				<div class="flex min-w-0 flex-col items-center gap-3 text-center @min-[560px]:items-start @min-[560px]:text-left">
					<div class="flex w-full min-w-0 flex-col gap-1">
						<label for={taskId} class={caption}>Focusing on</label>
						<input
							id={taskId}
							type="text"
							maxlength="120"
							placeholder="What are you working on?"
							class={[field, 'h-9 text-body']}
							value={taskNow}
							onchange={setTask}
							data-slot="task"
						/>
					</div>

					{#if cta}
						<p class={['text-callout font-medium', tone.text]} data-slot="cta">{cta}</p>
					{/if}

					<div class="flex items-center gap-3">
						<button type="button" class={roundBtn} aria-label="Reset {label.toLowerCase()}" onclick={reset}>
							<RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
						</button>
						<button
							type="button"
							class={['inline-flex h-11 min-w-32 items-center justify-center gap-2 rounded-full bg-ripple-accent px-5 text-body-emph text-ripple-accent-foreground transition-opacity hover:opacity-90', focusRing]}
							onclick={toggle}
							data-slot="play"
						>
							{#if running}<Pause size={16} strokeWidth={2} aria-hidden="true" />{:else}<Play size={16} strokeWidth={2} aria-hidden="true" />{/if}
							{playLabel}
						</button>
						<button type="button" class={roundBtn} aria-label="Skip {label.toLowerCase()}" onclick={skip}>
							<SkipForward size={16} strokeWidth={1.75} aria-hidden="true" />
						</button>
					</div>

					<div class="flex flex-col items-center gap-1.5 @min-[560px]:items-start" data-slot="rounds">
						<div class="flex flex-wrap items-center gap-1.5" role="img" aria-label={roundsText}>
							{#each { length: dotCount } as _, i (i)}
								<span
									class={[
										'size-2.5 rounded-full border',
										i < roundsDone ? 'border-transparent bg-ripple-accent' : 'border-ripple-border bg-transparent',
										(i + 1) % dur.every === 0 && i + 1 < dotCount && 'mr-1.5'
									]}
									data-done={i < roundsDone || undefined}
								></span>
							{/each}
						</div>
						<p class="text-footnote text-ripple-muted-foreground tabular-nums" aria-hidden="true">{roundsText}</p>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-2 border-t border-ripple-border pt-3">
				<button
					type="button"
					class={['inline-flex items-center gap-2 self-start rounded-md text-callout font-medium text-ripple-muted-foreground hover:text-ripple-surface-foreground', focusRing]}
					aria-expanded={showSettings}
					aria-controls={settingsId}
					onclick={() => (showSettings = !showSettings)}
				>
					<Settings2 size={15} strokeWidth={1.75} aria-hidden="true" />Durations
					<ChevronDown size={15} strokeWidth={1.75} aria-hidden="true" class="transition-transform duration-150 motion-reduce:transition-none {showSettings ? 'rotate-180' : ''}" />
				</button>
				<div id={settingsId} class={[showSettings ? 'flex' : 'hidden', 'flex-col gap-3']} data-slot="settings">
					<div class="grid grid-cols-2 gap-3 @min-[560px]:grid-cols-4">
						{@render minutes('focus', 'Focus', 'min')}
						{@render minutes('short', 'Short break', 'min')}
						{@render minutes('long', 'Long break', 'min')}
						{@render minutes('every', 'Long break every', 'rounds')}
					</div>
					<div class="flex flex-wrap items-center gap-3">
						{#if pending}<span class="text-footnote text-ripple-muted-foreground">The new length starts with the next phase.</span>{/if}
						<button
							type="button"
							class={['ml-auto inline-flex h-8 items-center rounded-md border border-ripple-border px-2.5 text-callout font-medium hover:bg-ripple-muted', focusRing]}
							onclick={clearRounds}
						>
							Clear rounds
						</button>
					</div>
				</div>
			</div>
		</section>

		<section class="rounded-ripple border border-ripple-border bg-ripple-surface px-3 py-2.5" aria-labelledby="{uid}-log" data-slot="log">
			<h3 id="{uid}-log" class={caption}>Session log</h3>
			{#if log.length}
				<ol class="mt-1.5 flex flex-col divide-y divide-ripple-border">
					{#each log as iso, i (i)}
						<li class="flex items-center justify-between gap-2 py-1.5 text-callout">
							<span class="flex items-center gap-2"><span class={['size-2 rounded-full', 'bg-ripple-accent']} aria-hidden="true"></span>Focus round {i + 1}</span>
							<time datetime={iso} class="text-ripple-muted-foreground tabular-nums">{timeOf(iso)}</time>
						</li>
					{/each}
				</ol>
			{:else}
				<p class="mt-1 text-callout text-ripple-muted-foreground">Finished focus rounds show here with the time they ended.</p>
			{/if}
		</section>

		<p class="sr-only" aria-live="polite" data-slot="live">{live}</p>
	</div>
</div>
