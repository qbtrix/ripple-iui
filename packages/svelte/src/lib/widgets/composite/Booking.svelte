<!--
  widgets/composite/Booking.svelte — `booking`: a table or service booking
  inside a chat card, in four stages on StageRail: what (service, party size),
  when (a 7-day strip, then that day's slots), details (name, email or phone,
  notes), review. One main button per stage; Book emits `onbook` with the
  request, and the host answers through props: `confirmed` swaps in the
  confirmation (no more actions), `notice` shows the host's message. A
  slot-taken notice (`code: 'slot_taken'`, or text saying "taken") sends the
  visitor back to the time stage with that slot marked Full.
  Data rules live in ./booking.ts. Services and days are store data filled by
  the server; the widget reads slot times from the store's own strings and
  never parses a date (design doc 2026-10-09 §3.4, §4).
  Invariants: everything shown derives from props plus the visitor's picks
  (no prop is copied into $state at mount, so a streamed card ends equal to a
  whole one). The pre-selected slot is derived, not written, until the
  visitor moves on. Bound field: `selection` (the request in progress).
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { safeUrl } from '@ripple-ui/core';
	import { SvelteSet } from 'svelte/reactivity';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Clock from '@lucide/svelte/icons/clock';
	import Users from '@lucide/svelte/icons/users';
	import User from '@lucide/svelte/icons/user';
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import Hash from '@lucide/svelte/icons/hash';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import type { LucideIcon } from '@lucide/svelte';
	import { PhotoTile, StageRail, VerdictLine, SERVICE_ICONS, STATUS_CLASS, STATUS_ICONS, finite, kindIcon, money, plain, slide } from '../data-kit/index.js';
	import type { Verdict } from '../data-kit/types.js';
	import {
		LIMITS,
		checkDetails,
		isOpen,
		isSlotTaken,
		nearest,
		partsOfDay,
		readBounds,
		readConfirmed,
		readDays,
		readNotice,
		readSelection,
		readServices,
		toRequest,
		type BookingRequest,
		type Selection
	} from './booking.js';

	interface Props {
		id?: string;
		class?: string;
		title?: string;
		subtitle?: string;
		verdict?: Verdict;
		currency?: string;
		services?: unknown;
		days?: unknown;
		tz?: string;
		party?: unknown;
		preferred?: { date?: string; after?: string };
		notice?: unknown;
		confirmed?: unknown;
		selection?: Selection;
		onselectionchange?: (next: Selection) => void;
		onbook?: (request: BookingRequest) => void;
	}

	let {
		id,
		class: className,
		title,
		subtitle,
		verdict,
		currency = 'USD',
		services,
		days,
		tz,
		party,
		preferred,
		notice,
		confirmed,
		selection = $bindable(),
		onselectionchange,
		onbook
	}: Props = $props();

	const uid = $props.id();
	const WHAT = 0;
	const WHEN = 1;
	const DETAILS = 2;
	const REVIEW = 3;

	// ── Data, read defensively (streamed and model-written props) ──────────
	const svc = $derived(readServices(services));
	const dayList = $derived(readDays(days));
	// The visitor's edits live in `draft`. A bound value (state written back
	// through onselectionchange) wins; otherwise the draft does, so a parent
	// re-render that resets an unbound prop cannot wipe what they typed.
	let draft = $state.raw<Selection>();
	const sel = $derived(readSelection(onselectionchange && selection != null ? selection : (draft ?? selection)));
	const done = $derived(readConfirmed(confirmed));
	const note = $derived(readNotice(notice));
	const ask = $derived(finite(party !== null && typeof party === 'object' ? (party as { value?: unknown }).value : party));

	// ── The visitor's state ───────────────────────────────────────────────
	let stage = $state(WHAT);
	let dir = $state<1 | -1>(1);
	let dayPick = $state<string>();
	let tried = $state(false);
	let sending = $state<string>(); // start of the booking in flight
	const taken = new SvelteSet<string>(); // slots the host said went while we looked

	// ── Effective picks: the visitor's choice, else a default from the data ─
	const service = $derived(
		svc.find((s) => s.id && s.id === sel.service_id) ?? (svc.length === 1 && svc[0].id ? svc[0] : undefined)
	);
	const bounds = $derived(service?.party ?? readBounds(party));
	const guests = $derived(
		bounds ? Math.min(Math.max(Math.round(sel.party ?? ask ?? Math.min(2, bounds.max)), bounds.min), bounds.max) : undefined
	);
	const pre = $derived(nearest(dayList, preferred, taken));
	const openStart = (start: string | undefined) =>
		!!start && dayList.some((d) => d.slots.some((s) => s.start === start && isOpen(s, taken)));
	const shownDay = $derived(
		dayList.find((d) => d.date && d.date === dayPick) ??
			dayList.find((d) => d.slots.some((s) => s.start === sel.start)) ??
			dayList.find((d) => d.date === pre?.date) ??
			dayList.find((d) => d.slots.some((s) => isOpen(s, taken))) ??
			dayList[0]
	);
	const start = $derived(openStart(sel.start) ? sel.start : pre && shownDay?.date === pre.date ? pre.start : undefined);
	const chosenDay = $derived(dayList.find((d) => d.slots.some((s) => s.start === start)));
	const chosenSlot = $derived(chosenDay?.slots.find((s) => s.start === start));

	const current = $derived<Selection>({
		service_id: service?.id,
		start,
		party: guests,
		customer: sel.customer,
		notes: sel.notes
	});
	const errors = $derived(checkDetails(current));
	const request = $derived(toRequest(current, service));
	const busy = $derived(sending !== undefined && !done);

	// The furthest stage the data allows: a stage whose inputs vanished (a
	// slot taken, a streamed prop replaced) falls back to the first gap.
	const reachable = $derived(!service ? WHAT : !start ? WHEN : Object.keys(errors).length ? DETAILS : REVIEW);
	const at = $derived(Math.min(stage, reachable));

	const isTable = $derived((service ?? svc[0])?.kind === 'table');
	const heading = $derived(plain(title) || (isTable ? 'Book a table' : 'Book an appointment'));
	const stages = $derived([svc.length > 1 ? 'Service' : bounds ? 'Guests' : 'Service', 'Time', 'Details', 'Review']);
	const tzName = $derived(plain(tz).split('/').pop()?.replace(/_/g, ' ') ?? '');

	// The host answers a booking through `notice`. Any new notice ends the
	// wait; a slot-taken one marks that slot Full and returns to the times.
	$effect.pre(() => {
		const n = note;
		if (!n) return;
		untrack(() => {
			const sent = sending;
			sending = undefined;
			if (!isSlotTaken(n)) return;
			const gone = n.start ?? sent;
			if (gone) taken.add(gone);
			dir = -1;
			stage = WHEN;
		});
	});

	function write(patch: Selection) {
		const next: Selection = { ...current, ...patch };
		draft = next;
		selection = next;
		onselectionchange?.(next);
	}

	function go(to: number) {
		if (to > at && to > reachable) return;
		dir = to < at ? -1 : 1;
		stage = to;
		write({});
	}

	function advance() {
		if (at === DETAILS && Object.keys(errors).length) {
			tried = true;
			return;
		}
		go(at + 1);
	}

	function pickDay(date: string) {
		dayPick = date;
		if (start && chosenDay?.date !== date) write({ start: undefined });
	}

	function book() {
		if (busy || !request || !onbook) return;
		sending = request.start;
		onbook(request);
	}

	const guestWord = (n: number | undefined) => (n === 1 ? '1 guest' : `${n ?? ''} guests`);
	const minutes = (n: number | undefined) => (n ? `${n} min` : '');

	// Day cells: "Fri 16 Oct" splits into weekday and day number; any other
	// label shows whole.
	function dayParts(label: string) {
		const p = label.split(/\s+/);
		return p.length === 3 && /^\d{1,2}$/.test(p[1]) ? { wd: p[0], num: p[1], month: p[2] } : { wd: label, num: '', month: '' };
	}

	const dayIndex = $derived(Math.max(shownDay ? dayList.indexOf(shownDay) : 0, 0));
	const week = $derived(Math.floor(dayIndex / 7));
	const weekDays = $derived(dayList.slice(week * 7, week * 7 + 7));
	const weeks = $derived(Math.ceil(dayList.length / 7));
	function turnWeek(by: number) {
		const span = dayList.slice((week + by) * 7, (week + by) * 7 + 7);
		const open = span.find((d) => d.slots.some((s) => isOpen(s, taken))) ?? span[0];
		if (open) pickDay(open.date);
	}

	const summary = $derived(
		[
			svc.length > 1 ? service?.name : '',
			bounds ? guestWord(guests) : '',
			at > WHAT ? chosenDay?.date_label : '',
			at > WHAT ? chosenSlot?.label : ''
		].filter(Boolean).join(' · ')
	);
	const primary = $derived(
		at === WHAT ? 'Choose a time' : at === WHEN ? 'Add your details' : at === DETAILS ? 'Review' : busy ? 'Booking…' : isTable ? 'Book table' : 'Confirm booking'
	);
	const primaryOff = $derived(at === WHAT ? !service : at === WHEN ? !start : at === REVIEW ? !request || busy || !onbook : false);
	const showNotice = $derived(
		!!note && !busy && (note.kind === 'info' || (isSlotTaken(note) ? at === WHEN : at === REVIEW))
	);
	const fieldErr = (key: keyof typeof errors) => (tried ? errors[key] : undefined);
	const setCustomer = (key: 'name' | 'email' | 'phone', value: string) => write({ customer: { ...sel.customer, [key]: value } });
