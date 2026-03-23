<!--
  @file Text.svelte
  @description Text display widget for paragraphs and inline text.
  @created 2024-12-XX
  @changes
    - Initial creation with text, size, weight, color props
-->
<script lang="ts">
	import { cn } from '../../utils.js';

	interface Props {
		id?: string;
		class?: string;
		style?: Record<string, string>;
		/** Text content to display */
		text?: string;
		/** Text size */
		size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
		/** Font weight */
		weight?: 'normal' | 'medium' | 'semibold' | 'bold';
		/** Text color (Tailwind class or custom) */
		color?: string;
		/** Whether to render as inline span or block p */
		inline?: boolean;
	}

	let {
		id,
		class: className,
		style,
		text = '',
		size = 'base',
		weight = 'normal',
		color,
		inline = false
	}: Props = $props();

	const sizeClass = $derived({
		'xs': 'text-xs',
		'sm': 'text-sm',
		'base': 'text-base',
		'lg': 'text-lg',
		'xl': 'text-xl',
		'2xl': 'text-2xl',
		'3xl': 'text-3xl'
	}[size]);

	const weightClass = $derived({
		'normal': 'font-normal',
		'medium': 'font-medium',
		'semibold': 'font-semibold',
		'bold': 'font-bold'
	}[weight]);

	const colorClass = $derived(() => {
		if (!color) return 'text-foreground';
		if (color.startsWith('text-')) return color;
		if (color.startsWith('#') || color.startsWith('rgb')) return '';
		return `text-${color}`;
	});

	const styleString = $derived(() => {
		const styles: string[] = [];
		if (color && (color.startsWith('#') || color.startsWith('rgb'))) {
			styles.push(`color:${color}`);
		}
		if (style) {
			styles.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
		}
		return styles.length > 0 ? styles.join(';') : undefined;
	});
</script>

{#if inline}
	<span {id} class={cn(sizeClass, weightClass, colorClass(), className)} style={styleString()}>
		{text}
	</span>
{:else}
	<p {id} class={cn(sizeClass, weightClass, colorClass(), className)} style={styleString()}>
		{text}
	</p>
{/if}
