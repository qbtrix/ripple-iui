<!--
  context-menu-content.svelte — vendored shadcn-svelte ContextMenu.Content
  carrying the paw frosted-popover canon: bg-popover text-popover-foreground
  rounded-xl border p-1 shadow-md. The bg-popover class trips the global
  floating-surface rules in global.css (blur(12px) saturate(1.4) +
  var(--popover-border)), so frost + border come for free — same as
  ui/dropdown-menu. Vendored 2026-07-10 (feat/canonical-menubar-contextmenu).
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
			"bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--bits-context-menu-content-available-height) min-w-[8rem] origin-(--bits-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border p-1 shadow-md outline-none",
			className
		)}
		{...restProps}
	/>
</ContextMenuPortal>