</script>

{#snippet row(Icon: LucideIcon, label: string, value: string | undefined, mono = false)}
	{#if value}
		<div class="flex min-w-0 items-center gap-2.5">
			<span class="grid size-8 shrink-0 place-items-center rounded-md bg-ripple-muted text-ripple-muted-foreground">
				<Icon size={16} strokeWidth={1.75} aria-hidden="true" />
			</span>
			<div class="min-w-0">
				<div class="text-footnote text-ripple-muted-foreground">{label}</div>
				<div class={['truncate text-body-emph text-ripple-surface-foreground', mono && 'font-mono tabular-nums']}>{value}</div>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet when()}
	{@render row(Calendar, 'Date', chosenDay?.date_label)}
	{@render row(Clock, 'Time', [chosenSlot?.label, minutes(service?.duration_min)].filter(Boolean).join(' · '))}
	{#if bounds}{@render row(Users, 'Party', guestWord(guests))}{/if}
	{#if svc.length > 1 || !isTable}{@render row(kindIcon(SERVICE_ICONS, service?.kind), 'Service', service?.name)}{/if}
{/snippet}

<div {id} class={['@container flex min-w-0 flex-col gap-3 text-ripple-surface-foreground', className]} data-stage={done ? 'confirmed' : stages[at]?.toLowerCase()}>
	<header class="flex min-w-0 flex-col gap-1">
		<h2 class="text-title-3 font-semibold text-pretty">{heading}</h2>
		{#if subtitle}<p class="text-footnote text-ripple-muted-foreground">{plain(subtitle)}</p>{/if}
	</header>
	<VerdictLine {verdict} />

	{#if done}
		<section class="flex flex-col gap-4 rounded-ripple border border-ripple-border bg-ripple-surface p-4" role="status" data-slot="confirmed">
			<div class="flex items-center gap-3">
				<span class={['grid size-10 shrink-0 place-items-center rounded-full', STATUS_CLASS.good.tint, STATUS_CLASS.good.text]}>
					<CalendarCheck size={20} strokeWidth={1.75} aria-hidden="true" />
				</span>
				<div class="min-w-0">
					<p class="text-headline">You're booked</p>
					{#if done.service_name}<p class="truncate text-footnote text-ripple-muted-foreground">{done.service_name}</p>{/if}
				</div>
			</div>
			<div class="grid gap-3 @min-[560px]:grid-cols-2">
				{@render row(Calendar, 'Date', done.date_label)}
				{@render row(Clock, 'Time', done.label)}
				{#if done.party}{@render row(Users, 'Party', guestWord(done.party))}{/if}
				{@render row(Hash, 'Booking reference', done.booking_id, true)}
			</div>
		</section>
	{:else}
		<StageRail {stages} current={at} onselect={(i) => go(i)} />

		{#if showNotice && note}
			{@const s = note.kind === 'info' ? 'info' : 'bad'}
			{@const NoticeIcon = STATUS_ICONS[s]}
			<div
				class={['flex items-start gap-2 rounded-md px-3 py-2 text-callout', STATUS_CLASS[s].tint, STATUS_CLASS[s].text]}
				role={note.kind === 'info' ? 'status' : 'alert'}
				data-slot="notice"
			>
				<NoticeIcon size={16} strokeWidth={1.75} aria-hidden="true" class="mt-px shrink-0" />
				<span class="min-w-0">{note.text}</span>
			</div>
		{/if}

		{#key at}
			<div class="flex min-w-0 flex-col gap-3" in:slide={{ dir }}>
				{#if at === WHAT}
					{#if svc.length > 1}
						<div class="flex flex-col gap-1.5" role="radiogroup" aria-label="Service">
							{#each svc as s, i (`${s.id}:${i}`)}
								{@const on = !!s.id && s.id === service?.id}
								<button
									type="button"
									role="radio"
									aria-checked={on}
									disabled={!s.id}
									class={[
										'flex min-h-14 w-full items-center gap-3 rounded-ripple border p-2 text-left transition-colors duration-150',
										on ? 'border-ripple-accent bg-ripple-accent/8' : 'border-ripple-border bg-ripple-surface hover:bg-ripple-muted'
									]}
									onclick={() => write({ service_id: s.id, party: undefined })}
								>
									<PhotoTile src={safeUrl(s.image, { kind: 'resource' })} alt={s.name} ratio="1:1" class="w-12 shrink-0" icon={kindIcon(SERVICE_ICONS, s.kind)} />
									<span class="min-w-0 flex-1">
										<span class="block truncate text-body-emph">{s.name || ' '}</span>
										<span class="block text-footnote text-ripple-muted-foreground">{minutes(s.duration_min)}</span>
									</span>
									{#if s.price !== undefined}
										<span class="shrink-0 text-body-emph tabular-nums">{money(s.price, currency)}</span>
									{/if}
								</button>
							{/each}
						</div>
					{:else if service}
						<div class="flex items-center gap-3 rounded-ripple border border-ripple-border bg-ripple-surface p-2">
							<PhotoTile src={safeUrl(service.image, { kind: 'resource' })} alt={service.name} ratio="1:1" class="w-12 shrink-0" icon={kindIcon(SERVICE_ICONS, service.kind)} />
							<div class="min-w-0 flex-1">
								<p class="truncate text-body-emph">{service.name}</p>
								<p class="text-footnote text-ripple-muted-foreground">{minutes(service.duration_min)}</p>
							</div>
							{#if service.price !== undefined}<span class="text-body-emph tabular-nums">{money(service.price, currency)}</span>{/if}
						</div>
					{:else if Array.isArray(services) && services.length === 0}
						<p class="text-callout text-ripple-muted-foreground">Nothing to book here right now.</p>
					{:else}
						<div class="flex flex-col gap-2" data-slot="skeleton" aria-busy="true">
							<div class="h-14 rounded-ripple bg-ripple-muted"></div>
						</div>
					{/if}

					{#if bounds && guests !== undefined}
						<div class="flex items-center justify-between gap-3 rounded-ripple border border-ripple-border bg-ripple-surface px-3 py-2">
							<div class="min-w-0">
								<p class="text-body-emph" id="{uid}-guests">Guests</p>
								<p class="text-footnote text-ripple-muted-foreground">{bounds.min} to {bounds.max}</p>
							</div>
							<div class="flex items-center gap-1" role="group" aria-labelledby="{uid}-guests">
								<button
									type="button"
									class="grid size-11 place-items-center rounded-md bg-ripple-muted transition-colors hover:bg-ripple-border disabled:opacity-40"
									aria-label="Fewer guests"
									disabled={guests <= bounds.min}
									onclick={() => write({ party: guests - 1 })}
								>
									<Minus size={16} strokeWidth={1.75} aria-hidden="true" />
								</button>
								<output class="w-10 text-center text-headline tabular-nums" aria-live="polite">{guests}</output>
								<button
									type="button"
									class="grid size-11 place-items-center rounded-md bg-ripple-muted transition-colors hover:bg-ripple-border disabled:opacity-40"
									aria-label="More guests"
									disabled={guests >= bounds.max}
									onclick={() => write({ party: guests + 1 })}
								>
									<Plus size={16} strokeWidth={1.75} aria-hidden="true" />
								</button>
							</div>
						</div>
					{/if}
				{:else if at === WHEN}
					<div class="flex flex-col gap-2">
						{#if weeks > 1}
							<div class="flex items-center justify-between gap-2">
								<p class="truncate text-footnote text-ripple-muted-foreground">
									{weekDays[0]?.date_label} – {weekDays.at(-1)?.date_label}
								</p>
								<div class="flex gap-1">
									<button type="button" class="grid size-8 place-items-center rounded-md hover:bg-ripple-muted disabled:opacity-40" aria-label="Earlier week" disabled={week === 0} onclick={() => turnWeek(-1)}>
										<ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
									</button>
									<button type="button" class="grid size-8 place-items-center rounded-md hover:bg-ripple-muted disabled:opacity-40" aria-label="Later week" disabled={week >= weeks - 1} onclick={() => turnWeek(1)}>
										<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
									</button>
								</div>
							</div>
						{/if}
						<div class="grid grid-cols-7 gap-1" role="group" aria-label="Day">
							{#each weekDays as d, i (`${d.date}:${i}`)}
								{@const p = dayParts(d.date_label)}
								{@const open = d.slots.filter((s) => isOpen(s, taken)).length}
								{@const on = d === shownDay}
								<button
									type="button"
									aria-pressed={on}
									aria-label="{d.date_label}, {d.slots.length === 0 ? 'closed' : open === 0 ? 'full' : `${open} open`}"
									class={[
										'flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-1.5 transition-colors duration-150',
										on ? 'border-ripple-accent bg-ripple-accent/8' : 'border-ripple-border bg-ripple-surface hover:bg-ripple-muted',
										open === 0 && !on && 'text-ripple-muted-foreground'
									]}
									onclick={() => pickDay(d.date)}
								>
									<span class="max-w-full truncate text-caption-1 uppercase tracking-[0.04em] text-ripple-muted-foreground">{p.wd}</span>
									{#if p.num}<span class="text-headline tabular-nums">{p.num}</span>{/if}
									{#if open}
										<span class="my-1 size-1.5 rounded-full bg-ripple-success" aria-hidden="true"></span>
									{:else}
										<span class="text-footnote text-ripple-muted-foreground">{d.slots.length === 0 ? 'Closed' : 'Full'}</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>

					{#if !Array.isArray(days)}
						<div class="grid grid-cols-3 gap-1.5 @min-[720px]:grid-cols-6" data-slot="skeleton" aria-busy="true">
							{#each [0, 1, 2] as k (k)}<div class="h-11 rounded-md bg-ripple-muted"></div>{/each}
						</div>
					{:else if dayList.length === 0}
						<p class="text-callout text-ripple-muted-foreground">No open times in the next two weeks.</p>
					{:else if shownDay && shownDay.slots.length === 0}
						<p class="text-callout text-ripple-muted-foreground">Closed on {shownDay.date_label}. Pick another day.</p>
					{:else if shownDay}
						{#each partsOfDay(shownDay.slots) as group, g (`${group.name}:${g}`)}
							<div class="flex flex-col gap-1.5" role="group" aria-label={group.name || 'Times'}>
								{#if group.name}
									<p class="text-caption-1 font-medium uppercase tracking-[0.04em] text-ripple-muted-foreground">{group.name}</p>
								{/if}
								<div class="grid grid-cols-3 gap-1.5 @min-[560px]:grid-cols-4 @min-[720px]:grid-cols-6">
									{#each group.slots as { slot, i } (`${slot.start}:${i}`)}
										{@const open = isOpen(slot, taken)}
										{@const on = open && slot.start === start}
										{@const closest = open && slot.start === pre?.start}
										<button
											type="button"
											aria-pressed={on}
											disabled={!open}
											aria-label="{slot.label}{open ? (closest ? ', closest to your ask' : '') : ', full'}"
											class={[
												'flex min-h-11 flex-col items-center justify-center rounded-md border px-1 py-1 text-callout tabular-nums transition-colors duration-150',
												on
													? 'border-ripple-accent bg-ripple-accent/8 font-medium'
													: open
														? 'border-ripple-border bg-ripple-surface hover:bg-ripple-muted'
														: 'cursor-not-allowed border-transparent bg-ripple-muted text-ripple-muted-foreground'
											]}
											onclick={() => write({ start: slot.start })}
										>
											<span class={[!open && 'line-through']}>{slot.label}</span>
											{#if !open}
												<span class="text-footnote">Full</span>
											{:else if closest}
												<span class="text-footnote text-ripple-muted-foreground @min-[560px]:hidden" aria-hidden="true">Closest</span>
												<span class="hidden text-footnote text-ripple-muted-foreground @min-[560px]:inline" aria-hidden="true">Closest to your ask</span>
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					{/if}
					{#if tzName && dayList.length}
						<p class="text-footnote text-ripple-muted-foreground">Times are {tzName} time.</p>
					{/if}
				{:else if at === DETAILS}
					<div class="grid gap-3 @min-[720px]:grid-cols-[minmax(0,1fr)_15rem]">
						<div class="flex flex-col gap-3">
							<div class="flex flex-col gap-1">
								<label for="{uid}-name" class="text-footnote text-ripple-muted-foreground">Name</label>
								<input
									id="{uid}-name"
									class="h-11 rounded-md border border-ripple-border bg-ripple-input px-3 text-body text-ripple-input-foreground focus-visible:outline-2 focus-visible:outline-ripple-ring aria-[invalid=true]:border-ripple-error"
									autocomplete="name"
									maxlength={LIMITS.name}
									value={sel.customer?.name ?? ''}
									aria-invalid={!!fieldErr('name')}
									aria-describedby={fieldErr('name') ? `${uid}-name-err` : undefined}
									oninput={(e) => setCustomer('name', e.currentTarget.value)}
								/>
								{#if fieldErr('name')}<span id="{uid}-name-err" class="text-footnote text-ripple-error-text">{fieldErr('name')}</span>{/if}
							</div>
							<div class="grid gap-3 @min-[560px]:grid-cols-2">
								<label class="flex flex-col gap-1">
									<span class="text-footnote text-ripple-muted-foreground">Email</span>
									<input
										type="email"
										class="h-11 rounded-md border border-ripple-border bg-ripple-input px-3 text-body text-ripple-input-foreground focus-visible:outline-2 focus-visible:outline-ripple-ring aria-[invalid=true]:border-ripple-error"
										autocomplete="email"
										inputmode="email"
										maxlength={LIMITS.email}
										value={sel.customer?.email ?? ''}
										aria-invalid={!!(fieldErr('email') || fieldErr('contact'))}
										aria-describedby={fieldErr('email') || fieldErr('contact') ? `${uid}-contact-err` : undefined}
										oninput={(e) => setCustomer('email', e.currentTarget.value)}
									/>
								</label>
								<label class="flex flex-col gap-1">
									<span class="text-footnote text-ripple-muted-foreground">Phone</span>
									<input
										type="tel"
										class="h-11 rounded-md border border-ripple-border bg-ripple-input px-3 text-body text-ripple-input-foreground focus-visible:outline-2 focus-visible:outline-ripple-ring aria-[invalid=true]:border-ripple-error"
										autocomplete="tel"
										inputmode="tel"
										maxlength={20}
										value={sel.customer?.phone ?? ''}
										aria-invalid={!!(fieldErr('phone') || fieldErr('contact'))}
										aria-describedby={fieldErr('phone') || fieldErr('contact') ? `${uid}-contact-err` : undefined}
										oninput={(e) => setCustomer('phone', e.currentTarget.value)}
									/>
								</label>
							</div>
							{#if fieldErr('contact') || fieldErr('email') || fieldErr('phone')}
								<span id="{uid}-contact-err" class="text-footnote text-ripple-error-text">
									{fieldErr('contact') ?? fieldErr('email') ?? fieldErr('phone')}
								</span>
							{:else}
								<span class="text-footnote text-ripple-muted-foreground">Email or phone, so they can reach you.</span>
							{/if}
							<label class="flex flex-col gap-1">
								<span class="flex justify-between text-footnote text-ripple-muted-foreground">
									<span>Notes (optional)</span>
									<span class="tabular-nums">{sel.notes?.length ?? 0}/{LIMITS.notes}</span>
								</span>
								<textarea
									class="min-h-20 rounded-md border border-ripple-border bg-ripple-input px-3 py-2 text-body text-ripple-input-foreground focus-visible:outline-2 focus-visible:outline-ripple-ring"
									maxlength={LIMITS.notes}
									rows="3"
									value={sel.notes ?? ''}
									oninput={(e) => write({ notes: e.currentTarget.value })}
								></textarea>
							</label>
						</div>
						<aside class="hidden flex-col gap-3 rounded-ripple bg-ripple-muted/60 p-3 @min-[720px]:flex" aria-label="Your booking">
							{@render when()}
						</aside>
					</div>
				{:else}
					<div class="grid gap-3 rounded-ripple border border-ripple-border bg-ripple-surface p-3 @min-[560px]:grid-cols-2">
						{@render when()}
						{@render row(User, 'Name', sel.customer?.name?.trim())}
						{@render row(Mail, 'Email', sel.customer?.email?.trim())}
						{@render row(Phone, 'Phone', sel.customer?.phone?.trim())}
						{#if service?.price !== undefined}{@render row(kindIcon(SERVICE_ICONS, service.kind), 'Price', money(service.price, currency))}{/if}
					</div>
					{#if sel.notes?.trim()}
						<div class="flex gap-2.5 text-callout">
							<StickyNote size={16} strokeWidth={1.75} aria-hidden="true" class="mt-px shrink-0 text-ripple-muted-foreground" />
							<p class="min-w-0 break-words whitespace-pre-line">{sel.notes.trim()}</p>
						</div>
					{/if}
				{/if}
			</div>
		{/key}

		<div class="sticky bottom-0 flex items-center gap-2 rounded-ripple border border-ripple-border bg-ripple-surface py-1.5 pr-1.5 pl-3">
			{#if at > WHAT}
				<button type="button" class="h-11 shrink-0 rounded-md px-3 text-callout text-ripple-muted-foreground hover:bg-ripple-muted" onclick={() => go(at - 1)}>
					Back
				</button>
			{/if}
			<p class="min-w-0 flex-1 truncate text-footnote text-ripple-muted-foreground tabular-nums">{summary}</p>
			<button
				type="button"
				class="h-11 shrink-0 rounded-md bg-ripple-accent px-4 text-body-emph text-ripple-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
				disabled={primaryOff}
				aria-busy={busy || undefined}
				onclick={() => (at === REVIEW ? book() : advance())}
			>
				{primary}
			</button>
		</div>
	{/if}
</div>
