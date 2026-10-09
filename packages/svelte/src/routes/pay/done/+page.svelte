<!--
  @file routes/pay/done/+page.svelte
  @description Where the store's payment page returns, in the tab the pay
    card's link opened: `?order=<id>` after paying, `?cancelled=1` after a
    cancel. Prerendered; in the browser it tells the chat tab through
    BroadcastChannel('ripple-order') (done.ts announce), says what happened
    with a link back to the landing, and tries to close itself, which the
    browser allows only for some tabs. The chat confirms with the store itself.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { announce, type Outcome } from './done.js';

	let outcome = $state<Outcome | null>(null);

	onMount(() => {
		const r = announce(location.search);
		outcome = r.outcome;
		if (!r.order) return;
		const t = setTimeout(() => window.close(), 1500);
		return () => clearTimeout(t);
	});
</script>

<svelte:head>
	<title>Payment · Ripple</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="done">
	<section class="panel" aria-live="polite">
		{#if outcome === 'paid'}
			<p class="mark" aria-hidden="true">✓</p>
			<h1>Payment received.</h1>
			<p>Your order is in the chat. You can close this tab.</p>
		{:else if outcome === 'cancelled'}
			<h1>Payment cancelled.</h1>
			<p>Nothing was charged. The chat can start a new checkout.</p>
		{:else if outcome === 'unknown'}
			<h1>No payment to show.</h1>
			<p>This link doesn't name an order this page recognises.</p>
		{:else}
			<h1>Finishing up</h1>
		{/if}
		<a class="back" href="/">Back to the chat</a>
	</section>
</main>

<style>
	.done {
		display: grid;
		place-items: center;
		min-height: calc(100vh - var(--site-topbar, 53px) - 120px);
		padding: 32px 16px;
	}
	.panel {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
		width: min(440px, 100%);
		padding: 24px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-paw);
		background: var(--site-panel, color-mix(in oklch, var(--background) 82%, transparent));
		color: var(--site-ink);
	}
	.mark {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		margin: 0;
		border-radius: 50%;
		background: #1877f2;
		color: #fff;
		font-weight: 700;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 22px;
		font-weight: 600;
	}
	p {
		margin: 0;
		line-height: 1.55;
		color: var(--site-soft);
	}
	.back {
		margin-top: 8px;
		padding: 8px 16px;
		border-radius: 9px;
		background: #1877f2;
		color: #fff;
		font-weight: 600;
		font-size: 14px;
		text-decoration: none;
	}
	.back:focus-visible {
		outline: 2px solid #1877f2;
		outline-offset: 2px;
	}
</style>
