<!--
  widgets/composite/HabitTracker.svelte: `habit-tracker`: a small habit app
  the model sets up. The model writes 1 to 8 habits (name, an icon key from
  the data kit's HABIT_ICONS, a weekly target) and optional demo `seed` ticks;
  the visitor ticks days on a habits-by-days week grid, and the widget shows
  each habit's streak, a ring toward its weekly target, today's completion, the
  best streak and a verdict ("3 of 4 habits on track this week"). Habits can
  be added (name, icon, target), renamed inline and removed after a confirm.

  Invariants:
  - `value` ({ habits, ticks: { [id]: ISO days } }) is the bound field
    (default `value` / `onchange`). The shown value is the bound value, else a
    local Edit (data-kit/edit.ts) while it holds against the raw props, else
    the props. A re-sent spec keeps the visitor's ticks; new habits replace them.
  - Days come from the visitor's local clock (habit-tracker.ts). `today` is
    re-read after mount and every minute, so a prerendered page catches up.
  - No storage: ticks live in the value only; a reload starts from the props.
  - One tab stop for the whole grid (roving tabindex); arrows move between
    days and habits. Future days are aria-disabled, never ticked.
  - Below 560px each habit is a card with 7 day dots; above it, a grid row
    under a day header. Same markup, container queries only.
-->
<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import Check from '@lucide/svelte/icons/check';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Flame from '@lucide/svelte/icons/flame';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { HABIT_ICONS, StatChip, VerdictLine, holds, kindIcon, nextEdit, plain } from '../data-kit/index.js';
	import type { Edit } from '../data-kit/edit.js';
	import type { Verdict } from '../data-kit/types.js';
	import {
		MAX_HABITS,
		MAX_WEEKS,
		addDays,
		countIn,
		currentStreak,
		dayLong,
		dayShort,
		isoDay,
		longestStreak,
		nextHabitId,
		onTrack,
		readHabits,
		seedTicks,
		toValue,
		toggleTick,
		weekDays,
		weekRange,
		weekStartOf,
		type Habit,
		type HabitValue
	} from './habit-tracker.js';
	import type { HabitIconKey } from '../data-kit/icons.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		/** 1 to 8 habits. `icon` is a HABIT_ICONS key; `target_per_week` 1 to 7. */
		habits?: Array<{ id: string; name: string; icon?: string; target_per_week: number }>;
		/** First day of the week. Default 'mon'. */
		week_start?: 'mon' | 'sun';
		/** Weeks of history to page through, 1 to 4. Default 1. */
		weeks?: number;
		/** Demo ticks: day offsets back from today (0 = today) per habit id. */
		seed?: Record<string, number[]>;
		/** Two-way bindable: the habits and their ticked days. */
		value?: HabitValue;
		onchange?: (value: HabitValue) => void;
	}

	let { id, class: className, style, title, habits, week_start, weeks, seed, value = $bindable(), onchange }: Props = $props();

	const uid = $props.id();

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);
	const heading = $derived(plain(title));
	const ws = $derived(week_start === 'sun' ? 'sun' : 'mon');
	const weekCount = $derived(Math.min(Math.max(Math.trunc(Number(weeks)) || 1, 1), MAX_WEEKS));

	// ── The visitor's day ───────────────────────────────────────────────────
	let today = $state(isoDay(new Date()));
	$effect(() => {
		const read = () => (today = isoDay(new Date()));
		read();
		const timer = setInterval(read, 60_000);
		return () => clearInterval(timer);
	});

	// ── The value on show: bound value, else a holding edit, else the props ──
	const fromProps = $derived.by(() => {
		const hs = readHabits(habits);
		return { habits: hs, ticks: seedTicks(seed, hs, today) };
	});
	// The edit anchors on the raw props, not the seeded days, so midnight
	// moving `today` does not read as new data.
	const incoming = $derived({ habits, seed });
	let edit = $state.raw<Edit<HabitValue> | null>(null);
	const bound = $derived(toValue(value));
	const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
	const current = $derived.by(() => {
		if (bound && !(edit && same(bound, edit.value))) return bound;
		return holds(edit, incoming) ? edit.value : fromProps;
	});

	function commit(next: HabitValue) {
		const clean = toValue(next)!;
		edit = nextEdit(edit, incoming, clean);
		value = clean;
		onchange?.(clean);
	}

	// ── Weeks ───────────────────────────────────────────────────────────────
	let offset = $state(0);
	const at = $derived(Math.min(Math.max(offset, -(weekCount - 1)), 0));
	const thisWeek = $derived(weekDays(weekStartOf(today, ws)));
	const shownWeek = $derived(weekDays(addDays(thisWeek[0], 7 * at)));
	const daysLeft = $derived(thisWeek.filter((d) => d >= today).length);
	const weekName = $derived(at === 0 ? 'This week' : at === -1 ? 'Last week' : `${-at} weeks ago`);

	const rows = $derived(
		current.habits.map((h) => {
			const set = new Set(current.ticks[h.id] ?? []);
			const done = countIn(set, shownWeek);
			return {
				...h,
				set,
				done,
				met: done >= h.target_per_week,
				track: onTrack(countIn(set, thisWeek), h.target_per_week, daysLeft),
				streak: currentStreak(set, today),
				best: longestStreak(set)
			};
		})
	);
	const total = $derived(rows.length);
	const doneToday = $derived(rows.filter((r) => r.set.has(today)).length);
	const todayPct = $derived(total ? Math.round((doneToday / total) * 100) : 0);
	const bestStreak = $derived(Math.max(0, ...rows.map((r) => r.best)));
	const onTrackCount = $derived(rows.filter((r) => r.track).length);
	const verdict = $derived<Verdict | undefined>(
		total
			? {
					text: `${onTrackCount} of ${total} ${total === 1 ? 'habit' : 'habits'} on track this week`,
					status: onTrackCount === total ? 'good' : onTrackCount === 0 ? 'bad' : 'warn'
				}
			: undefined
	);

	// ── Ticking ─────────────────────────────────────────────────────────────
	let announce = $state('');
	/** The cell just ticked, `${id}|${day}`: it plays the check pop once. */
	let popped = $state('');

	function toggle(h: (typeof rows)[number], day: string) {
		if (day > today) return;
		const was = h.set.has(day);
		commit(toggleTick(current, h.id, day));
		popped = was ? '' : `${h.id}|${day}`;
		const done = h.done + (shownWeek.includes(day) ? (was ? -1 : 1) : 0);
		announce = `${h.name}, ${dayLong(day)}, ${was ? 'not done' : 'done'}. ${done} of ${h.target_per_week} this week.`;
	}

	// ── Keyboard grid: one tab stop, arrows move ────────────────────────────
	let focusAt = $state<[number, number] | null>(null);
	const todayCol = $derived(Math.max(shownWeek.indexOf(today), 0));
	const tabAt = $derived(focusAt && focusAt[0] < total ? focusAt : ([0, todayCol] as [number, number]));
	let gridEl = $state<HTMLElement>();

	function onGridKey(e: KeyboardEvent) {
		const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]');
		if (!cell) return;
		let [r, c] = cell.dataset.cell!.split(':').map(Number);
		if (e.key === 'ArrowRight') c++;
		else if (e.key === 'ArrowLeft') c--;
		else if (e.key === 'ArrowDown') r++;
		else if (e.key === 'ArrowUp') r--;
		else if (e.key === 'Home') c = 0;
		else if (e.key === 'End') c = 6;
		else return;
		e.preventDefault();
		r = Math.min(Math.max(r, 0), total - 1);
		c = Math.min(Math.max(c, 0), 6);
		focusAt = [r, c];
		const key = `${r}:${c}`;
		[...(gridEl?.querySelectorAll<HTMLElement>('[data-cell]') ?? [])].find((el) => el.dataset.cell === key)?.focus();
	}

	// ── Add, rename, remove ─────────────────────────────────────────────────
	const ICON_KEYS = Object.keys(HABIT_ICONS) as HabitIconKey[];
	const iconWord = (k: string) => k[0].toUpperCase() + k.slice(1).replace('-', ' ');

	let adding = $state(false);
	let newName = $state('');
	let newIcon = $state<HabitIconKey>('read');
	let newTarget = $state(7);

	function addHabit(e: SubmitEvent) {
		e.preventDefault();
		const name = newName.trim();
		if (!name || total >= MAX_HABITS) return;
		const h: Habit = { id: nextHabitId(current.habits), name, icon: newIcon, target_per_week: newTarget };
		commit({ habits: [...current.habits, h], ticks: { ...current.ticks, [h.id]: [] } });
		announce = `Added ${name}.`;
		adding = false;
		newName = '';
		newTarget = 7;
	}

	let renaming = $state<string | null>(null);
	function rename(hid: string, raw: string) {
		renaming = null;
		const name = raw.trim().slice(0, 60);
		const h = current.habits.find((x) => x.id === hid);
		if (!h || !name || name === h.name) return;
		commit({ ...current, habits: current.habits.map((x) => (x.id === hid ? { ...x, name } : x)) });
	}
	function onRenameKey(e: KeyboardEvent & { currentTarget: HTMLInputElement }, hid: string) {
		if (e.key === 'Enter') rename(hid, e.currentTarget.value);
		else if (e.key === 'Escape') renaming = null;
	}

	let confirming = $state<string | null>(null);
	function remove(hid: string) {
		const h = current.habits.find((x) => x.id === hid);
		confirming = null;
		if (!h) return;
		const { [hid]: _gone, ...ticks } = current.ticks;
		commit({ habits: current.habits.filter((x) => x.id !== hid), ticks });
		announce = `Removed ${h.name}.`;
	}

	const focusOnMount = (node: HTMLElement) => node.focus();

	// Ring: r=15 in a 36 box.
	const C = 2 * Math.PI * 15;
	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const iconBtn = ['grid size-8 shrink-0 place-items-center rounded-md text-ripple-muted-foreground hover:bg-ripple-muted hover:text-ripple-surface-foreground', focusRing];
	const rowGrid = 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 @min-[560px]:grid-cols-[minmax(8rem,1fr)_auto_10rem] @min-[560px]:items-center';
	const dayGrid = 'grid grid-cols-7 gap-1 @min-[560px]:grid-cols-[repeat(7,2.25rem)]';
