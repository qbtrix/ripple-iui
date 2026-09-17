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
  import { getContext } from 'svelte';
  import Ripple from '$lib/Ripple.svelte';
  import { cn } from '$lib/utils.js';
  import type { OnEventCallback } from '@ripple-ui/core';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** The inner spec to render. Shape: UISpec | UniversalSpec. */
    spec?: unknown;
    /** Optional state override forwarded to the inner Ripple. */
    state?: Record<string, unknown>;
    /** Optional explicit onEvent. Falls back to the outer host's onEvent
     *  via the `ui-host-event` context so events bubble up through frames. */
    onEvent?: OnEventCallback;
  }

  let { id, class: className, style, spec, state, onEvent }: Props = $props();

  const hostOnEvent = getContext<OnEventCallback | undefined>('ui-host-event');

  // Prefer an explicit onEvent prop; otherwise forward to the outermost host.
  const forwardEvent = $derived(onEvent ?? hostOnEvent);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div {id} class={cn(className)} style={styleString}>
  {#if spec}
    {#key spec}
      <Ripple {spec} {state} onEvent={forwardEvent} />
    {/key}
  {/if}
</div>
