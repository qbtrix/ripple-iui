<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import ClockIcon from '@lucide/svelte/icons/clock';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    author?: string;
    avatar?: string;
    role?: string;
    date?: string;
    readTime?: string;
  }

  let {
    id, class: className, style,
    author, avatar, role, date, readTime
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function authorInitials(name?: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map((p) => p[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('');
  }
</script>

<div
  {id}
  class={cn('flex flex-wrap items-center gap-3 text-sm text-muted-foreground', className)}
  style={styleString}
>
  {#if author}
    <div class="flex items-center gap-2">
      {#if avatar}
        <img src={avatar} alt={author} class="size-8 rounded-full object-cover" />
      {:else}
        <div class="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
          {authorInitials(author)}
        </div>
      {/if}
      <div class="flex flex-col leading-tight">
        <span class="text-foreground font-medium">{author}</span>
        {#if role}<span class="text-xs">{role}</span>{/if}
      </div>
    </div>
  {/if}
  {#if date}
    <span class="inline-flex items-center gap-1">
      <CalendarIcon size={13} />
      <span>{date}</span>
    </span>
  {/if}
  {#if readTime}
    <span class="inline-flex items-center gap-1">
      <ClockIcon size={13} />
      <span>{readTime}</span>
    </span>
  {/if}
</div>
