<!--
  @file routes/pawbar/PayCard.svelte
  @description The host-built pay card the chat shows once the store opened a
    checkout, styled as a sibling of BookingReceipt and the tracking card: a
    header (icon, "Checkout", the store name, Tasty Bites unless the host passes
    one), the lines with qty and price, the total, and a primary "Pay $X" link
    that opens the payment page in a new tab (a real link click, so popup
    blockers allow it). The url already passed live/checkout.ts
    isAllowedRedirect. An OrderWatch (pay/watch.svelte.ts) polls the store from
    mount until unmount; /pay/done's BroadcastChannel ping only makes it poll
    sooner. Pending shows a spinner and "Waiting for payment", cancelled offers
    a new checkout (onretry), expired explains itself, and paid swaps the card
    for a TrackCard that stays mounted from the first tracking answer on (done,
    and the watch expiring mid-delivery, keep it and its map as they are). Exactly one role="status" per phase. Every phase change
    goes to onphase (the session keeps it on the card and in sessionStorage).
    The store's total and items win over the cart's once the store answers
    (its items carry no price, so a line's price shows only while known). All
    text is plain; nothing goes through {@html}.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { Pay } from '../live/checkout.js';
	import { OrderWatch, type Phase, type WatchDeps } from '../pay/watch.svelte.js';
	import TrackCard from './TrackCard.svelte';

	let {
		pay,
		storeUrl,
		fetch,
		channel,
		onretry,
		onphase,
		store = 'Tasty Bites'
	}: {
		pay: Pay;
		storeUrl: string;
		fetch?: typeof globalThis.fetch;
		channel?: WatchDeps['channel'];
		onretry?: () => void;
		onphase?: (phase: Phase) => void;
		store?: string;
	} = $props();

	// svelte-ignore state_referenced_locally
	const watch = new OrderWatch(pay.sessionId, { storeUrl, fetch, channel });
	onMount(() => {
		watch.start();
		return () => watch.stop();
	});
	$effect(() => onphase?.(watch.phase));

	const money = (n: number) => `$${n.toFixed(2)}`;
	const total = $derived(watch.order?.total ?? pay.summary.total);
	const lines = $derived<{ name: string; qty: number; price?: number }[]>(watch.order?.items.length ? watch.order.items : pay.summary.lines);
	const fulfilment = $derived(watch.order?.fulfilment ?? pay.summary.orderType);
</script>

{#if watch.tracking}
	<TrackCard orderId={pay.sessionId} tracking={watch.tracking} {fulfilment} />
{:else}
	<section class="pay" aria-label="Payment" data-phase={watch.phase}>
		<header class="head">
			<span class="icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
					><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></svg
				>
			</span>
			<span class="title">Checkout</span>
			<span class="store">{store}</span>
		</header>
		<ul class="lines">
			{#each lines as l, i (i)}
				<li><span class="item">{l.qty} × {l.name}</span>{#if l.price != null}<span class="price">{money(l.price * l.qty)}</span>{/if}</li>
			{/each}
		</ul>
		<p class="total"><span>Total</span><strong>{money(total)}</strong></p>
		{#if watch.phase === 'pending'}
			<a class="go" href={pay.url} target="_blank" rel="noopener"
				>Pay {money(total)}<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
					><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg
				></a
			>
			<p class="state" role="status">
				<span class="spin" aria-hidden="true"></span>Waiting for payment…{watch.trouble ? ' Still checking with the store.' : ''}
			</p>
			<p class="fine">Opens a secure test checkout in a new tab.</p>
		{:else if watch.phase === 'tracking'}
			<p class="state" role="status"><span class="spin" aria-hidden="true"></span>Paid. Getting the tracking ready…</p>
		{:else if watch.phase === 'cancelled'}
			<p class="state stop" role="status">Payment cancelled. Nothing was charged.</p>
			{#if onretry}<button type="button" class="retry" onclick={onretry}>Start a new checkout</button>{/if}
		{:else if watch.phase === 'expired'}
			<p class="state stop" role="status">Stopped checking after 15 minutes. If you paid, the store has your order.</p>
		{/if}
	</section>
{/if}

<style>
	.pay {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-paw);
		background: var(--site-card, var(--card));
		color: var(--site-ink);
	}
	.head {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 26px;
		height: 26px;
		border-radius: 8px;
		background: color-mix(in oklch, var(--primary) 14%, transparent);
		color: var(--primary-ink, var(--primary));
	}
	.title {
		font-weight: 600;
	}
	.store {
		margin-left: auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		color: var(--site-soft);
	}
	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 14px;
	}
	.lines li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}
	.item {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.price {
		flex: none;
		color: var(--site-soft);
		font-variant-numeric: tabular-nums;
	}
	.total {
		display: flex;
		justify-content: space-between;
		margin: 0;
		padding-top: 8px;
		border-top: 1px solid var(--site-line);
		font-variant-numeric: tabular-nums;
	}
	.go {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		align-self: flex-start;
		padding: 9px 18px;
		border-radius: 9px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-weight: 600;
		font-size: 14px;
		text-decoration: none;
		transition: filter 0.15s;
	}
	.go:hover {
		filter: brightness(1.08);
	}
	.state {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-size: 13.5px;
		color: var(--site-soft);
	}
	.state.stop {
		padding: 8px 12px;
		border-radius: 10px;
		background: color-mix(in oklch, var(--paw-crimson) 12%, transparent);
		color: var(--site-ink);
	}
	.fine {
		margin: -4px 0 0;
		font-size: 12.5px;
		color: var(--site-soft);
	}
	.spin {
		flex: none;
		width: 12px;
		height: 12px;
		border: 2px solid color-mix(in oklch, var(--primary) 25%, transparent);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.9s linear infinite;
	}
	.retry {
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
	.retry:hover {
		background: color-mix(in oklch, var(--primary) 14%, transparent);
	}
	.go:focus-visible,
	.retry:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spin {
			animation: none;
			border-color: var(--primary);
			opacity: 0.6;
		}
	}
</style>
