<!-- dropdown-menu-content.svelte — re-tokened 2026-09-14 (ripple overlay canonical): host-only
     bg-popover / border swapped for bg-ripple-popover + ring-ripple-border +
     backdrop-blur-md, glass in tokens.
     2026-09-17 (fix/port-gaps): fill moved from bg-ripple-surface to bg-ripple-popover
     (+ text-ripple-popover-foreground). --ripple-surface aliases the host's --card, an
     in-flow card tint (6% white in paw-enterprise dark), so page text read straight
     through this layer; --ripple-popover aliases the host's --popover, the token made
     for a layer over content. -->
<script lang="ts">
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import DropdownMenuPortal from "./dropdown-menu-portal.svelte";
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		sideOffset = 4,
		portalProps,
		class: className,
		...restProps
	}: DropdownMenuPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DropdownMenuPortal>>;
	} = $props();
</script>

<DropdownMenuPortal {...portalProps}>
	<DropdownMenuPrimitive.Content
		bind:ref
		data-slot="dropdown-menu-content"
		{sideOffset}
		class={cn(
			"bg-ripple-popover text-ripple-popover-foreground backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--bits-dropdown-menu-content-available-height) min-w-[8rem] origin-(--bits-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl ring-1 ring-ripple-border p-1 shadow-md outline-none",
			className
		)}
		{...restProps}
	/>
</DropdownMenuPortal>
