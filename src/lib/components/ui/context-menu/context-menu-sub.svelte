<!--
  context-menu-sub.svelte — vendored shadcn-svelte ContextMenu.Sub. Wraps bits-ui
  ContextMenuPrimitive.Sub. Vendored 2026-07-10 with the paw frosted-popover
  canon.
-->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";

	let { open = $bindable(false), ...restProps }: ContextMenuPrimitive.SubProps = $props();
</script>

<ContextMenuPrimitive.Sub bind:open {...restProps} />
