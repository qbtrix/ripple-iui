<!--
  context-menu-portal.svelte — vendored shadcn-svelte ContextMenu.Portal. Wraps
  bits-ui ContextMenuPrimitive.Portal so Content escapes overflow-clipped
  ancestors. Vendored 2026-07-10 with the paw frosted-popover canon.
-->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";

	let { ...restProps }: ContextMenuPrimitive.PortalProps = $props();
</script>

<ContextMenuPrimitive.Portal {...restProps} />
