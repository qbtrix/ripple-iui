<!-- src/lib/widgets/layout/Split.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Direction = 'horizontal' | 'vertical';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    direction?: Direction;
    /** Initial size of the first pane in percent (0–100). */
    defaultSize?: number;
    /** Min size of the first pane (percent). */
    minSize?: number;
    /** Max size of the first pane (percent). */
    maxSize?: number;
    /** Spec for the first (start) pane. */
    start?: any;
    /** Spec for the second (end) pane. */
    end?: any;
    /** Direct snippet — when used as a Svelte component, takes precedence. */
    startSnippet?: Snippet;
    endSnippet?: Snippet;
    onresize?: (size: number) => void;
  }

  let {
    id,
    class: className,
    style,
    direction = 'horizontal',
    defaultSize = 50,
    minSize = 10,
    maxSize = 90,
    start,
    end,
    startSnippet,
    endSnippet,
    onresize
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let containerEl = $state<HTMLDivElement | null>(null);
  let size = $state(clamp(defaultSize));
  let dragging = $state(false);

  function clamp(v: number) {
    return Math.max(minSize, Math.min(maxSize, v));
  }

  function isSpec(v: unknown): boolean {
    return v != null && typeof v === 'object' && !Array.isArray(v);
  }
  function isString(v: unknown): v is string {
    return typeof v === 'string';
  }

  function onPointerDown(e: PointerEvent) {
    if (!containerEl) return;
    e.preventDefault();
    dragging = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const pct = direction === 'horizontal'
      ? ((e.clientX - rect.left) / rect.width) * 100
      : ((e.clientY - rect.top) / rect.height) * 100;
    const next = clamp(pct);
    if (next !== size) {
      size = next;
      onresize?.(next);
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  function onKeyDown(e: KeyboardEvent) {
    const step = e.shiftKey ? 5 : 1;
    let next = size;
    if (direction === 'horizontal') {
      if (e.key === 'ArrowLeft') next = clamp(size - step);
      else if (e.key === 'ArrowRight') next = clamp(size + step);
      else return;
    } else {
      if (e.key === 'ArrowUp') next = clamp(size - step);
      else if (e.key === 'ArrowDown') next = clamp(size + step);
      else return;
    }
    e.preventDefault();
    if (next !== size) {
      size = next;
      onresize?.(next);
    }
  }

  const gridStyle = $derived(
    direction === 'horizontal'
      ? `grid-template-columns: ${size}% 8px ${100 - size}%; grid-template-rows: 1fr;`
      : `grid-template-rows: ${size}% 8px ${100 - size}%; grid-template-columns: 1fr;`
  );
</script>

<div
  {id}
  bind:this={containerEl}
  class={cn(
    'grid w-full h-full min-h-[200px] overflow-hidden',
    direction === 'horizontal' ? 'flex-row' : 'flex-col',
    className
  )}
  style={`${gridStyle} ${styleString ?? ''}`}
>
  <div class="overflow-auto min-w-0 min-h-0">
    {#if startSnippet}
      {@render startSnippet()}
    {:else if isString(start)}
      <div class="p-3 text-sm">{start}</div>
    {:else if isSpec(start)}
      <NodeRenderer node={start} />
    {/if}
  </div>

  <div
    role="separator"
    aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
    aria-valuenow={Math.round(size)}
    aria-valuemin={minSize}
    aria-valuemax={maxSize}
    tabindex="0"
    class={cn(
      'relative flex items-center justify-center bg-border hover:bg-primary/40 transition-colors',
      direction === 'horizontal' ? 'cursor-col-resize w-2' : 'cursor-row-resize h-2',
      dragging && 'bg-primary/60'
    )}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onkeydown={onKeyDown}
  >
    <span
      aria-hidden="true"
      class={cn(
        'block bg-foreground/30 rounded-full',
        direction === 'horizontal' ? 'w-0.5 h-6' : 'h-0.5 w-6'
      )}
    ></span>
  </div>

  <div class="overflow-auto min-w-0 min-h-0">
    {#if endSnippet}
      {@render endSnippet()}
    {:else if isString(end)}
      <div class="p-3 text-sm">{end}</div>
    {:else if isSpec(end)}
      <NodeRenderer node={end} />
    {/if}
  </div>
</div>
