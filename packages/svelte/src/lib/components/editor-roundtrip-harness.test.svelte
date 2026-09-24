<!--
  editor-roundtrip-harness.test.svelte
  @description SP-0 spike test fixture (NOT a widget, NOT shipped — the
    `.test.svelte` suffix is excluded from the npm package by package.json's
    `!dist/**/*.test.*` rule, and vitest only collects `*.test.ts`). It mirrors
    the real visual-editor data flow: the spec is held in Svelte `$state` (a deep
    proxy) so spec-mutator's IN-PLACE ops are reactive. The test bumps
    `applyNonce` to apply exactly one op and observe the DOM react.
  @created 2026-06-27
-->
<script lang="ts">
  import Ripple from '$lib/Ripple.svelte';
  import { applyOp } from '@ripple-ui/core';
  import type { UINode } from '@ripple-ui/core';

  interface Props {
    initial: unknown;
    op: Record<string, unknown>;
    applyNonce?: number;
  }
  let { initial, op, applyNonce = 0 }: Props = $props();

  // The editor owns the spec as $state; in-place mutator ops therefore notify
  // Svelte and the canvas repaints surgically (no remount). Cloned once so the
  // test's `initial` literal is never mutated — a deliberate one-time init read.
  // svelte-ignore state_referenced_locally
  let spec = $state(structuredClone(initial));

  let lastApplied = 0;
  $effect(() => {
    if (applyNonce > 0 && applyNonce !== lastApplied) {
      lastApplied = applyNonce;
      applyOp((spec as { ui: UINode }).ui, op);
    }
  });
</script>

<Ripple {spec} />
