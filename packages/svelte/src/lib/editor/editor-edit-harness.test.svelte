<!--
  editor/editor-edit-harness.test.svelte
  @description SP-1b integration test fixture (NOT shipped — `.test.svelte` is
    excluded from the npm package). Mirrors the real editor data flow: the spec
    is held in Svelte `$state` (a deep proxy) and edits go through the SAME seam
    the inline editor + inspector use — `createEditorOps(...).setNodeProp(...)`.
    Bumping `applyNonce` applies exactly one edit so the test can observe the DOM
    react while unrelated live instance state survives. `onapplied` surfaces the
    op the seam emitted (the SP-1c persistence interception point).
  @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
-->
<script lang="ts">
  import Ripple from '$lib/Ripple.svelte';
  import { createEditorOps } from '$lib/editor/core/editor-ops.js';
  import type { UINode } from '@ripple-ui/core';

  interface Edit {
    node_id: string;
    prop: string;
    value: unknown;
  }
  interface Props {
    initial: unknown;
    edit?: Edit | null;
    applyNonce?: number;
    onapplied?: (op: Record<string, unknown>) => void;
  }
  let { initial, edit = null, applyNonce = 0, onapplied }: Props = $props();

  // The editor owns the spec as $state; in-place mutator ops therefore notify
  // Svelte and the canvas repaints surgically. Cloned once so the test's literal
  // is never mutated — a deliberate one-time init read.
  // svelte-ignore state_referenced_locally
  let spec = $state(structuredClone(initial));

  const ops = createEditorOps({
    getRoot: () => (spec as { ui: UINode }).ui,
    onApplied: (op) => onapplied?.(op)
  });

  let lastApplied = 0;
  $effect(() => {
    if (applyNonce > 0 && applyNonce !== lastApplied && edit) {
      lastApplied = applyNonce;
      ops.setNodeProp(edit.node_id, edit.prop, edit.value);
    }
  });
</script>

<Ripple {spec} />
