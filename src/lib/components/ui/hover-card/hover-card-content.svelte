<!-- hover-card-content.svelte — reconciled 2026-09-14 (ripple overlay canonical): glass in tokens.
     bg-ripple-popover text-ripple-popover-foreground ring-1 ring-ripple-border +
     backdrop-blur; host-only bg-popover / ring-foreground/10 dropped.
     2026-09-17 (fix/port-gaps): fill moved from bg-ripple-surface to bg-ripple-popover
     (+ text-ripple-popover-foreground). --ripple-surface aliases the host's --card, an
     in-flow card tint (6% white in paw-enterprise dark), so page text read straight
     through this layer; --ripple-popover aliases the host's --popover, the token made
     for a layer over content.
     2026-09-14: state variants written out in full (`data-[state=open]:` …) instead of
     ripple's `data-open`-style shorthand. The shorthand resolves only where styles.css's
     @custom-variant declarations are loaded; a consumer importing theme.css alone got
     `[data-open]`, which bits-ui never emits — so these classes were silently dead. -->
<script lang="ts">
	import { LinkPreview as HoverCardPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import HoverCardPortal from "./hover-card-portal.svelte";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		align = "center",
		sideOffset = 4,
		portalProps,
		...restProps
	}: HoverCardPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof HoverCardPortal>>;
	} = $props();
</script>

<HoverCardPortal {...portalProps}>
	<HoverCardPrimitive.Content
		bind:ref
		data-slot="hover-card-content"
		{align}
		{sideOffset}
		class={cn(
			"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-ripple-border bg-ripple-popover text-ripple-popover-foreground backdrop-blur-md w-64 rounded-lg p-2.5 text-sm shadow-md ring-1 duration-100 z-50 origin-(--transform-origin) outline-hidden",
			className
		)}
		{...restProps}
	/>
</HoverCardPortal>
