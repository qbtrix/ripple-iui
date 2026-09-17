<!--
  Flex.svelte — Ripple flexbox layout widget.
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
		direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
		justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
		align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
		gap?: number | string;
		wrap?: boolean | 'wrap' | 'nowrap' | 'wrap-reverse';
		/** Layout variant */
		variant?: 'default' | 'divided' | 'compact';
		onclick?: (e?: unknown) => void;
	}

	let {
		id, class: className, style, children,
		direction = 'row', justify = 'start', align = 'stretch',
		gap, wrap = false, variant = 'default', onclick
	}: Props = $props();

	const justifyMap: Record<string, string> = {
		start: 'flex-start', end: 'flex-end', center: 'center',
		between: 'space-between', around: 'space-around', evenly: 'space-evenly'
	};

	const alignMap: Record<string, string> = {
		start: 'flex-start', end: 'flex-end', center: 'center',
		baseline: 'baseline', stretch: 'stretch'
	};

	const wrapValue = $derived(
		wrap === true || wrap === 'wrap' ? 'wrap' : wrap === 'wrap-reverse' ? 'wrap-reverse' : 'nowrap'
	);

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
		const s: string[] = [
			'display:flex',
			`flex-direction:${direction}`,
			`justify-content:${justifyMap[justify] ?? 'flex-start'}`,
			`align-items:${alignMap[align] ?? 'stretch'}`,
			`flex-wrap:${wrapValue}`,
		];
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

<div
	{id}
	class="rflex {variant !== 'default' ? `rflex--${variant}` : ''} {className ?? ''}"
	style={combinedStyle}
	{...interactive}
>
	{@render children?.()}
</div>

<style>
	.rflex { min-width: 0; }

	/* Divided: separators between children */
	.rflex--divided { gap: 0 !important; }
	.rflex--divided > :global(*) {
		padding: 5px 0;
		border-bottom: 1px solid var(--ripple-border-subtle, rgba(255,255,255,0.04));
	}
	.rflex--divided > :global(*:last-child) { border-bottom: none; }

	/* Compact: tighter spacing */
	.rflex--compact { gap: 0 !important; }
	.rflex--compact > :global(*) { padding: 3px 0; }
</style>
