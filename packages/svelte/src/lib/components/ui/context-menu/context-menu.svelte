<!--
  context-menu.svelte — vendored shadcn-svelte ContextMenu Root. Wraps bits-ui
  ContextMenuPrimitive.Root, which anchors to the right-click cursor natively.
  Vendored 2026-07-10 (feat/canonical-menubar-contextmenu) with the paw
  frosted-popover canon on its Content part.
-->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";

	let { open = $bindable(false), ...restProps }: ContextMenuPrimitive.RootProps = $props();
</script>

<ContextMenuPrimitive.Root bind:open {...restProps} />
