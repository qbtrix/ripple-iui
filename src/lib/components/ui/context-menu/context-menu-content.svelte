<!--
  context-menu-content.svelte — vendored shadcn-svelte ContextMenu.Content.
  Re-tokened 2026-09-14 (ripple overlay canonical): the paw-enterprise copy
  relied on the host's `bg-popover` + global.css frost rules; here the frost is
  in tokens — bg-ripple-surface text-ripple-surface-foreground backdrop-blur-md
  ring-1 ring-ripple-border — the same surface treatment as ripple Card, so it
  reads as glass wherever the host aliases --ripple-surface to a translucent
  --card. Originally vendored 2026-07-10 (feat/canonical-menubar-contextmenu).
-->
<script lang="ts">
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import ContextMenuPortal from "./context-menu-portal.svelte";
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		...restProps
	}: ContextMenuPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof ContextMenuPortal>>;
	} = $props();
</script>

<ContextMenuPortal {...portalProps}>
	<ContextMenuPrimitive.Content
		bind:ref
		data-slot="context-menu-content"
		class={cn(
			"bg-ripple-surface text-ripple-surface-foreground backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--bits-context-menu-content-available-height) min-w-[8rem] origin-(--bits-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl ring-1 ring-ripple-border p-1 shadow-md outline-none",
			className
		)}
		{...restProps}
	/>
</ContextMenuPortal>
