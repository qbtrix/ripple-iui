<!--
  @file Flex.svelte
  @description Flexbox container widget for flexible layouts.
  @created 2024-12-XX
  @changes
    - Initial creation with flex direction, justify, align, gap, wrap props
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../../utils.js';

	interface Props {
		id?: string;
		class?: string;
		style?: Record<string, string>;
		children?: Snippet;
		/** Flex direction */
		direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
		/** Justify content */
		justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
		/** Align items */
		align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
		/** Gap between items */
		gap?: number | string;
		/** Flex wrap */
		wrap?: boolean | 'wrap' | 'nowrap' | 'wrap-reverse';
		/** Click handler */
		onclick?: (e?: unknown) => void;
	}

	let {
		id,
		class: className,
		style,
		children,
		direction = 'row',
		justify = 'start',
		align = 'stretch',
		gap,
		wrap = false,
		onclick
	}: Props = $props();

	const directionClass = $derived({
		'row': 'flex-row',
		'column': 'flex-col',
		'row-reverse': 'flex-row-reverse',
		'column-reverse': 'flex-col-reverse'
	}[direction]);

	const justifyClass = $derived({
		'start': 'justify-start',
		'end': 'justify-end',
		'center': 'justify-center',
		'between': 'justify-between',
		'around': 'justify-around',
		'evenly': 'justify-evenly'
	}[justify]);

	const alignClass = $derived({
		'start': 'items-start',
		'end': 'items-end',
		'center': 'items-center',
		'baseline': 'items-baseline',
		'stretch': 'items-stretch'
	}[align]);

	const wrapClass = $derived(() => {
		if (wrap === true || wrap === 'wrap') return 'flex-wrap';
		if (wrap === 'wrap-reverse') return 'flex-wrap-reverse';
		return 'flex-nowrap';
	});

	const gapClass = $derived(() => {
		if (!gap) return '';
		if (typeof gap === 'number') return `gap-${gap}`;
		return `gap-[${gap}]`;
	});

	const combinedStyle = $derived(() => {
		const styles: string[] = [];
		if (style) {
			styles.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
		}
		return styles.length > 0 ? styles.join(';') : undefined;
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	{id}
	class={cn('flex', directionClass, justifyClass, alignClass, wrapClass(), gapClass(), typeof className === 'string' ? className : '')}
	style={combinedStyle()}
	{onclick}
>
	{@render children?.()}
</div>
