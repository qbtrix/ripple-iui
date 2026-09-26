<!-- dialog-content.svelte
     2026-09-27 (canon gaps 2): `overlayClass` goes to the scrim, so a host that
     stacks dialogs above its own chrome can lift both layers (`class="z-[100]"`
     plus `overlayClass="z-[100]"`) without portalling into a layer of its own.
     twMerge lets it replace the default z-50. No zIndex prop: the class pair
     covers it.
     reconciled 2026-09-14 (ripple overlay canonical): glass in tokens.
     bg-ripple-popover text-ripple-popover-foreground ring-1 ring-ripple-border +
     backdrop-blur; host-only bg-popover / ring-foreground/10 dropped.
     2026-09-17 (fix/port-gaps): fill moved from bg-ripple-surface to bg-ripple-popover
     (+ text-ripple-popover-foreground). --ripple-surface aliases the host's --card, an
     in-flow card tint (6% white in paw-enterprise dark), so page text read straight
     through this layer; --ripple-popover aliases the host's --popover, the token made
     for a layer over content.
     A dialog is portaled to the document body above a scrim and covers content, so it is a
     floating layer, not a card. paw-enterprise names a separate --panel for
     modals, but it is not a shadcn token and equals --popover in dark, so ripple
     publishes one alias; --ripple-panel is the follow-up if the two ever diverge.
     2026-09-14: the default width `sm:max-w-sm` is back inline in the base class.
     It had been hoisted into a `defaultWidth` derived that regex-sniffed the
     caller's `class` for `max-w-`, because `cn` was clsx without twMerge and
     stacking both widths left the caller's losing by source order. `cn` now runs
     twMerge, which resolves that conflict properly, so the special case is gone.
     2026-09-14: state variants written out in full (`data-[state=open]:` …) instead of
     ripple's `data-open`-style shorthand. The shorthand resolves only where styles.css's
     @custom-variant declarations are loaded; a consumer importing theme.css alone got
     `[data-open]`, which bits-ui never emits — so these classes were silently dead. -->
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
			"bg-ripple-popover text-ripple-popover-foreground backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ring-ripple-border grid max-w-[calc(100%-2rem)] gap-4 rounded-xl p-4 text-sm ring-1 duration-100 fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none sm:max-w-sm",
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
