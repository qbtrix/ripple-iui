<!--
  context-menu-trigger.svelte — vendored shadcn-svelte ContextMenu.Trigger. Wraps
  bits-ui ContextMenuPrimitive.Trigger; right-clicking anywhere inside it opens
  the menu at the cursor. Vendored 2026-07-10 with the paw frosted-popover canon.
-->
<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";

	let { ref = $bindable(null), ...restProps }: ContextMenuPrimitive.TriggerProps = $props();
</script>

<ContextMenuPrimitive.Trigger bind:ref data-slot="context-menu-trigger" {...restProps} />
