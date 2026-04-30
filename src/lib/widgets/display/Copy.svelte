<!-- src/lib/widgets/display/Copy.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import CheckIcon from '@lucide/svelte/icons/check';

  type Size = 'sm' | 'md';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value: string;
    label?: string;
    size?: Size;
  }

  let { id, class: className, style, value, label, size = 'md' }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => (copied = false), 1500);
    } catch (e) {
      console.warn('[ripple/copy] clipboard write failed:', e);
    }
  }

  const sizeClass = $derived(size === 'sm' ? 'text-[11px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-1 gap-1.5');
  const iconSize = $derived(size === 'sm' ? 11 : 13);
</script>

<button
  {id}
  type="button"
  class={cn('inline-flex items-center rounded border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors', sizeClass, className)}
  style={styleString}
  onclick={copy}
  aria-label={copied ? 'Copied' : (label ? `Copy ${label}` : 'Copy to clipboard')}
>
  {#if copied}
    <CheckIcon size={iconSize} />
  {:else}
    <CopyIcon size={iconSize} />
  {/if}
  {#if label}
    <span>{copied ? 'Copied' : label}</span>
  {/if}
</button>
