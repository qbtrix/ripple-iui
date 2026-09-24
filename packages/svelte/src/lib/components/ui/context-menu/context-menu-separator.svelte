<!--
  context-menu-separator.svelte — vendored shadcn-svelte ContextMenu.Separator.
  Wraps bits-ui ContextMenuPrimitive.Separator. Vendored 2026-07-10 with the paw
  frosted-popover canon.
-->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: ContextMenuPrimitive.SeparatorProps = $props();
</script>

<ContextMenuPrimitive.Separator
	bind:ref
	data-slot="context-menu-separator"
	class={cn("bg-border -mx-1 my-1 h-px", className)}
	{...restProps}
/>
