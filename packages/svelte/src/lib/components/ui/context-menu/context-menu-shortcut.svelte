<!--
  context-menu-shortcut.svelte — vendored shadcn-svelte ContextMenu.Shortcut
  (right-aligned keyboard-hint span). Vendored 2026-07-10 with the paw
  frosted-popover canon.
-->
<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
</script>

<span
	bind:this={ref}
	data-slot="context-menu-shortcut"
	class={cn("text-muted-foreground ms-auto text-xs tracking-widest", className)}
	{...restProps}
>
	{@render children?.()}
</span>
