<!--
  widgets/display/Illustration.svelte — `illustration`: model-written animated
  SVG, rendered safely (design doc 2026-10-09-ripple-illustration-svg.md).
  No bind. Optional `annotations` add numbered note pins; a spec's `on_select`
  arrives as `onselect({ id })` when a pin or legend item is clicked.

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
  - Annotations are host DOM over the art, never SVG: the art stays
    non-interactive. A `target` must name an id the rebuild kept (looked up
    as prefix + id), else the note is dropped. Pins sit at the target's bbox
    centre (or `at` in viewBox units) mapped through getScreenCTM, re-placed
    on resize. Label and note render as text only. The open note's target
    gets the `ill-note-target` class (host-owned, never from the model).
    Focus opens a note without firing onselect; a click fires it.
-->
<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import { ILLUSTRATION_MAX_HEIGHT as MAX_H } from '@ripple-ui/core/manifest';
	import { prefersReducedMotion } from 'svelte/motion';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import { ILLUSTRATION_ANNOTATION_CAPS as NOTE_CAPS } from '@ripple-ui/core/manifest';
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
		/** Up to 8 numbered notes, each on an svg id (`target`) or a viewBox point (`at`). */
		annotations?: Annotation[];
		/** A spec's `on_select`: fires with the note id when a pin or legend item is clicked. */
		onselect?: (detail: { id: string }) => void;
	}

	interface Annotation {
		id: string;
		label: string;
		note: string;
		target?: string;
		at?: [number, number];
	}

	let { id, class: className, style, svg, title, caption, max_height, annotations, onselect }: Props = $props();

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

	/** The rebuilt element a model id names, or null when the rebuild dropped it. */
	function findTarget(svgRoot: Element, target: string): SVGGraphicsElement | null {
		const want = prefix + target;
		for (const el of [svgRoot, ...svgRoot.querySelectorAll('[id]')]) if (el.getAttribute('id') === want) return el as SVGGraphicsElement;
		return null;
	}

	const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

	/** The usable notes: well-formed, under the caps, and (for `target`) present in the rebuilt art. */
	const notes = $derived.by<Annotation[]>(() => {
		const out: Annotation[] = [];
		const seen = new Set<string>();
		for (const a of Array.isArray(annotations) ? annotations.slice(0, NOTE_CAPS.max) : []) {
			if (!a || typeof a !== 'object') continue;
			const nid = typeof a.id === 'string' ? a.id : '';
			const label = plain(a.label).slice(0, NOTE_CAPS.label);
			if (!nid || !label || seen.has(nid)) continue;
			const hasTarget = a.target !== undefined;
			if (hasTarget === (a.at !== undefined)) continue;
			const note = plain(a.note).slice(0, NOTE_CAPS.note);
			if (hasTarget) {
				if (typeof a.target !== 'string' || !a.target || !art || !findTarget(art, a.target)) continue;
				out.push({ id: nid, label, note, target: a.target });
			} else {
				const at = a.at;
				if (!Array.isArray(at) || at.length !== 2 || !finite(at[0]) || !finite(at[1])) continue;
				out.push({ id: nid, label, note, at: [at[0], at[1]] });
			}
			seen.add(nid);
		}
		return out;
	});

	let frame = $state<HTMLDivElement>();
	/** Pin centres in px from the art frame's top-left, by note id. Unplaced notes show in the legend only. */
	let pos = $state.raw<Record<string, [number, number]>>({});
	let frameSize = $state.raw<[number, number]>([0, 0]);
	let openId = $state<string | null>(null);
	const open = $derived(notes.find((n) => n.id === openId) ?? null);

	type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };
	const apply = (m: Matrix, x: number, y: number): [number, number] => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];

	/** Screen point of a note: the target's bbox centre, or `at` in the art's viewBox units. */
	function screenPoint(svgRoot: SVGSVGElement, n: Annotation): [number, number] | null {
		try {
			if (n.at) {
				const m = svgRoot.getScreenCTM?.();
				return m ? apply(m, n.at[0], n.at[1]) : null;
			}
			const el = findTarget(svgRoot, n.target ?? '');
			const b = el?.getBBox?.();
			const m = el?.getScreenCTM?.();
			if (!b || !m) return null;
			// ponytail: placed at layout and resize only; a target that animates away keeps its first spot.
			return apply(m, b.x + b.width / 2, b.y + b.height / 2);
		} catch {
			return null; // getBBox throws for an unrendered element in Firefox.
		}
	}

	function place() {
		if (!art || !frame) return;
		const base = frame.getBoundingClientRect();
		const out: Record<string, [number, number]> = {};
		for (const n of notes) {
			const p = screenPoint(art, n);
			if (p && finite(p[0]) && finite(p[1])) out[n.id] = [p[0] - base.left, p[1] - base.top];
		}
		pos = out;
		frameSize = [base.width, base.height];
	}

	$effect(() => {
		void notes;
		if (!art || !frame) {
			pos = {};
			return;
		}
		place();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => place());
		ro.observe(frame);
		return () => ro.disconnect();
	});

	$effect(() => {
		const el = open?.target && art ? findTarget(art, open.target) : null;
		if (!el) return;
		el.classList.add('ill-note-target');
		return () => el.classList.remove('ill-note-target');
	});

	/** Where the open note's popover sits: beside its pin on a wide frame, else a sheet under the art. */
	const POP_W = 256;
	const popover = $derived.by(() => {
		const p = open ? pos[open.id] : undefined;
		const [w, h] = frameSize;
		if (!p || w < 420) return null;
		const half = POP_W / 2 + 8;
		return { x: Math.min(Math.max(p[0], half), w - half), y: p[1], above: p[1] > h / 2 };
	});

	let figure = $state<HTMLElement>();
	let trigger: HTMLElement | null = null;
	let refocusing = false;

	function show(nid: string, e: Event) {
		trigger = e.currentTarget as HTMLElement;
		if (!refocusing) openId = nid;
	}
	function select(nid: string, e: Event) {
		trigger = e.currentTarget as HTMLElement;
		openId = nid;
		onselect?.({ id: nid });
	}
	function close() {
		openId = null;
		if (!trigger?.isConnected) return;
		refocusing = true;
		trigger.focus();
		refocusing = false;
	}
	function onWindowKey(e: KeyboardEvent) {
		if (e.key !== 'Escape' || !openId || !figure) return;
		const active = figure.ownerDocument.activeElement;
		if (active && active !== figure.ownerDocument.body && !figure.contains(active)) return;
		e.preventDefault();
		close();
	}

	$effect(() => {
		if (!art) return;
		if (paused) art.pauseAnimations?.();
		else art.unpauseAnimations?.();
	});
