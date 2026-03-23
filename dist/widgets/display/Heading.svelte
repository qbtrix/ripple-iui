<!--
  @file Heading.svelte
  @description Heading display widget for titles (h1-h6).
  @created 2024-12-XX
  @changes
    - Initial creation with level and text props
-->
<script lang="ts">
	import { cn } from '../../utils.js';

	interface Props {
		id?: string;
		class?: string;
		style?: Record<string, string>;
		/** Heading text */
		text?: string;
		/** Heading level (1-6) */
		level?: 1 | 2 | 3 | 4 | 5 | 6;
	}

	let {
		id,
		class: className,
		style,
		text = '',
		level = 2
	}: Props = $props();

	const levelStyles = {
		1: 'text-4xl font-extrabold tracking-tight lg:text-5xl',
		2: 'text-3xl font-semibold tracking-tight',
		3: 'text-2xl font-semibold tracking-tight',
		4: 'text-xl font-semibold tracking-tight',
		5: 'text-lg font-semibold',
		6: 'text-base font-semibold'
	};

	const styleString = $derived(
		style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
	);
</script>

{#if level === 1}
	<h1 {id} class={cn(levelStyles[1], className)} style={styleString}>{text}</h1>
{:else if level === 2}
	<h2 {id} class={cn(levelStyles[2], className)} style={styleString}>{text}</h2>
{:else if level === 3}
	<h3 {id} class={cn(levelStyles[3], className)} style={styleString}>{text}</h3>
{:else if level === 4}
	<h4 {id} class={cn(levelStyles[4], className)} style={styleString}>{text}</h4>
{:else if level === 5}
	<h5 {id} class={cn(levelStyles[5], className)} style={styleString}>{text}</h5>
{:else}
	<h6 {id} class={cn(levelStyles[6], className)} style={styleString}>{text}</h6>
{/if}
