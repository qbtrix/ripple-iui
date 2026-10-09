<!--
  @file routes/pawbar/PayCard.svelte
  @description The host-built pay card the chat shows once the store opened a
    checkout: the lines, the total and a "Pay $X" link that opens the payment
    page in a new tab (a real link click, so popup blockers allow it). The url
    already passed live/checkout.ts isAllowedRedirect. An OrderWatch
    (pay/watch.svelte.ts) polls the store from mount until unmount; /pay/done's
    BroadcastChannel ping only makes it poll sooner. Pending shows "Waiting for
    payment", cancelled offers a new checkout (onretry), and paid swaps the
    card for a TrackCard. Every phase change goes to onphase (the session
    keeps it on the card and in sessionStorage). The store's total and items win over the cart's once
    the store answers. All text is plain; nothing goes through {@html}.
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
		onphase
	}: { pay: Pay; storeUrl: string; fetch?: typeof globalThis.fetch; channel?: WatchDeps['channel']; onretry?: () => void; onphase?: (phase: Phase) => void } = $props();

	// svelte-ignore state_referenced_locally
	const watch = new OrderWatch(pay.sessionId, { storeUrl, fetch, channel });
	onMount(() => {
		watch.start();
		return () => watch.stop();
	});
	$effect(() => onphase?.(watch.phase));

	const money = (n: number) => `$${n.toFixed(2)}`;
	const total = $derived(watch.order?.total ?? pay.summary.total);
	const lines = $derived(watch.order?.items.length ? watch.order.items : pay.summary.lines);
	const fulfilment = $derived(watch.order?.fulfilment ?? pay.summary.orderType);
</script>

{#if (watch.phase === 'tracking' || watch.phase === 'done') && watch.tracking}
	<TrackCard orderId={pay.sessionId} tracking={watch.tracking} {fulfilment} />
{:else}
	<section class="pay" aria-label="Payment" data-phase={watch.phase}>
		<ul class="lines">
			{#each lines as l, i (i)}
				<li><span>{l.qty} × {l.name}</span></li>
			{/each}
		</ul>
		<p class="total"><span>Total</span><strong>{money(total)}</strong></p>
		{#if watch.phase === 'pending'}
			<a class="go" href={pay.url} target="_blank" rel="noopener">Pay {money(total)}</a>
			<p class="state" role="status"><span class="dot" aria-hidden="true"></span>Waiting for payment…{watch.trouble ? ' Still checking with the store.' : ''}</p>
		{:else if watch.phase === 'tracking'}
			<p class="state" role="status"><span class="dot" aria-hidden="true"></span>Paid. Getting the tracking ready…</p>
		{:else if watch.phase === 'cancelled'}
			<p class="state" role="status">Payment cancelled. Nothing was charged.</p>
			{#if onretry}<button type="button" class="retry" onclick={onretry}>Start a new checkout</button>{/if}
		{:else if watch.phase === 'expired'}
			<p class="state" role="status">Stopped checking after 15 minutes. If you paid, the store has your order.</p>
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
		background: var(--site-panel, color-mix(in oklch, var(--background) 82%, transparent));
	}
	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 14px;
		overflow-wrap: anywhere;
	}
	.total {
		display: flex;
		justify-content: space-between;
		margin: 0;
		padding-top: 8px;
		border-top: 1px solid var(--site-line);
	}
	.go {
		align-self: flex-start;
		padding: 9px 18px;
		border-radius: 9px;
		background: #1877f2;
		color: #fff;
		font-weight: 600;
		font-size: 14px;
		text-decoration: none;
	}
	.state {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-size: 13.5px;
		color: var(--site-soft);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #1877f2;
		animation: blink 1.4s ease-in-out infinite;
	}
	.retry {
		align-self: flex-start;
		padding: 7px 13px;
		border: 1px solid color-mix(in oklch, #1877f2 55%, transparent);
		border-radius: 999px;
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 13.5px;
		font-weight: 600;
		cursor: pointer;
	}
	.go:focus-visible,
	.retry:focus-visible {
		outline: 2px solid #1877f2;
		outline-offset: 2px;
	}
	@keyframes blink {
		50% {
			opacity: 0.35;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
		}
	}
</style>
