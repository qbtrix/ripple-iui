<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		id?: string;
		class?: string;
		style?: Record<string, string>;
		children?: Snippet;
		onclick?: (e?: unknown) => void;
	}

	let { id, class: className = '', style, children, onclick }: Props = $props();

	// Simple style string generation
	const styleString = $derived.by(() => {
		if (!style) return undefined;
		return Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';');
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div {id} class={className} style={styleString} onclick={onclick}>
	{@render children?.()}
</div>
