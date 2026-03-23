<!--
  @file Grid.svelte
  @description CSS Grid container widget for grid layouts.
  @created 2024-12-XX
  @changes
    - Initial creation with columns, rows, gap props
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../../utils.js';

	interface Props {
		id?: string;
		class?: string;
		style?: Record<string, string>;
		children?: Snippet;
		/** Number of columns or template string */
		columns?: number | string;
		/** Number of rows or template string */
		rows?: number | string;
		/** Gap between items */
		gap?: number | string;
		/** Click handler */
		onclick?: (e?: unknown) => void;
	}

	let {
		id,
		class: className,
		style,
		children,
		columns = 1,
		rows,
		gap,
		onclick
	}: Props = $props();

	const colsClass = $derived(() => {
		if (typeof columns === 'number') {
			return `grid-cols-${columns}`;
		}
		return '';
	});

	const rowsClass = $derived(() => {
		if (typeof rows === 'number') {
			return `grid-rows-${rows}`;
		}
		return '';
	});

	const gapClass = $derived(() => {
		if (!gap) return '';
		if (typeof gap === 'number') return `gap-${gap}`;
		return '';
	});

	const customStyle = $derived(() => {
		const styles: string[] = [];

		// Custom column template
		if (typeof columns === 'string') {
			styles.push(`grid-template-columns:${columns}`);
		}

		// Custom row template
		if (typeof rows === 'string') {
			styles.push(`grid-template-rows:${rows}`);
		}

		// Custom gap
		if (typeof gap === 'string') {
			styles.push(`gap:${gap}`);
		}

		// User-provided styles
		if (style) {
			styles.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
		}

		return styles.length > 0 ? styles.join(';') : undefined;
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	{id}
	class={cn('grid', colsClass(), rowsClass(), gapClass(), typeof className === 'string' ? className : '')}
	style={customStyle()}
	{onclick}
>
	{@render children?.()}
</div>
