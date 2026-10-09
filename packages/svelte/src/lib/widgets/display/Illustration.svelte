<!--
  widgets/display/Illustration.svelte — `illustration`: model-written animated
  SVG, rendered safely (design doc 2026-10-09-ripple-illustration-svg.md).
  Display only: no bind, no events.

  Invariants:
  - The markup never reaches the DOM as a string. sanitizeIllustrationSvg
    parses it with DOMParser and rebuilds an allowlisted copy with
    createElementNS; the effect swaps that node into the host. No innerHTML,
    no {@html}.
  - `svg` is read inside the effect, so a streamed string re-renders on every
    chunk; a partial (parse error) or an over-cap string shows the quiet
    placeholder at `max_height`.
  - Ids are prefixed with `ill-<$props.id()>-`, so two cards never share one.
    The stream-parity fixture normalizes that prefix.
  - Under prefers-reduced-motion the art starts paused (pauseAnimations); the
    pause/play button, shown only when the art animates, overrides it.
  - Nothing renders server-side but the frame: DOMParser needs a DOM.
-->
<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import { ILLUSTRATION_MAX_HEIGHT as MAX_H } from '@ripple-ui/core/manifest';
	import { prefersReducedMotion } from 'svelte/motion';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import { hasAnimation, sanitizeIllustrationSvg } from '$lib/security/illustration-svg.js';
	import { plain } from '../data-kit/index.js';

	interface Props {
		id?: string;
		class?: string;
		style?: string | Record<string, string>;
		/** SVG markup, root <svg> with a viewBox. */
		svg?: string;
		/** Accessible name. */
		title?: string;
		/** Optional text under the art. */
		caption?: string;
		/** Height cap in px, 80..640, default 320. */
		max_height?: number;
	}

	let { id, class: className, style, svg, title, caption, max_height }: Props = $props();

	const uid = $props.id();
	const prefix = `ill-${uid}-`;

	const rootStyle = $derived(
		style && typeof style === 'object'
			? safeStyle(Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';'))
			: safeStyle(typeof style === 'string' ? style : '')
	);
	const maxH = $derived.by(() => {
		const n = Number(max_height);
		return Number.isFinite(n) && n > 0 ? Math.min(MAX_H.max, Math.max(MAX_H.min, n)) : MAX_H.default;
	});
	const heading = $derived(plain(title) || 'Illustration');
	const captionText = $derived(plain(caption));

	let host = $state<HTMLDivElement>();
	let art = $state.raw<SVGSVGElement | null>(null);
	/** The visitor's choice; null follows prefers-reduced-motion. */
	let userPaused = $state<boolean | null>(null);
	const paused = $derived(userPaused ?? prefersReducedMotion.current);
	const animated = $derived(art ? hasAnimation(art) : false);

	$effect(() => {
		const markup = typeof svg === 'string' ? svg : '';
		if (!host) return;
		const node = sanitizeIllustrationSvg(markup, host.ownerDocument, prefix);
		host.replaceChildren(...(node ? [node] : []));
		art = node;
	});

	$effect(() => {
		if (!art) return;
		if (paused) art.pauseAnimations?.();
		else art.unpauseAnimations?.();
	});
</script>

<figure
	{id}
	class={['illustration m-0 flex min-w-0 flex-col gap-2 text-ripple-surface-foreground', className]}
	style={rootStyle}
	style:--illustration-max-h="{maxH}px"
	data-widget="illustration"
>
	<div class="relative">
		<div class="illustration-art" role="img" aria-labelledby="{uid}-title">
			<span id="{uid}-title" class="sr-only">{heading}</span>
			<div bind:this={host} class="illustration-host"></div>
			{#if !art}
				<div class="rounded-ripple bg-ripple-muted/50" style:height="{maxH}px" aria-hidden="true" data-slot="placeholder"></div>
			{/if}
		</div>
		{#if animated}
			<button
				type="button"
				class="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full border border-ripple-border bg-ripple-surface/85 text-ripple-muted-foreground transition-colors duration-150 hover:text-ripple-surface-foreground motion-reduce:transition-none"
				aria-label={paused ? 'Play animation' : 'Pause animation'}
				data-slot="motion-toggle"
				onclick={() => (userPaused = !paused)}
			>
				{#if paused}<Play size={14} strokeWidth={1.75} />{:else}<Pause size={14} strokeWidth={1.75} />{/if}
			</button>
		{/if}
	</div>
	{#if captionText}
		<figcaption class="text-footnote text-ripple-muted-foreground" data-slot="caption">{captionText}</figcaption>
	{/if}
</figure>

<style>
	.illustration-host :global(svg) {
		display: block;
		width: 100%;
		height: auto;
		max-height: var(--illustration-max-h);
	}
</style>
