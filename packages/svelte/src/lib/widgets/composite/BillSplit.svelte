<!--
  widgets/composite/BillSplit.svelte — `bill-split`: "dinner for 4 came to
  $186.40, split it with tip and let me adjust who had drinks". The model
  writes the bill, the tip and the people; the widget does the maths (in
  ./bill-split.ts) and the layout: a verdict, a card per person with the
  amount large, and a bill / tip / total row.

  Editable: the bill amount, the tip (chips plus a custom percent), each
  person's name and extras, and adding or removing a person (2 to 12).

  Invariants:
  - `value` ({ subtotal, tip_percent, people: [{ id, name, extras }] }) is
    the bound field (default `value` / `onchange`). Nothing is seeded from a
    prop into $state: the shown bill is the bound value, else a local Edit
    (data-kit/edit.ts) while it holds against the props, else the props. So
    a host re-sending the same spec keeps the visitor's edits, and new
    numbers from the model replace them.
  - A half-typed number lives in `draft`; it moves the totals live and
    commits on `change`.
  - Card keys are `${id}:${i}`; new people get the next free `pN` id, so the
    markup has no generated ids (stream parity compares it).
-->
<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import { StatChip, StatusPill, VerdictLine, finite, holds, money, nextEdit, num, plain, rise } from '../data-kit/index.js';
	import type { Edit } from '../data-kit/edit.js';
	import type { Verdict } from '../data-kit/types.js';
	import { MAX_PEOPLE, MIN_PEOPLE, clampTip, nextId, split, toTipOptions, toValue } from './bill-split.js';
	import type { BillValue, Person } from './bill-split.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		title?: string;
		/** ISO 4217, default USD. */
		currency?: string;
		/** The bill before tip (and before tax). */
		subtotal?: number;
		/** Added on top of the subtotal, shared in proportion to what each person had. */
		tax?: number;
		/** Percent of the subtotal: 18 means 18%. */
		tip_percent?: number;
		tip_options?: number[];
		people?: Array<{ id: string; name: string; extras?: number }>;
		extras_label?: string;
		note?: string;
		/** Two-way bindable: the bill as the visitor has edited it. */
		value?: BillValue;
		onchange?: (value: BillValue) => void;
	}

	let {
		id,
		class: className,
		style,
		title,
		currency = 'USD',
		subtotal,
		tax,
		tip_percent,
		tip_options,
		people,
		extras_label,
		note,
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
	const footnote = $derived(plain(note));
	const extrasWord = $derived(plain(extras_label) || 'Drinks');
	const fmt = (c: number) => money(c / 100, currency);
	const options = $derived(toTipOptions(tip_options));

	// ── The bill on show: bound value, else a holding edit, else the props ──
	const seed = $derived(toValue({ subtotal, tip_percent, people }));
	let edit = $state.raw<Edit<BillValue> | null>(null);
	const bound = $derived(value !== null && typeof value === 'object' ? toValue(value) : undefined);
	// A bound value the host set wins; an echo of our own edit does not, so
	// new props from the model can still replace a stale edit.
	const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
	const current = $derived.by(() => {
		if (bound && !(edit && same(bound, edit.value))) return bound;
		return holds(edit, seed) ? edit.value : seed;
	});

	// A half-typed number: 'subtotal', 'tip' or a person's id.
	let draft = $state<{ key: string; value: number } | null>(null);
	const shown = $derived.by(() => {
		if (!current || !draft) return current;
		const d = draft;
		if (d.key === 'subtotal') return { ...current, subtotal: Math.max(0, d.value) };
		if (d.key === 'tip') return { ...current, tip_percent: clampTip(d.value) ?? current.tip_percent };
		return { ...current, people: current.people.map((p) => (p.id === d.key ? { ...p, extras: Math.max(0, d.value) } : p)) };
	});
	const result = $derived(shown ? split(shown, tax) : undefined);

	function commit(next: BillValue) {
		const clean = toValue(next)!;
		edit = nextEdit(edit, seed, clean);
		value = clean;
		onchange?.(clean);
	}

	const withPeople = (list: Person[]) => current && commit({ ...current, people: list });

	function onDraft(key: string, e: Event & { currentTarget: HTMLInputElement }) {
		const v = e.currentTarget.valueAsNumber;
		if (Number.isFinite(v)) draft = { key, value: v };
	}

	function onCommit(key: string, e: Event & { currentTarget: HTMLInputElement }) {
		const v = finite(e.currentTarget.valueAsNumber);
		draft = null;
		if (!current) return;
		if (v === undefined) {
			e.currentTarget.value = String(key === 'subtotal' ? current.subtotal : key === 'tip' ? current.tip_percent : (current.people.find((p) => p.id === key)?.extras ?? 0));
			return;
		}
		if (key === 'subtotal') commit({ ...current, subtotal: v });
		else if (key === 'tip') commit({ ...current, tip_percent: v });
		else withPeople(current.people.map((p) => (p.id === key ? { ...p, extras: v } : p)));
	}

	function rename(pid: string, e: Event & { currentTarget: HTMLInputElement }) {
		if (!current) return;
		const name = e.currentTarget.value.trim();
		const i = current.people.findIndex((p) => p.id === pid);
		withPeople(current.people.map((p, j) => (j === i ? { ...p, name: name || `Person ${i + 1}` } : p)));
	}

	function addPerson() {
		if (!current || current.people.length >= MAX_PEOPLE) return;
		const n = current.people.length + 1;
		withPeople([...current.people, { id: nextId(current.people.map((p) => p.id)), name: `Person ${n}`, extras: 0 }]);
	}

	function removePerson(pid: string) {
		if (!current || current.people.length <= MIN_PEOPLE) return;
		withPeople(current.people.filter((p) => p.id !== pid));
	}

	// ── What the reader sees ────────────────────────────────────────────────
	const verdict = $derived.by((): Verdict | undefined => {
		if (!result?.shares.length) return undefined;
		const amounts = result.shares.map((s) => s.cents);
		const lo = Math.min(...amounts);
		const hi = Math.max(...amounts);
		if (lo === hi) return { text: `Everyone pays ${fmt(lo)}`, status: 'good' };
		if (hi - lo === 1) return { text: `Everyone pays ${fmt(lo)}, give or take a cent`, status: 'good' };
		return { text: `Shares range from ${fmt(lo)} to ${fmt(hi)}`, status: 'info' };
	});

	const summary = $derived(
		result && shown
			? [
					heading || 'Bill split',
					`Bill ${fmt(result.subtotal + result.tax)}${result.tax ? ` (tax ${fmt(result.tax)})` : ''}, tip ${num(shown.tip_percent)}% ${fmt(result.tip)}, total ${fmt(result.total)}`,
					...result.shares.map((s) => `${s.name}: ${fmt(s.cents)}`)
				].join('\n')
			: ''
	);

	let copied = $state(false);
	async function copy() {
		try {
			await navigator.clipboard?.writeText(summary);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}

	// Columns: two below 720px (an odd last card spans both); above, up to
	// four, picked so the last row never holds one card alone.
	const wide = (n: number) => (n <= 2 ? '@min-[720px]:grid-cols-2' : n === 3 || n === 6 || n % 4 === 1 ? '@min-[720px]:grid-cols-3' : '@min-[720px]:grid-cols-4');

	const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring';
	const caption = 'text-caption-1 font-medium tracking-[0.04em] text-ripple-muted-foreground uppercase';
	const box =
		'flex h-8 min-w-0 items-center gap-1 rounded-md border border-ripple-border bg-ripple-input px-2 text-callout text-ripple-input-foreground focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ripple-ring';
	const chip =
		'inline-flex h-8 min-w-12 items-center justify-center rounded-md border px-2.5 text-callout font-medium tabular-nums transition-colors motion-reduce:transition-none';
	const quiet =
		'inline-flex h-8 items-center gap-1.5 rounded-md border border-ripple-border bg-ripple-surface px-2.5 text-callout font-medium transition-colors hover:bg-ripple-muted disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';
</script>

<div {id} class={['@container text-ripple-surface-foreground', className]} style={rootStyle} data-widget="bill-split">
	<div class="flex flex-col gap-3">
		{#if heading}<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>{/if}

		{#if shown && result}
			<VerdictLine {verdict} />

			<section class="flex flex-col gap-3 rounded-ripple border border-ripple-border bg-ripple-surface p-3" aria-label="Bill and tip" data-slot="inputs">
				<div class="flex flex-wrap items-end gap-x-4 gap-y-3">
					<div class="flex flex-col gap-1">
						<label for="{uid}-subtotal" class={caption}>Bill before tip</label>
						<div class={[box, 'w-36']}>
							<input
								id="{uid}-subtotal"
								type="number"
								inputmode="decimal"
								min="0"
								step="0.01"
								value={shown.subtotal}
								class="w-full bg-transparent text-right tabular-nums outline-none"
								oninput={(e) => onDraft('subtotal', e)}
								onchange={(e) => onCommit('subtotal', e)}
							/>
						</div>
					</div>
					<div class="flex min-w-0 flex-col gap-1">
						<span id="{uid}-tip" class={caption}>Tip</span>
						<div class="flex flex-wrap items-center gap-1.5" role="group" aria-labelledby="{uid}-tip">
							{#each options as t (t)}
								{@const on = shown.tip_percent === t}
								<button
									type="button"
									class={[
										chip,
										focusRing,
										on
											? 'border-ripple-accent bg-ripple-accent text-ripple-accent-foreground'
											: 'border-ripple-border bg-ripple-surface hover:bg-ripple-muted'
									]}
									aria-pressed={on}
									onclick={() => current && commit({ ...current, tip_percent: t })}>{num(t)}%</button
								>
							{/each}
							<div class={[box, 'w-24']}>
								<input
									id="{uid}-tip-custom"
									type="number"
									inputmode="decimal"
									min="0"
									max="100"
									step="0.5"
									value={shown.tip_percent}
									aria-label="Custom tip percent"
									class="w-full bg-transparent text-right tabular-nums outline-none"
									oninput={(e) => onDraft('tip', e)}
									onchange={(e) => onCommit('tip', e)}
								/>
								<span class="text-footnote text-ripple-muted-foreground" aria-hidden="true">%</span>
							</div>
						</div>
					</div>
				</div>
				{#if result.over}
					<p class="flex flex-wrap items-center gap-2 text-footnote text-ripple-muted-foreground" data-slot="over">
						<StatusPill status="warn" label="Adjusted" />
						<span>{extrasWord} add up to more than the bill, so the bill counts as {fmt(result.subtotal)}.</span>
					</p>
				{/if}
			</section>

			<ul class={['grid grid-cols-2 gap-2', wide(result.shares.length)]} aria-label="Who pays what" data-slot="people">
				{#each result.shares as s, i (`${s.id}:${i}`)}
					<li
						class={[
							'flex min-w-0 flex-col gap-2 rounded-ripple border border-ripple-border bg-ripple-surface p-3',
							i === result.shares.length - 1 && result.shares.length % 2 === 1 && 'col-span-2 @min-[720px]:col-span-1'
						]}
						in:rise={{ index: 0 }}
						data-person={s.id}
					>
						<div class="flex min-w-0 items-center gap-1">
							<label for="{uid}-name-{i}" class="sr-only">Name of person {i + 1}</label>
							<input
								id="{uid}-name-{i}"
								type="text"
								value={s.name}
								maxlength="40"
								class={['h-7 min-w-0 flex-1 rounded-md bg-transparent px-1 text-headline font-semibold outline-none hover:bg-ripple-muted', focusRing]}
								onchange={(e) => rename(s.id, e)}
							/>
							<button
								type="button"
								class={['grid size-7 shrink-0 place-items-center rounded-md text-ripple-muted-foreground transition-colors hover:bg-ripple-muted hover:text-ripple-surface-foreground disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none', focusRing]}
								aria-label="Remove {s.name}"
								disabled={result.shares.length <= MIN_PEOPLE}
								onclick={() => removePerson(s.id)}
							>
								<X size={14} strokeWidth={2} aria-hidden="true" />
							</button>
						</div>
						<p class="text-title-2 font-semibold tabular-nums [overflow-wrap:anywhere]" data-slot="pays">{fmt(s.cents)}</p>
						<div class="flex items-center justify-between gap-2">
							<label for="{uid}-extras-{i}" class="text-footnote text-ripple-muted-foreground">{extrasWord}</label>
							<div class={[box, 'w-24']}>
								<input
									id="{uid}-extras-{i}"
									aria-label="{extrasWord} for {s.name}"
									type="number"
									inputmode="decimal"
									min="0"
									step="0.01"
									value={s.extras}
									class="w-full bg-transparent text-right tabular-nums outline-none"
									oninput={(e) => onDraft(s.id, e)}
									onchange={(e) => onCommit(s.id, e)}
								/>
							</div>
						</div>
					</li>
				{/each}
			</ul>

			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class={[quiet, focusRing]} disabled={result.shares.length >= MAX_PEOPLE} onclick={addPerson}>
					<Plus size={14} strokeWidth={2} aria-hidden="true" />Add person
				</button>
				<span class="text-footnote text-ripple-muted-foreground">{result.shares.length} of {MAX_PEOPLE} people</span>
				<button type="button" class={[quiet, focusRing, 'ml-auto']} onclick={copy}>
					{#if copied}<Check size={14} strokeWidth={2} aria-hidden="true" />Copied{:else}<Copy size={14} strokeWidth={2} aria-hidden="true" />Copy summary{/if}
				</button>
			</div>

			<div class="grid grid-cols-3 gap-2" aria-live="polite" aria-label="Totals" data-slot="totals">
				<StatChip label={result.tax ? `Bill + ${fmt(result.tax)} tax` : 'Bill'} value={fmt(result.subtotal + result.tax)} />
				<StatChip label="Tip {num(shown.tip_percent)}%" value={fmt(result.tip)} />
				<StatChip label="Total" value={fmt(result.total)} />
			</div>

			{#if footnote}<p class="text-footnote text-ripple-muted-foreground">{footnote}</p>{/if}
		{:else}
			<div class="flex flex-col gap-3" aria-busy="true" data-slot="pending">
				<div class="h-7 w-48 rounded bg-ripple-muted"></div>
				<div class="grid grid-cols-2 gap-2">
					<div class="h-24 rounded-ripple bg-ripple-muted"></div>
					<div class="h-24 rounded-ripple bg-ripple-muted"></div>
				</div>
				<p class="text-callout text-ripple-muted-foreground">Waiting for the bill and who is splitting it.</p>
			</div>
		{/if}
	</div>
</div>
