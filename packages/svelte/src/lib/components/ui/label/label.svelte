<!-- label.svelte
  NEW 2026-09-26 (feature pages canon, F1 / G5). shadcn-svelte Label twin over
  bits-ui's Label.Root, for `./primitives`. Class string is shadcn's, with the
  disabled-group state written out as group-data-[disabled=true]: (no
  shorthand variants in packaged files). -->
<script lang="ts">
	import { Label as LabelPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root
	bind:ref
	data-slot="label"
	class={cn(
		"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
		className
	)}
	{...restProps}
/>
