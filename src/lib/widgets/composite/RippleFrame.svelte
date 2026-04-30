<script lang="ts">
  /**
   * `ripple-frame` widget — renders a Ripple spec inside another Ripple spec.
   *
   * Each frame mounts an isolated <Ripple> instance with its own StateManager
   * and EventDispatcher, so demos rendered side-by-side don't share state and
   * mutations stay scoped to their own frame.
   *
   * Use cases: showcases of demos, chat threads where each message is a
   * mini-spec, dashboards composed of independently-stateful tiles.
   */
  import Ripple from '$lib/Ripple.svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** The inner spec to render. Shape: UISpec | UniversalSpec. */
    spec?: unknown;
    /** Optional state override forwarded to the inner Ripple. */
    state?: Record<string, unknown>;
  }

  let { id, class: className, style, spec, state }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div {id} class={cn(className)} style={styleString}>
  {#if spec}
    {#key spec}
      <Ripple {spec} {state} />
    {/key}
  {/if}
</div>
