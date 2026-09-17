<!-- alert.svelte
  2026-09-17 (fix/port-gaps): status-coloured text moved onto the readable
  text tokens (text-ripple-{error,success,warning,info}-text; red text that
  read text-destructive now reads text-ripple-error-text, the same hue since
  --ripple-error aliases --destructive). The raw tones are fill colours and
  measured 1.7-3.3:1 as text in light mode. Fills and tints are unchanged. -->
<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";

	export const alertVariants = tv({
		base: "grid gap-0.5 rounded-ripple border border-ripple-border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 group/alert relative w-full",
		variants: {
			variant: {
				default: "bg-ripple-surface text-ripple-surface-foreground",
				destructive: "text-ripple-error-text bg-ripple-surface *:data-[slot=alert-description]:text-ripple-error-text/90 *:[svg]:text-current",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	export type AlertVariant = VariantProps<typeof alertVariants>["variant"];
</script>

<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		variant = "default",
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariant;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert"
	role="alert"
	class={cn(alertVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
