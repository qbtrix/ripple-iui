<!--
  context-menu-item.svelte — vendored shadcn-svelte ContextMenu.Item over bits-ui
  ContextMenuPrimitive.Item, with the accent-hover treatment and a destructive
  variant (text on the readable text-ripple-error-text token; raw tones are fills).
  An item acts only on a real click (press and release on it) or Enter/Space.
  bits-ui turns a pointerup with no pointerdown on the item into a click, so the
  release of the right-click that opened the menu (it opens under the pointer on
  macOS: a quick right-click, a two-finger tap) would pick the first item; that
  pointerup is cancelled here, for every context menu.
-->
<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		variant = "default",
		onpointerup,
		...restProps
	}: ContextMenuPrimitive.ItemProps & {
		inset?: boolean;
		variant?: "default" | "destructive";
	} = $props();
</script>

<ContextMenuPrimitive.Item
	bind:ref
	data-slot="context-menu-item"
	data-inset={inset}
	data-variant={variant}
	class={cn(
		"data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[variant=destructive]:text-ripple-error-text data-[variant=destructive]:data-highlighted:bg-destructive/10 dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 data-[variant=destructive]:data-highlighted:text-ripple-error-text data-[variant=destructive]:*:[svg]:!text-ripple-error-text [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	onpointerup={(e) => {
		onpointerup?.(e);
		e.preventDefault();
	}}
	{...restProps}
/>
