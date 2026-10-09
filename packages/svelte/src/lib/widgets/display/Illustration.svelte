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
  - The figure's text-ripple-surface-foreground is inherited by the art, so
    fill='currentColor' is the card ink in both themes.
  - Text stays readable (display only, the rebuilt markup is not re-checked):
    after each rebuild, and again on a theme change (.dark / data-theme on
    <html>, prefers-color-scheme), every text/tspan whose effective fill is
    under 3:1 against what it sits on (the last solid shape painted under its
    centre, else the card's composited background) gets the card foreground
    or background, whichever reads better. currentColor, url(#..) and
    unparseable fills are never touched. Original fills are restored first, so
    a theme flip re-decides from the model's colour, not the previous fix.
-->
<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import { ILLUSTRATION_MAX_HEIGHT as MAX_H } from '@ripple-ui/core/manifest';
	import { prefersReducedMotion } from 'svelte/motion';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import { hasAnimation, sanitizeIllustrationSvg } from '$lib/security/illustration-svg.js';
	import { plain } from '../data-kit/index.js';
	import { contrast, over, parseColor, pickReadable, toCss, type Rgba } from './illustration-contrast.js';

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

	/** Bumped on a theme change so the legibility pass re-runs without a rebuild. */
	let themeTick = $state(0);
	$effect(() => {
		const root = host?.ownerDocument.documentElement;
		if (!root) return;
		const bump = () => themeTick++;
		const mo = new MutationObserver(bump);
		mo.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });
		const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
		mq?.addEventListener?.('change', bump);
		return () => {
			mo.disconnect();
			mq?.removeEventListener?.('change', bump);
		};
	});

	$effect(() => {
		void themeTick;
		if (art && host) keepTextReadable(art, host);
	});

	const BLACK: Rgba = [0, 0, 0, 1];
	const WHITE: Rgba = [1, 1, 1, 1];
	const SHAPES = 'rect,circle,ellipse,path,polygon';
	/** The model's own fill per text node (null = none), so a theme flip re-decides from it. */
	const original = new WeakMap<Element, string | null>();

	/** The fill an element paints with: its own, else the nearest ancestor's inside the art, else black. */
	function effectiveFill(el: Element, svgRoot: Element): string {
		for (let n: Element | null = el; n && n !== svgRoot.parentElement; n = n.parentElement) {
			const f = n.getAttribute('fill');
			if (f && f.trim() !== 'inherit') return f;
		}
		return 'black';
	}

	/** The card's background: translucent layers composited down to the first opaque one. */
	function cardBackground(from: Element): Rgba {
		const view = from.ownerDocument.defaultView;
		const layers: Rgba[] = [];
		for (let n: Element | null = from; n && view; n = n.parentElement) {
			const c = parseColor(view.getComputedStyle(n).backgroundColor);
			if (!c || c[3] === 0) continue;
			layers.push(c);
			if (c[3] >= 1) break;
		}
		// ponytail: no opaque ancestor means the canvas; assumed white.
		return layers.reduceRight<Rgba>((bg, top) => over(top, bg), WHITE);
	}

	// ponytail: getBBox ignores transforms, so text and a shape under different
	// <g transform>s compare in different spaces; getScreenCTM mapping if that bites.
	function box(el: Element): DOMRect | null {
		try {
			const b = (el as SVGGraphicsElement).getBBox?.();
			return b && b.width > 0 && b.height > 0 ? b : null;
		} catch {
			return null; // Firefox throws for an unrendered element.
		}
	}

	function keepTextReadable(svgRoot: SVGSVGElement, within: Element) {
		const view = within.ownerDocument.defaultView;
		if (!view) return;
		const card = cardBackground(within);
		const fgRaw = parseColor(view.getComputedStyle(within).color);
		const fg: Rgba = fgRaw && fgRaw[3] > 0 ? over(fgRaw, card) : pickReadable(card, WHITE, BLACK);
		const shapes = [...svgRoot.querySelectorAll(SHAPES)];
		for (const t of svgRoot.querySelectorAll('text, tspan')) {
			if (!original.has(t)) original.set(t, t.getAttribute('fill'));
			const own = original.get(t);
			if (own == null) t.removeAttribute('fill');
			else t.setAttribute('fill', own);
			const raw = effectiveFill(t, svgRoot);
			if (raw.trim().toLowerCase() === 'currentcolor') continue;
			const fill = parseColor(raw);
			if (!fill || fill[3] === 0) continue;
			const bg = shapeUnder(t, shapes, svgRoot) ?? card;
			if (contrast(fill, bg) >= 3) continue;
			t.setAttribute('fill', toCss(pickReadable(bg, fg, card)));
		}
	}

	/** The solid fill of the last shape painted before `t` whose box holds `t`'s centre. */
	function shapeUnder(t: Element, shapes: Element[], svgRoot: Element): Rgba | null {
		const tb = box(t);
		if (!tb) return null;
		const cx = tb.x + tb.width / 2;
		const cy = tb.y + tb.height / 2;
		let hit: Rgba | null = null;
		for (const s of shapes) {
			if (!(s.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
			const c = parseColor(effectiveFill(s, svgRoot));
			if (!c || c[3] === 0) continue;
			const b = box(s);
			if (b && cx >= b.x && cx <= b.x + b.width && cy >= b.y && cy <= b.y + b.height) hit = c;
		}
		return hit && hit[3] < 1 ? over(hit, cardBackground(svgRoot)) : hit;
	}

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
