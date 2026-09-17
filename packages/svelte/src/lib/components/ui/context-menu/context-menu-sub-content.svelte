<!--
  context-menu-sub-content.svelte — vendored shadcn-svelte ContextMenu.SubContent.
  Re-tokened 2026-09-14 (ripple overlay canonical): host-only bg-popover / border
  swapped for bg-ripple-popover + ring-ripple-border + backdrop-blur-md (glass
  in tokens). 2026-09-17 (fix/port-gaps): moved off bg-ripple-surface, the host's
  in-flow --card tint, which let page text read through the submenu. Wraps bits-ui ContextMenuPrimitive.SubContent.
  Originally vendored 2026-07-10 (feat/canonical-menubar-contextmenu).
-->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: ContextMenuPrimitive.SubContentProps = $props();
</script>

<ContextMenuPrimitive.SubContent
	bind:ref
	data-slot="context-menu-sub-content"
	class={cn(
		"bg-ripple-popover text-ripple-popover-foreground backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--bits-context-menu-content-transform-origin) overflow-hidden rounded-xl ring-1 ring-ripple-border p-1 shadow-lg",
		className
	)}
	{...restProps}
/>
