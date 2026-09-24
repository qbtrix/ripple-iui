<!-- src/lib/widgets/display/StatusDot.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  type Variant = 'online' | 'offline' | 'busy' | 'away' | 'custom';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    variant?: Variant;
    color?: string;
    label?: string;
    pulse?: boolean;
    size?: number;
  }

  let {
    id, class: className, style,
    variant = 'online', color, label, pulse = false, size = 8
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const dotColor = $derived(
    variant === 'custom' ? (color ?? '#6b7280')
    : variant === 'offline' ? '#9ca3af'
    : variant === 'busy' ? '#ef4444'
    : variant === 'away' ? '#f59e0b'
    : '#10b981' // online
  );
</script>

<span {id} class={cn('inline-flex items-center gap-1.5', className)} style={styleString}>
  <span class="relative inline-flex" style="width:{size}px;height:{size}px">
    {#if pulse}
      <span
        class="absolute inset-0 rounded-full opacity-60 animate-ping"
        style="background-color:{dotColor}"
      ></span>
    {/if}
    <span
      class="relative inline-block rounded-full"
      style="width:{size}px;height:{size}px;background-color:{dotColor}"
    ></span>
  </span>
  {#if label}
    <span class="text-xs text-foreground">{label}</span>
  {/if}
</span>
