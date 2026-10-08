<!-- sheet-content.svelte — ripple's canonical slide-over panel.
     Portaled, fixed and drawn over a scrim, so it floats like a dialog and fills
     with the layer-over-content token (bg-ripple-popover + its foreground, ring-1
     ring-ripple-border for the edge; the ring alone, a border would double it).
     An in-flow side panel that is part of a layout is a Card's job and stays on
     --ripple-surface.
     Width: left and right sheets take 3/4 of the window, capped from `sm` up by
     `size`, Tailwind's max-w scale ('sm' default, 24rem … '4xl', 56rem). The cap
     classes are full literals in SIZE so a consumer's Tailwind scan emits them;
     a caller `class` with its own data-[side] max-w still replaces the cap (cn
     runs twMerge). Top and bottom sheets are full width and ignore `size`.
     `showCloseButton` (default true, matching ui/dialog) lets a caller with its
     own header X hide the built-in one; overlay-click and Escape still dismiss.
     State variants are written out in full (`data-[state=open]:`) because the
     `data-open` shorthand only resolves where styles.css's @custom-variant is
     loaded, and bits-ui never emits `[data-open]`.
     Perf: the backdrop blurs at 10px, not the dialog's 24px, so the slide-in does
     not re-rasterize a 24px blur every frame (see <style>). No will-change: bits-ui
     keeps data-state for as long as the sheet is mounted, so it would pin a layer. -->
<script lang="ts" module>
	export type Side = "top" | "right" | "bottom" | "left";
	export type SheetSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

	const SIZE: Record<SheetSize, string> = {
		sm: "data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
		md: "data-[side=left]:sm:max-w-md data-[side=right]:sm:max-w-md",
		lg: "data-[side=left]:sm:max-w-lg data-[side=right]:sm:max-w-lg",
		xl: "data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl",
		"2xl": "data-[side=left]:sm:max-w-2xl data-[side=right]:sm:max-w-2xl",
		"3xl": "data-[side=left]:sm:max-w-3xl data-[side=right]:sm:max-w-3xl",
		"4xl": "data-[side=left]:sm:max-w-4xl data-[side=right]:sm:max-w-4xl",
	};
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
		size = "sm",
		showCloseButton = true,
		portalProps,
		children,
		...restProps
	}: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SheetPortal>>;
		side?: Side;
		/** Max width of a left/right sheet from `sm` up. Default "sm" (24rem). */
		size?: SheetSize;
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
		data-size={size}
		class={cn(
			"bg-ripple-popover text-ripple-popover-foreground ring-1 ring-ripple-border fixed z-50 flex flex-col gap-4 text-sm shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[side=bottom]:data-[state=open]:slide-in-from-bottom-10 data-[side=left]:data-[state=open]:slide-in-from-left-10 data-[side=right]:data-[state=open]:slide-in-from-right-10 data-[side=top]:data-[state=open]:slide-in-from-top-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[side=bottom]:data-[state=closed]:slide-out-to-bottom-10 data-[side=left]:data-[state=closed]:slide-out-to-left-10 data-[side=right]:data-[state=closed]:slide-out-to-right-10 data-[side=top]:data-[state=closed]:slide-out-to-top-10",
			SIZE[size] ?? SIZE.sm,
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
</style>
