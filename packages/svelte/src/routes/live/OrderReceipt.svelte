<!--
  @file routes/live/OrderReceipt.svelte
  @description The panel /live shows when a visitor comes back from the test
    store's checkout: `?order=<session>` (paid, or `mock` when the store runs
    without Stripe and records no order) or `?cancelled=1`. Lists the cart the
    host saved before redirecting (display prices only; the store charged its
    own), polls the store's public orders feed for this session's status in
    real mode, and links to the store's live orders board.
-->
<script lang="ts">
	import type { OrderSummary } from './checkout.js';

	interface Props {
		storeUrl: string;
		order?: string | null;
		mock?: boolean;
		cancelled?: boolean;
		summary?: OrderSummary | null;
		fetch?: typeof fetch;
		pollMs?: number;
		ondismiss?: () => void;
	}
	let { storeUrl, order = null, mock = false, cancelled = false, summary = null, fetch: get = fetch, pollMs = 2000, ondismiss }: Props = $props();

	const money = (n: number) => `$${n.toFixed(2)}`;
	const estimate = $derived(summary?.lines.reduce((a, l) => a + l.price * l.qty, 0) ?? 0);
	let status = $state<{ status: string; total?: number } | null>(null);
	let gaveUp = $state(false);

	// Real mode: the Stripe webhook records the order under the session id.
	$effect(() => {
		if (!order || mock) return;
		let tries = 0;
		let stopped = false;
		let timer: ReturnType<typeof setTimeout>;
		const look = async () => {
			try {
				const res = await get(`${storeUrl}/api/orders?limit=20`);
				const found = ((await res.json()).orders ?? []).find((o: { id?: string }) => o.id === order);
				if (found && !stopped) return void (status = { status: String(found.status), total: Number(found.total) || undefined });
			} catch {
				/* store unreachable: keep trying a little, then say so */
			}
			if (stopped) return;
			if (++tries < 5) timer = setTimeout(look, pollMs);
			else gaveUp = true;
		};
		look();
		return () => {
			stopped = true;
			clearTimeout(timer);
		};
	});
</script>

<section class="receipt" data-state={cancelled ? 'cancelled' : mock ? 'mock' : 'paid'} aria-live="polite">
	{#if cancelled}
		<p class="title">Checkout cancelled</p>
		<p class="note">Nothing was charged. The order builder is still below if you want another go.</p>
	{:else}
		<p class="title">{mock ? 'Checkout complete (test mode)' : 'Payment confirmed'}</p>
		{#if mock}
			<p class="note">
				This store is running without Stripe, so no card was charged and no order was recorded. With a
				Stripe test key it would appear on the store's orders board.
			</p>
		{:else if status}
			<p class="note">The kitchen has it. Store status: <strong>{status.status}</strong>.</p>
		{:else if gaveUp}
			<p class="note">Paid. The store hasn't listed the order yet; it will show on its live orders board.</p>
		{:else}
			<p class="note">Paid. Waiting for the store to confirm the order...</p>
		{/if}
		{#if summary?.lines.length}
			<ul class="lines">
				{#each summary.lines as l, i (i)}
					<li><span>{l.qty} × {l.name}</span><span>{money(l.price * l.qty)}</span></li>
				{/each}
				<li class="total">
					<span>{summary.orderType === 'delivery' ? 'Delivery' : 'Pickup'} total</span>
					<span>{status?.total ? money(status.total) : `${money(estimate)} est.`}</span>
				</li>
			</ul>
		{/if}
		{#if order}<p class="ref">Order ref <code>{order}</code></p>{/if}
	{/if}
	<div class="actions">
		<a href="{storeUrl}/orders" target="_blank" rel="noopener">See the store's live orders</a>
		{#if ondismiss}<button type="button" onclick={ondismiss}>Dismiss</button>{/if}
	</div>
</section>

<style>
	.receipt {
		border: 1px solid var(--line, var(--border));
		border-left: 3px solid var(--accent, hsl(216 74% 50%));
		border-radius: 12px;
		background: var(--panel, var(--card));
		padding: 16px 18px;
		margin-bottom: 20px;
		max-width: 640px;
	}
	.receipt[data-state='cancelled'] {
		border-left-color: var(--ink-soft, gray);
	}
	.title {
		margin: 0;
		font-weight: 600;
		font-size: 17px;
	}
	.note {
		margin: 6px 0 0;
		line-height: 1.5;
		color: var(--ink-soft, inherit);
	}
	.lines {
		list-style: none;
		margin: 12px 0 0;
		padding: 0;
		font-size: 14px;
	}
	.lines li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 4px 0;
		font-variant-numeric: tabular-nums;
	}
	.lines .total {
		border-top: 1px solid var(--line, var(--border));
		margin-top: 4px;
		padding-top: 8px;
		font-weight: 600;
	}
	.ref {
		margin: 10px 0 0;
		font-size: 12px;
		color: var(--ink-soft, inherit);
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		margin-top: 14px;
		font-size: 14px;
	}
	.actions a {
		color: var(--accent, inherit);
		font-weight: 500;
	}
	.actions button {
		font: inherit;
		font-size: 13px;
		padding: 4px 10px;
		border: 1px solid var(--line, var(--border));
		border-radius: 8px;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
</style>
