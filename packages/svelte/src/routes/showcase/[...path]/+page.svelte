<!--
  @file routes/showcase/[...path]/+page.svelte
  @description An old /showcase URL (see +page.ts for where each one goes).
    The prerendered HTML carries a meta refresh (works with JavaScript off) and
    a plain link; in the browser it also replaces the URL right away.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	onMount(() => {
		goto(data.to, { replaceState: true });
	});
</script>

<svelte:head>
	<title>Moved to {data.to} · Ripple</title>
	<meta http-equiv="refresh" content="0; url={data.to}" />
	<link rel="canonical" href={data.to} />
</svelte:head>

<p class="moved">This page moved to <a href={data.to}>{data.to}</a>.</p>

<style>
	.moved {
		max-width: var(--site-max);
		margin: 0 auto;
		padding: 48px var(--site-gutter);
		color: var(--site-soft);
	}
	.moved a {
		color: var(--primary-ink);
	}
</style>
