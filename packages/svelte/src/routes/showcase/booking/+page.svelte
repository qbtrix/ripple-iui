<!--
  routes/showcase/booking/+page.svelte — dev preview of the `booking` widget
  for screenshots and visual QA, linked from the /showcase gallery. A fictional
  restaurant with one table service and 7 days of slots (some full, one day
  closed), shown three ways: the whole flow against a simulated host (the
  first booking comes back "slot taken", the next one confirms), a 360px frame
  already holding a slot-taken answer, and a 360px confirmed booking.
  Fictional data only: the site is public.
-->
<script lang="ts">
	import DetailHeader from '../DetailHeader.svelte';
	import Booking from '$lib/widgets/composite/Booking.svelte';
	import type { BookingRequest, Confirmed, Notice, Selection } from '$lib/widgets/composite/booking.js';

	const TIMES = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
	const label = (t: string) => {
		const [h, m] = t.split(':').map(Number);
		return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
	};
	const day = (date: string, date_label: string, full: string[] = [], times = TIMES) => ({
		date,
		date_label,
		slots: times.map((t) => ({ start: `${date}T${t}:00-04:00`, label: label(t), available: !full.includes(t) }))
	});
	const days = [
		day('2026-10-13', 'Tue 13 Oct', ['19:00']),
		day('2026-10-14', 'Wed 14 Oct'),
		day('2026-10-15', 'Thu 15 Oct', ['19:30', '20:00']),
		day('2026-10-16', 'Fri 16 Oct', ['18:30', '19:00', '20:00', '20:30']),
		day('2026-10-17', 'Sat 17 Oct', TIMES),
		day('2026-10-18', 'Sun 18 Oct', [], ['12:00', '12:30', '13:00', '13:30', ...TIMES.slice(0, 6)]),
		day('2026-10-19', 'Mon 19 Oct', [], [])
	];
	const services = [{ id: 'table', name: 'Dinner table', kind: 'table', duration_min: 90, party: { min: 1, max: 8 } }];
	const base = {
		subtitle: 'Juniper & Ash · Dupont Circle',
		tz: 'America/New_York',
		services,
		days,
		party: 4,
		preferred: { date: '2026-10-16', after: '19:00' }
	};
	const find = (start: string) => {
		const d = days.find((x) => x.slots.some((s) => s.start === start));
		return { d, s: d?.slots.find((s) => s.start === start) };
	};

	// ── The simulated host for the live example ───────────────────────────
	let run = $state(0);
	let selection = $state<Selection>();
	let notice = $state<Notice>();
	let confirmed = $state<Confirmed>();
	let nextTaken = $state(true);
	let log = $state<string>('');

	function onbook(req: BookingRequest) {
		log = JSON.stringify(req, null, 2);
		setTimeout(() => {
			if (nextTaken) {
				nextTaken = false;
				notice = { kind: 'error', text: 'That time was just taken. Pick another.', code: 'slot_taken', start: req.start };
				return;
			}
			const { d, s } = find(req.start);
			confirmed = { booking_id: 'JA-2041', label: s?.label, date_label: d?.date_label, service_name: 'Dinner table', party: req.party };
		}, 700);
	}

	function reset() {
		selection = notice = confirmed = undefined;
		nextTaken = true;
		log = '';
		run++;
	}
</script>

<svelte:head><title>Ripple · Booking</title></svelte:head>

<div class="showcase">
	<DetailHeader id="booking">Table booking for a fictional restaurant. The live example's host answers the first booking with "slot taken" and confirms the next.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Live flow, wide (drag the corner)</h2>
		<div data-thumb class="pane frame" style:width="760px">
			{#key run}
				<Booking {...base} bind:selection {notice} {confirmed} {onbook} />
			{/key}
		</div>
		<div class="row">
			<button type="button" class="btn" onclick={reset}>Start over</button>
			<span class="caption">Next booking: {nextTaken ? 'slot taken' : 'confirmed'}</span>
		</div>
		{#if log}<pre class="pane log">on_book {log}</pre>{/if}
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">At 360px: a slot-taken answer, and a confirmed booking</h2>
		<div class="row top">
			<div class="pane frame" style:width="360px">
				<Booking
					{...base}
					selection={{ start: '2026-10-16T19:30:00-04:00', party: 4, customer: { name: 'Ana Ruiz', email: 'ana@example.com' } }}
					notice={{ kind: 'error', text: 'That time was just taken. Pick another.', code: 'slot_taken', start: '2026-10-16T19:30:00-04:00' }}
					onbook={() => {}}
				/>
			</div>
			<div class="pane frame" style:width="360px">
				<Booking
					{...base}
					verdict={{ text: 'Friday at 7:30 PM for four is booked.', status: 'good' }}
					confirmed={{ booking_id: 'JA-2041', label: '7:30 PM', date_label: 'Fri 16 Oct', service_name: 'Dinner table', party: 4 }}
				/>
			</div>
		</div>
	</section>
</div>

<style>
	.showcase {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		color: var(--foreground);
	}
	.caption {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin: 0 0 1rem;
	}
	.caption {
		margin: 0;
	}
	.showcase-section {
		margin-bottom: 2.5rem;
	}
	.showcase-section-title {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}
	.pane {
		padding: 1rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--muted) 35%, var(--background));
		margin-bottom: 0.75rem;
	}
	.frame {
		max-width: 100%;
		resize: horizontal;
		overflow: auto;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}
	.top {
		align-items: flex-start;
	}
	.btn {
		padding: 0.35rem 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border);
		background: var(--background);
		color: var(--foreground);
		font: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
	}
	.log {
		font-size: 0.75rem;
		white-space: pre-wrap;
		margin-top: 0.75rem;
	}
</style>
