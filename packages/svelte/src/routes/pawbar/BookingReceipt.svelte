<!--
  @file routes/pawbar/BookingReceipt.svelte
  @description The host-owned receipt the landing chat shows under a booking
    card once the test store confirms it (201): what, date, time, party and the
    booking id, all from the store's answer, rendered as plain text. "Add to
    calendar" builds an .ics file (book.ts bookingIcs, times in UTC) and saves
    it from a same-origin blob URL that is revoked right after. The sibling of
    /live's OrderReceipt.
-->
<script lang="ts">
	import { bookingIcs, type Booked } from './book.js';

	let { booking, durationMin, place }: { booking: Booked; durationMin?: number; place?: string } = $props();

	const ics = $derived(bookingIcs(booking, { durationMin, place }));

	function addToCalendar() {
		const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = `booking-${booking.booking_id}.ics`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
</script>

<section class="receipt" aria-label="Booking confirmed">
	<p class="title">Booked{booking.service_name ? `: ${booking.service_name}` : ''}</p>
	<dl>
		{#if booking.date_label}<dt>Date</dt><dd>{booking.date_label}</dd>{/if}
		{#if booking.label}<dt>Time</dt><dd>{booking.label}</dd>{/if}
		{#if booking.party}<dt>Party</dt><dd>{booking.party} {booking.party === 1 ? 'person' : 'people'}</dd>{/if}
		<dt>Booking</dt><dd><code>{booking.booking_id}</code></dd>
	</dl>
	{#if ics}<button type="button" class="cal" onclick={addToCalendar}>Add to calendar</button>{/if}
</section>

<style>
	.receipt {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-paw);
		background: var(--site-card, var(--card));
	}
	.title {
		margin: 0;
		font-weight: 600;
	}
	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 4px 14px;
		margin: 0;
		font-size: 14px;
	}
	dt {
		color: var(--site-soft);
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	code {
		font-family: var(--font-mono);
		font-size: 0.92em;
	}
	.cal {
		align-self: flex-start;
		padding: 7px 13px;
		border: 1px solid color-mix(in oklch, var(--primary) 55%, transparent);
		border-radius: 999px;
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 13.5px;
		font-weight: 600;
		cursor: pointer;
	}
	.cal:hover {
		background: color-mix(in oklch, var(--primary) 14%, transparent);
	}
	.cal:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
</style>
