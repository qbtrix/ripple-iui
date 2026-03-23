<!--
  @file Image.svelte
  @description Image display widget.
  @created 2024-12-XX
  @changes
    - Initial creation with src, alt, width, height props
-->
<script lang="ts">
	import { cn } from '../../utils.js';

	interface Props {
		id?: string;
		class?: string;
		style?: Record<string, string>;
		/** Image source URL */
		src?: string;
		/** Alt text */
		alt?: string;
		/** Width (number for px, string for any unit) */
		width?: number | string;
		/** Height (number for px, string for any unit) */
		height?: number | string;
		/** Object fit */
		fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
		/** Border radius */
		rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
	}

	let {
		id,
		class: className,
		style,
		src = '',
		alt = '',
		width,
		height,
		fit = 'cover',
		rounded = 'md'
	}: Props = $props();

	const fitClass = $derived({
		'contain': 'object-contain',
		'cover': 'object-cover',
		'fill': 'object-fill',
		'none': 'object-none',
		'scale-down': 'object-scale-down'
	}[fit]);

	const roundedClass = $derived({
		'none': 'rounded-none',
		'sm': 'rounded-sm',
		'md': 'rounded-md',
		'lg': 'rounded-lg',
		'xl': 'rounded-xl',
		'full': 'rounded-full'
	}[rounded]);

	const styleString = $derived(() => {
		const styles: string[] = [];
		if (width) {
			styles.push(`width:${typeof width === 'number' ? `${width}px` : width}`);
		}
		if (height) {
			styles.push(`height:${typeof height === 'number' ? `${height}px` : height}`);
		}
		if (style) {
			styles.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
		}
		return styles.length > 0 ? styles.join(';') : undefined;
	});
</script>

<img
	{id}
	{src}
	{alt}
	class={cn(fitClass, roundedClass, className)}
	style={styleString()}
/>
