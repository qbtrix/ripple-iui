<!--
  context-menu-label.svelte — vendored shadcn-svelte ContextMenu.Label (a plain
  heading div, matching ui/dropdown-menu's label). Vendored 2026-07-10 with the
  paw frosted-popover canon.
-->
<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		inset?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="context-menu-label"
	data-inset={inset}
	class={cn("text-foreground px-2 py-1.5 text-sm font-semibold data-[inset]:ps-8", className)}
	{...restProps}
>
	{@render children?.()}
</div>
