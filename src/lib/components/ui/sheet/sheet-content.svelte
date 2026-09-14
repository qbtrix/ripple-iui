<!-- sheet-content.svelte — ripple's canonical slide-over panel.
     Reconciled 2026-09-14 (overlay canonical): glass in tokens — bg-ripple-surface
     text-ripple-surface-foreground ring-1 ring-ripple-border — so the sheet reads
     as the host's glass wherever --ripple-surface aliases a translucent --card.
     Perf (carried over from paw-enterprise, 2026-07-16): the sheet blurs its
     backdrop at 10px instead of the dialog's 24px and promotes the transform to
     its own layer, so the slide-in stays smooth instead of re-rasterizing a full
     24px blur every frame (see <style> below). `showCloseButton` (default true,
     matching ui/dialog) lets a caller with its own header X hide the built-in
     one; overlay-click and Escape still dismiss.
     2026-09-14 skin fix: the per-side border-* classes are gone; the ring alone
     draws the edge (a border plus the ring doubled the leading edge line), and
     `bg-clip-padding` went with them — it only ever existed to stop a
     translucent fill bleeding under those borders.
     2026-09-14 review: `will-change: transform` is scoped to the open/closed
     states instead of riding on every mounted sheet, and `backdrop-filter`
     drops its `!important` so a consumer can still override the blur.
     2026-09-14: state variants written out in full (`data-[state=open]:` …) instead of
     ripple's `data-open`-style shorthand. The shorthand resolves only where styles.css's
     @custom-variant declarations are loaded; a consumer importing theme.css alone got
     `[data-open]`, which bits-ui never emits — so these classes were silently dead. -->
<script lang="ts" module>
	export type Side = "top" | "right" | "bottom" | "left";
</script>

<script lang="ts">
	import { Dialog as SheetPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import SheetPortal from "./sheet-portal.svelte";
	import SheetOverlay from "./sheet-overlay.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import XIcon from '@lucide/svelte/icons/x';
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		side = "right",
		showCloseButton = true,
		portalProps,
		children,
		...restProps
	}: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SheetPortal>>;
		side?: Side;
		showCloseButton?: boolean;
		children: Snippet;
	} = $props();
</script>

<SheetPortal {...portalProps}>
	<SheetOverlay />
	<SheetPrimitive.Content
		bind:ref
		data-slot="sheet-content"
		data-side={side}
		class={cn(
			"bg-ripple-surface text-ripple-surface-foreground ring-1 ring-ripple-border fixed z-50 flex flex-col gap-4 text-sm shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[side=bottom]:data-[state=open]:slide-in-from-bottom-10 data-[side=left]:data-[state=open]:slide-in-from-left-10 data-[side=right]:data-[state=open]:slide-in-from-right-10 data-[side=top]:data-[state=open]:slide-in-from-top-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[side=bottom]:data-[state=closed]:slide-out-to-bottom-10 data-[side=left]:data-[state=closed]:slide-out-to-left-10 data-[side=right]:data-[state=closed]:slide-out-to-right-10 data-[side=top]:data-[state=closed]:slide-out-to-top-10",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<SheetPrimitive.Close data-slot="sheet-close">
				{#snippet child({ props })}
					<Button variant="ghost" class="absolute top-3 right-3" size="icon-sm" {...props}>
						<XIcon  />
						<span class="sr-only">Close</span>
					</Button>
				{/snippet}
			</SheetPrimitive.Close>
		{/if}
	</SheetPrimitive.Content>
</SheetPortal>

<style>
	/* Slide performance: a 24px backdrop-filter re-rasterizes every frame while
	   the sheet slides in, which tanks FPS. 10px for the sheet specifically
	   (dialogs that don't slide keep backdrop-blur-xl). Single standard
	   backdrop-filter, no -webkit pairing, so Lightning CSS won't drop it.
	   No !important: this rule is unlayered component CSS while Tailwind
	   utilities sit in @layer utilities, so it already wins — and without the
	   flag a consumer can still override the blur for a reduced-transparency
	   or low-end profile. */
	:global([data-slot="sheet-content"]) {
		backdrop-filter: blur(10px);
	}

	/* will-change only while the panel is actually animating. Applied
	   unconditionally it pins a compositing layer for the whole lifetime of
	   every mounted sheet, which is the opposite of the intent. */
	:global([data-slot="sheet-content"][data-state="open"]),
	:global([data-slot="sheet-content"][data-state="closed"]) {
		will-change: transform;
	}
</style>