</script>

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="habit-tracker">
	<div class="flex flex-col gap-3">
		{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}

		{#if total}
			<div class="grid grid-cols-2 gap-2 @min-[560px]:flex @min-[560px]:flex-wrap" data-slot="summary">
				<StatChip label="Today" value="{todayPct}%" icon={CircleCheck} />
				<StatChip label="Best streak" value={bestStreak} unit={bestStreak === 1 ? 'day' : 'days'} icon={Flame} />
			</div>
			<VerdictLine {verdict} />
		{/if}

		<section class="flex flex-col gap-2 rounded-ripple border border-ripple-border bg-ripple-surface p-3" aria-label="Habits" data-slot="board">
			<div class="flex items-center gap-2">
				{#if weekCount > 1}
					<button type="button" class={iconBtn} aria-label="Previous week" disabled={at <= -(weekCount - 1)} onclick={() => (offset = at - 1)}>
						<ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
					</button>
				{/if}
				<p class="min-w-0 flex-1 text-callout" data-slot="week">
					<span class="font-medium">{weekName}</span>
					<span class="text-ripple-muted-foreground tabular-nums">· {weekRange(shownWeek)}</span>
				</p>
				{#if weekCount > 1}
					<button type="button" class={iconBtn} aria-label="Next week" disabled={at >= 0} onclick={() => (offset = at + 1)}>
						<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
					</button>
				{/if}
			</div>

			{#if total}
				<div class={['hidden', rowGrid, '@min-[560px]:grid']} aria-hidden="true">
					<span></span>
					<span class={dayGrid}>
						{#each shownWeek as d (d)}
							<span class={['text-center text-caption-1 font-medium', d === today ? 'text-ripple-accent' : 'text-ripple-muted-foreground']}>{dayShort(d)}</span>
						{/each}
					</span>
					<span></span>
				</div>

				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="flex flex-col gap-2 @min-[560px]:gap-1" bind:this={gridEl} onkeydown={onGridKey}>
					{#each rows as h, r (h.id)}
						{@const HabitIcon = kindIcon(HABIT_ICONS, h.icon)}
						<div
							class={[rowGrid, 'rounded-ripple border border-ripple-border p-3 @min-[560px]:rounded-md @min-[560px]:border-0 @min-[560px]:px-1 @min-[560px]:py-1.5']}
							role="group"
							aria-label={h.name}
							data-habit={h.id}
							data-met={h.met || undefined}
						>
							<div class="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
								<span class="grid size-8 shrink-0 place-items-center rounded-md bg-ripple-muted">
									<HabitIcon size={16} strokeWidth={1.75} aria-hidden="true" />
								</span>
								{#if confirming === h.id}
									<div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5" role="group" aria-label="Confirm remove">
										<span class="text-callout">Remove {h.name}?</span>
										<button type="button" class={['rounded-md bg-ripple-error px-2 py-1 text-footnote font-medium text-ripple-error-foreground', focusRing]} onclick={() => remove(h.id)}>Remove</button>
										<button type="button" class={['rounded-md border border-ripple-border px-2 py-1 text-footnote', focusRing]} onclick={() => (confirming = null)} {@attach focusOnMount}>Keep</button>
									</div>
								{:else if renaming === h.id}
									<input
										class={['h-8 min-w-0 flex-1 rounded-md border border-ripple-border bg-ripple-surface px-2 text-body', focusRing]}
										aria-label="Rename {h.name}"
										value={h.name}
										maxlength={60}
										onkeydown={(e) => onRenameKey(e, h.id)}
										onblur={(e) => renaming === h.id && rename(h.id, e.currentTarget.value)}
										{@attach focusOnMount}
									/>
								{:else}
									<div class="min-w-0 flex-1">
										<p class="truncate text-body-emph" data-slot="name">{h.name}</p>
										<p class="flex items-center gap-1 truncate text-footnote whitespace-nowrap text-ripple-muted-foreground tabular-nums">
											{#if h.streak}<Flame size={12} strokeWidth={2} aria-hidden="true" class="shrink-0 text-ripple-warning-text" />{/if}
											<span data-slot="streak">{h.streak}-day streak</span>
											{#if h.met}<span class="font-medium text-ripple-success-text @min-[560px]:hidden">· Done for the week</span>{/if}
										</p>
									</div>
									<button type="button" class={iconBtn} aria-label="Rename {h.name}" onclick={() => (renaming = h.id)}>
										<Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
									</button>
									<button type="button" class={iconBtn} aria-label="Remove {h.name}" onclick={() => (confirming = h.id)}>
										<Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
									</button>
								{/if}
							</div>

							<div class={['col-span-2 row-start-2', dayGrid, '@min-[560px]:col-span-1 @min-[560px]:col-start-2 @min-[560px]:row-start-1']} data-slot="days">
								{#each shownWeek as d, c (d)}
									{@const on = h.set.has(d)}
									{@const future = d > today}
									<div class="flex flex-col items-center gap-1">
										<button
											type="button"
											class={[
												'relative grid size-9 place-items-center rounded-full border transition-colors duration-150 motion-reduce:transition-none',
												focusRing,
												on
													? 'border-ripple-accent bg-ripple-accent text-ripple-accent-foreground'
													: future
														? 'cursor-default border-dashed border-ripple-muted-foreground/35'
														: 'border-ripple-border hover:bg-ripple-muted',
												d === today && 'ring-2 ring-ripple-accent/35 ring-offset-1 ring-offset-ripple-surface'
											]}
											aria-label="{h.name}, {dayLong(d)}, {on ? 'done' : 'not done'}"
											aria-pressed={on}
											aria-disabled={future || undefined}
											aria-current={d === today ? 'date' : undefined}
											tabindex={tabAt[0] === r && tabAt[1] === c ? 0 : -1}
											data-cell="{r}:{c}"
											data-day={d}
											onfocus={() => (focusAt = [r, c])}
											onclick={() => toggle(h, d)}
										>
											{#if on}
												<span class={['grid place-items-center', popped === `${h.id}|${d}` && 'habit-pop']}>
													<Check size={16} strokeWidth={2.5} aria-hidden="true" />
												</span>
											{/if}
										</button>
										<span class={['text-caption-2 @min-[560px]:hidden', d === today ? 'font-semibold text-ripple-accent' : 'text-ripple-muted-foreground']} aria-hidden="true">{dayShort(d)[0]}</span>
									</div>
								{/each}
							</div>

							<div class="col-start-2 row-start-1 flex items-center justify-end gap-2 @min-[560px]:col-start-3" data-slot="progress">
								{#if h.met}
									<span class="hidden text-right text-footnote font-medium text-ripple-success-text @min-[560px]:inline">Done for the week</span>
								{/if}
								<span class="relative grid size-9 shrink-0 place-items-center">
									<svg class="absolute inset-0 size-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
										<circle cx="18" cy="18" r="15" fill="none" stroke-width="3" class="stroke-ripple-border" />
										<circle
											cx="18"
											cy="18"
											r="15"
											fill="none"
											stroke-width="3.5"
											stroke-linecap="round"
											stroke-dasharray={C}
											stroke-dashoffset={C * (1 - Math.min(h.done / h.target_per_week, 1))}
											class={[h.met ? 'stroke-ripple-success' : 'stroke-ripple-accent', 'transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none']}
										/>
									</svg>
									<span class="relative text-caption-2 tabular-nums" aria-hidden="true">{h.done}/{h.target_per_week}</span>
									<span class="sr-only">{h.done} of {h.target_per_week} this week</span>
								</span>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="px-1 py-3 text-callout text-ripple-muted-foreground">No habits yet. Add one to start a streak.</p>
			{/if}

			{#if adding}
				<form class="flex flex-col gap-3 rounded-ripple border border-ripple-border p-3" aria-label="Add habit" onsubmit={addHabit} data-slot="add-form">
					<div class="flex flex-wrap items-end gap-3">
						<label class="flex min-w-0 flex-1 flex-col gap-1">
							<span class="text-caption-1 font-medium text-ripple-muted-foreground">Habit name</span>
							<input class={['h-9 rounded-md border border-ripple-border bg-ripple-surface px-2 text-body', focusRing]} bind:value={newName} maxlength={60} required {@attach focusOnMount} />
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-caption-1 font-medium text-ripple-muted-foreground">Times a week</span>
							<select class={['h-9 rounded-md border border-ripple-border bg-ripple-surface px-2 text-body', focusRing]} bind:value={newTarget}>
								{#each [7, 6, 5, 4, 3, 2, 1] as n (n)}<option value={n}>{n === 7 ? 'Every day' : n}</option>{/each}
							</select>
						</label>
					</div>
					<fieldset class="flex flex-col gap-1">
						<legend class="mb-1 text-caption-1 font-medium text-ripple-muted-foreground">Icon</legend>
						<div class="flex flex-wrap gap-1.5">
							{#each ICON_KEYS as k (k)}
								{@const KeyIcon = HABIT_ICONS[k]}
								<label class="relative">
									<input type="radio" name="{uid}-icon" value={k} bind:group={newIcon} class="peer sr-only" />
									<span
										class="grid size-9 place-items-center rounded-md border border-ripple-border peer-checked:border-ripple-accent peer-checked:bg-ripple-accent peer-checked:text-ripple-accent-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ripple-ring"
										title={iconWord(k)}
									>
										<KeyIcon size={16} strokeWidth={1.75} aria-hidden="true" />
										<span class="sr-only">{iconWord(k)}</span>
									</span>
								</label>
							{/each}
						</div>
					</fieldset>
					<div class="flex gap-2">
						<button type="submit" class={['h-9 rounded-md bg-ripple-accent px-4 text-body-emph text-ripple-accent-foreground', focusRing]}>Add</button>
						<button type="button" class={['h-9 rounded-md border border-ripple-border px-4 text-body', focusRing]} onclick={() => (adding = false)}>Cancel</button>
					</div>
				</form>
			{:else if total < MAX_HABITS}
				<button type="button" class={['inline-flex h-9 items-center gap-1.5 self-start rounded-md px-2 text-callout font-medium text-ripple-accent hover:bg-ripple-muted', focusRing]} onclick={() => (adding = true)}>
					<Plus size={16} strokeWidth={2} aria-hidden="true" />Add habit
				</button>
			{/if}
		</section>

		<p class="sr-only" aria-live="polite">{announce}</p>
	</div>
</div>

<style>
	.habit-pop {
		animation: habit-pop 260ms cubic-bezier(0.2, 0.9, 0.3, 1.4);
	}
	@keyframes habit-pop {
		from {
			transform: scale(0.4);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.habit-pop {
			animation: none;
		}
	}
</style>