</script>

<svelte:window onkeydown={onWindowKey} />

<figure
	bind:this={figure}
	{id}
	class={['illustration m-0 flex min-w-0 flex-col gap-2 text-ripple-surface-foreground', className]}
	style={rootStyle}
	style:--illustration-max-h="{maxH}px"
	data-widget="illustration"
>
	<div class="relative" bind:this={frame}>
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
		{#each notes as n, i (n.id)}
			{@const p = pos[n.id]}
			{#if p}
				<button
					type="button"
					class="absolute inline-flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ripple-surface bg-ripple-accent text-[11px] font-semibold text-ripple-accent-foreground shadow-sm transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripple-ring motion-reduce:transition-none"
					style:left="{p[0]}px"
					style:top="{p[1]}px"
					aria-label="{i + 1}. {n.label}"
					aria-expanded={openId === n.id}
					aria-controls="{uid}-note"
					data-slot="pin"
					data-note={n.id}
					onfocus={(e) => show(n.id, e)}
					onclick={(e) => select(n.id, e)}>{i + 1}</button
				>
			{/if}
		{/each}
		{#if open}
			<div
				id="{uid}-note"
				class={[
					'z-10 rounded-ripple border border-ripple-border bg-ripple-popover p-3 text-ripple-surface-foreground shadow-md',
					popover ? 'absolute w-64 -translate-x-1/2' : 'mt-2'
				]}
				style:left={popover ? `${popover.x}px` : undefined}
				style:top={popover && !popover.above ? `${popover.y + 16}px` : undefined}
				style:bottom={popover?.above ? `${frameSize[1] - popover.y + 16}px` : undefined}
				aria-live="polite"
				data-slot="note"
				data-layout={popover ? 'popover' : 'sheet'}
			>
				<div class="flex items-start justify-between gap-2">
					<p class="m-0 text-callout font-semibold" data-slot="note-label">{open.label}</p>
					<button
						type="button"
						class="-m-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-ripple-muted-foreground hover:text-ripple-surface-foreground"
						aria-label="Close note"
						onclick={close}>×</button
					>
				</div>
				{#if open.note}<p class="m-0 mt-1 text-callout text-ripple-muted-foreground" data-slot="note-text">{open.note}</p>{/if}
			</div>
		{/if}
	</div>
	{#if captionText}
		<figcaption class="text-footnote text-ripple-muted-foreground" data-slot="caption">{captionText}</figcaption>
	{/if}
	{#if notes.length}
		<ol class="m-0 flex list-none flex-col gap-1 p-0" aria-label="Notes" data-slot="legend">
			{#each notes as n, i (n.id)}
				<li>
					<button
						type="button"
						class={[
							'flex w-full items-center gap-2 rounded-ripple px-1.5 py-1 text-left text-callout hover:bg-ripple-muted/60',
							openId === n.id && 'bg-ripple-muted/60'
						]}
						aria-expanded={openId === n.id}
						aria-controls="{uid}-note"
						data-slot="legend-item"
						onclick={(e) => select(n.id, e)}
					>
						<span class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ripple-accent text-[10px] font-semibold text-ripple-accent-foreground" aria-hidden="true">{i + 1}</span>
						<span>{n.label}</span>
					</button>
				</li>
			{/each}
		</ol>
	{/if}
</figure>

<style>
	.illustration-host :global(svg) {
		display: block;
		width: 100%;
		height: auto;
		max-height: var(--illustration-max-h);
	}
	.illustration-host :global(.ill-note-target) {
		filter: drop-shadow(0 0 2px var(--ripple-accent)) drop-shadow(0 0 6px var(--ripple-accent));
	}
</style>
