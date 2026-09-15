<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    text?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
  }

  let { id, class: className, text = '', level = 2 }: Props = $props();

  const levelClasses: Record<number, string> = {
    1: 'text-3xl font-bold tracking-tight text-foreground',
    2: 'text-2xl font-bold tracking-tight text-foreground',
    3: 'text-xl font-semibold tracking-tight text-foreground',
    4: 'text-lg font-semibold text-foreground',
    5: 'text-base font-semibold text-foreground',
    6: 'text-sm font-semibold uppercase tracking-wider text-muted-foreground',
  };
</script>

{#if level === 1}
  <h1 {id} class={cn('m-0', levelClasses[1], className)}>{text}</h1>
{:else if level === 2}
  <h2 {id} class={cn('m-0', levelClasses[2], className)}>{text}</h2>
{:else if level === 3}
  <h3 {id} class={cn('m-0', levelClasses[3], className)}>{text}</h3>
{:else if level === 4}
  <h4 {id} class={cn('m-0', levelClasses[4], className)}>{text}</h4>
{:else if level === 5}
  <h5 {id} class={cn('m-0', levelClasses[5], className)}>{text}</h5>
{:else}
  <h6 {id} class={cn('m-0', levelClasses[6], className)}>{text}</h6>
{/if}
