<!--
  Container.svelte — Ripple generic vertical/stack container widget.
  Updated 2026-06-08 (design polish): emits a `data-ripple-container` marker so
  surfaces that want to impose a baseline rhythm on a bare container's stacked
  children (e.g. the flow card — see FlowRunner) can target it without guessing
  at the class. This is purely ADDITIVE: the div still renders the spec's class
  verbatim and sets no default gap of its own, so no existing surface changes.
  The flow-card baseline rhythm is opt-in via the FlowRunner scope, keyed off
  this marker, and is overridden by any gap-* the spec sets on the container.
-->
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
<div {id} class={className} style={styleString} onclick={onclick} data-ripple-container>
	{@render children?.()}
</div>
