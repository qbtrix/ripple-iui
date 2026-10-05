<!--
  widgets/craft/ResizeHandle.svelte
  Internal to EditorShell (not exported): the drag gutter that sets a side
  panel's width in px. role="slider" with arrow keys (Shift = 32px steps),
  the same pattern as layout/Split, because svelte-ignore does not silence
  a11y_* under $props(). `edge` says which side the panel is on, so a drag
  toward the centre always widens it.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    value: number;
    min: number;
    max: number;
    edge: 'left' | 'right';
    label: string;
  }

  let { value = $bindable(), min, max, edge, label }: Props = $props();

  let drag: { x: number; w: number } | null = $state(null);
  const clampW = (w: number) => Math.round(Math.min(max, Math.max(min, w)));
  const sign = $derived(edge === 'left' ? 1 : -1);

  function onpointerdown(e: PointerEvent) {
    e.preventDefault();
    drag = { x: e.clientX, w: value };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onpointermove(e: PointerEvent) {
    if (drag) value = clampW(drag.w + (e.clientX - drag.x) * sign);
  }
  function onpointerup(e: PointerEvent) {
    drag = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }
  function onkeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 32 : 8;
    if (e.key === 'ArrowRight') value = clampW(value + step * sign);
    else if (e.key === 'ArrowLeft') value = clampW(value - step * sign);
    else return;
    e.preventDefault();
  }
</script>

<div
  role="slider"
  aria-label={label}
  aria-orientation="vertical"
  aria-valuenow={value}
  aria-valuemin={min}
  aria-valuemax={max}
  tabindex="0"
  data-slot="resize-handle"
  class={cn(
    'relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize outline-none',
    'after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:transition-colors',
    'hover:after:bg-ripple-accent/50 focus-visible:after:bg-ripple-accent',
    drag && 'after:bg-ripple-accent'
  )}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={onpointerup}
  {onkeydown}
></div>
