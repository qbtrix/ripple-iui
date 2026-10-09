<!--
  @file lib/site/landing/LazyRipple.svelte
  @description A <Ripple> render that mounts when its frame nears the
    viewport, for the catalog's mini-renders. Server and first client render
    both show the empty frame (so hydration matches); an IntersectionObserver
    attachment flips it once (at once where there is no observer). With
    JavaScript off the frame stays empty and
    the caption under it still names the widget.
-->
<script lang="ts">
	import Ripple from '$lib/Ripple.svelte';
	import type { Attachment } from 'svelte/attachments';

	let { spec, label }: { spec: Record<string, unknown>; label: string } = $props();
	let shown = $state(false);

	const watch: Attachment<HTMLElement> = (el) => {
		// No observer (an old browser, jsdom): mount straight away.
		if (typeof IntersectionObserver === 'undefined') {
			shown = true;
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					shown = true;
					io.disconnect();
				}
			},
			{ rootMargin: '200px 0px' }
		);
		io.observe(el);
		return () => io.disconnect();
	};
</script>

<div class="frame" {@attach watch} role="group" aria-label="{label}, rendered" data-pagefind-ignore="all">
	{#if shown}<Ripple {spec} />{/if}
</div>

<style>
	/* A render wider or taller than the frame scrolls rather than clips. */
	.frame {
		height: 100%;
		overflow: auto;
	}
</style>
