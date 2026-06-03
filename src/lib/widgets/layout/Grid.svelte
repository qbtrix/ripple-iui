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
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div {id} class="rgrid {className ?? ''}" style={combinedStyle} {onclick}>
	{@render children?.()}
</div>

<style>
	.rgrid { min-width: 0; }
</style>
