<!-- dialog-content.svelte — reconciled 2026-09-14 (ripple overlay canonical): glass in tokens.
     bg-ripple-surface text-ripple-surface-foreground ring-1 ring-ripple-border +
     backdrop-blur, the same surface treatment as ripple Card; host-only
     bg-popover / ring-foreground/10 dropped.
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
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		showCloseButton?: boolean;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	<Dialog.Overlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			"bg-ripple-surface text-ripple-surface-foreground backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ring-ripple-border grid max-w-[calc(100%-2rem)] gap-4 rounded-xl p-4 text-sm ring-1 duration-100 fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none sm:max-w-sm",
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
