<!--
  context-menu-group.svelte — vendored shadcn-svelte ContextMenu.Group. Wraps
  bits-ui ContextMenuPrimitive.Group. Vendored 2026-07-10 with the paw
  frosted-popover canon.
-->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";

	let { ref = $bindable(null), ...restProps }: ContextMenuPrimitive.GroupProps = $props();
</script>

<ContextMenuPrimitive.Group bind:ref data-slot="context-menu-group" {...restProps} />
