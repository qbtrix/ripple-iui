<!-- dialog-content.svelte
     The modal box: portaled above a scrim (Dialog.Overlay), centred, glass in
     tokens (bg-ripple-popover + backdrop-blur, ring-ripple-border). It is a
     floating layer over content, so it uses --ripple-popover, not the in-flow
     --ripple-surface card tint.
     - Width: max-w-[calc(100%-2rem)] on phones, sm:max-w-sm by default. `cn`
       runs twMerge, so a host widens it with a same-variant class
       (`sm:max-w-lg`); a bare `max-w-md` loses to sm:max-w-sm on desktop.
     - The single grid track is minmax(0,1fr), so a wide child (a long
       Segmented, a table) can never stretch the track past the box. Without it
       Dialog.Footer's -mx-4 bleed followed the stretched track out past the
       right edge.
     - `overlayClass` goes to the scrim, so a host stacking dialogs above its
       own chrome lifts both layers (`class="z-[100]"` + `overlayClass="z-[100]"`).
     - State variants are written in full (`data-[state=open]:`), not ripple's
       shorthand, which resolves only where styles.css's @custom-variant rules
       load. -->
<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import DialogPortal from "./dialog-portal.svelte";
	import type { Snippet } from "svelte";
	import * as Dialog from "./index.js";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import type { ComponentProps } from "svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import XIcon from '@lucide/svelte/icons/x';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		showCloseButton = true,
		overlayClass,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		showCloseButton?: boolean;
		/** Classes for the scrim (Dialog.Overlay), e.g. a z-index to match `class`. */
		overlayClass?: string;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	<Dialog.Overlay class={overlayClass} />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			"bg-ripple-popover text-ripple-popover-foreground backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ring-ripple-border grid grid-cols-[minmax(0,1fr)] max-w-[calc(100%-2rem)] gap-4 rounded-xl p-4 text-sm ring-1 duration-100 fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none sm:max-w-sm",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close data-slot="dialog-close">
				{#snippet child({ props })}
					<Button variant="ghost" class="absolute top-2 right-2" size="icon-sm" {...props}>
						<XIcon  />
						<span class="sr-only">Close</span>
					</Button>
				{/snippet}
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPortal>
