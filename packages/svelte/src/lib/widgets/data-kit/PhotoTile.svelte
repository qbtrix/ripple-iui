<!--
  widgets/data-kit/PhotoTile.svelte — every photo in the data widgets (design
  doc 2026-10-09 §2.5). A fixed aspect box (4:3, 1:1, 16:9) so nothing shifts;
  the box is a muted skeleton until the image loads; a missing, refused or
  failed `src` shows the icon tile instead (the item's kind icon on
  --ripple-muted). A broken image is never shown.
  Invariant: the only `src` sink is `safeUrl(src, { kind: 'resource' })`
  inline on the <img> (security/url-sinks.test.ts audits that), and the <img>
  renders only when that call returns a URL. Width comes from the caller's
  class (`w-24`, `w-full`); a hero adds `max-h-[200px]`.
-->
<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import { safeUrl } from '@ripple-ui/core';
	import { FALLBACK_ICON } from './icons.js';

	type Ratio = '4:3' | '1:1' | '16:9';

	interface Props {
		src?: unknown;
		alt?: string;
		ratio?: Ratio;
		icon?: LucideIcon;
		iconSize?: number;
		class?: string;
	}

	let { src, alt = '', ratio = '1:1', icon, iconSize = 20, class: className }: Props = $props();

	const RATIO: Record<Ratio, string> = { '4:3': 'aspect-[4/3]', '1:1': 'aspect-square', '16:9': 'aspect-video' };

	// Keyed by URL, so a src that changes (a streamed placeholder swapped for
	// the hydrated photo) starts over as loading instead of inheriting a state.
	let loadedUrl = $state<string>();
	let failedUrl = $state<string>();

	const url = $derived(safeUrl(src, { kind: 'resource' }));
	const showImage = $derived(url !== undefined && failedUrl !== url);
	const phase = $derived(!showImage ? 'fallback' : loadedUrl === url ? 'loaded' : 'loading');
	const Icon = $derived(icon ?? FALLBACK_ICON);
</script>

<div class={['relative overflow-hidden rounded-md bg-ripple-muted', RATIO[ratio] ?? RATIO['1:1'], className]} data-state={phase}>
	{#if showImage}
		<img
			src={safeUrl(src, { kind: 'resource' })}
			{alt}
			loading="lazy"
			decoding="async"
			class={['size-full object-cover transition-opacity duration-150 ease-ripple-out', phase === 'loaded' ? 'opacity-100' : 'opacity-0']}
			onload={() => (loadedUrl = url)}
			onerror={() => (failedUrl = url)}
		/>
	{:else if alt}
		<div class="grid size-full place-items-center text-ripple-muted-foreground" role="img" aria-label={alt}>
			<Icon size={iconSize} strokeWidth={1.75} aria-hidden="true" />
		</div>
	{:else}
		<div class="grid size-full place-items-center text-ripple-muted-foreground" aria-hidden="true">
			<Icon size={iconSize} strokeWidth={1.75} />
		</div>
	{/if}
</div>
