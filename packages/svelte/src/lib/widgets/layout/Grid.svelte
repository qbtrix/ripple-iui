<!--
  Grid.svelte — Ripple CSS grid layout widget.
  Updated 2026-06-09 (a11y): optional onclick uses a conditional-spread so the div
  is a plain element with no handler and a keyboard-operable role="button"
  (Enter/Space) when one is passed. Replaces the dead svelte-ignore.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		id?: string;
		class?: string;
		style?: Record<string, string>;
		children?: Snippet;
		columns?: number | string;
		rows?: number | string;
		gap?: number | string;
		onclick?: (e?: unknown) => void;
	}

	let {
		id, class: className, style, children,
		columns = 1, rows, gap, onclick
	}: Props = $props();

	const gapScale: Record<string, string> = {
		xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', '2xl': '32px'
	};
	const gapValue = $derived(
		gap == null
			? undefined
			: typeof gap === 'number'
				? `${gap * 4}px`
				: (gapScale[gap] ?? gap)
	);

	const combinedStyle = $derived.by(() => {
		const s: string[] = ['display:grid'];
		if (typeof columns === 'number') s.push(`grid-template-columns:repeat(${columns},1fr)`);
		else s.push(`grid-template-columns:${columns}`);
		if (rows) {
			if (typeof rows === 'number') s.push(`grid-template-rows:repeat(${rows},1fr)`);
			else s.push(`grid-template-rows:${rows}`);
		}
		if (gapValue) s.push(`gap:${gapValue}`);
		if (style) s.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
		return s.join(';');
	});

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick?.(e); }
	}
	const interactive = $derived(
		onclick ? { role: 'button', tabindex: 0, onclick, onkeydown: handleKey } : {}
	);
</script>

<div {id} class="rgrid {className ?? ''}" style={combinedStyle} {...interactive}>
	{@render children?.()}
</div>

<style>
	.rgrid { min-width: 0; }
</style>
