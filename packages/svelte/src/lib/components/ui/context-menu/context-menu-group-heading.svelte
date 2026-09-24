<!--
  context-menu-group-heading.svelte — vendored shadcn-svelte
  ContextMenu.GroupHeading. Wraps bits-ui ContextMenuPrimitive.GroupHeading.
  Vendored 2026-07-10 with the paw frosted-popover canon.
-->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		...restProps
	}: ComponentProps<typeof ContextMenuPrimitive.GroupHeading> & {
		inset?: boolean;
	} = $props();
</script>

<ContextMenuPrimitive.GroupHeading
	bind:ref
	data-slot="context-menu-group-heading"
	data-inset={inset}
	class={cn("text-foreground px-2 py-1.5 text-sm font-semibold data-[inset]:ps-8", className)}
	{...restProps}
/>
