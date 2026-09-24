<!--
  context-menu-radio-group.svelte — vendored shadcn-svelte ContextMenu.RadioGroup.
  Wraps bits-ui ContextMenuPrimitive.RadioGroup. Vendored 2026-07-10 with the paw
  frosted-popover canon.
-->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		value = $bindable(),
		...restProps
	}: ContextMenuPrimitive.RadioGroupProps = $props();
</script>

<ContextMenuPrimitive.RadioGroup
	bind:ref
	bind:value
	data-slot="context-menu-radio-group"
	{...restProps}
/>
