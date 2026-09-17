<!-- command.svelte — re-tokened 2026-09-14 (ripple overlay canonical): host-only
     bg-popover / border swapped for bg-ripple-popover + ring-ripple-border +
     backdrop-blur-md, glass in tokens.
     2026-09-17 (fix/port-gaps): fill moved from bg-ripple-surface to bg-ripple-popover
     (+ text-ripple-popover-foreground). --ripple-surface aliases the host's --card, an
     in-flow card tint (6% white in paw-enterprise dark), so page text read straight
     through this layer; --ripple-popover aliases the host's --popover, the token made
     for a layer over content. -->
<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { Command as CommandPrimitive } from "bits-ui";

	export type CommandRootApi = CommandPrimitive.Root;

	let {
		api = $bindable(null),
		ref = $bindable(null),
		value = $bindable(""),
		class: className,
		...restProps
	}: CommandPrimitive.RootProps & {
		api?: CommandRootApi | null;
	} = $props();
</script>

<CommandPrimitive.Root
	bind:this={api}
	bind:value
	bind:ref
	data-slot="command"
	class={cn(
		"bg-ripple-popover text-ripple-popover-foreground backdrop-blur-md flex h-full w-full flex-col overflow-hidden rounded-xl",
		className
	)}
	{...restProps}
/>
