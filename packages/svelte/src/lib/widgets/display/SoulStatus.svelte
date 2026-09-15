<!-- SoulStatus.svelte — Compact/expanded display widget for an agent's soul state -->
<!-- 2026-06-27: forward node id — bind id + data-ripple-node on each variant's root div
     so the visual editor can select this widget directly (SP-0 id-forwarding codemod). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    name?: string;
    role?: string;
    initials?: string;
    color?: string;
    mood?: string;
    energy?: number;
    memories?: number;
    lastAction?: string;
    status?: 'online' | 'offline' | 'busy';
    compact?: boolean;
    class?: string;
  }

  let {
    id,
    name = 'Agent',
    role = '',
    initials = '',
    color = '#6366f1',
    mood = '',
    energy = 100,
    memories = 0,
    lastAction = '',
    status = 'online',
    compact = true,
    class: className
  }: Props = $props();

  const displayInitials = $derived(
    initials || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  );

  const statusColor = $derived(
    status === 'online' ? 'bg-ripple-success'
    : status === 'busy' ? 'bg-ripple-warning'
    : 'bg-gray-400'
  );

  const energyClamped = $derived(Math.max(0, Math.min(100, energy)));
</script>

{#if compact}
  <div {id} data-ripple-node={id} class={cn('flex items-center gap-2.5', className)}>
    <!-- Avatar with status dot -->
    <div class="relative shrink-0">
      <div
        class="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-semibold text-white select-none"
        style:background-color={color}
      >
        {displayInitials}
      </div>
      <span class={cn('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-background', statusColor)}></span>
    </div>

    <!-- Name -->
    <span class="text-sm font-medium text-foreground truncate">{name}</span>

    <!-- Mood badge -->
    {#if mood}
      <span class="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md shrink-0">
        {mood}
      </span>
    {/if}

    <!-- Inline energy bar -->
    <div class="flex items-center gap-1.5 ml-auto shrink-0">
      <div class="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full bg-ripple-info transition-all duration-300"
          style:width="{energyClamped}%"
        ></div>
      </div>
      <span class="text-[10px] text-muted-foreground tabular-nums">{energyClamped}%</span>
    </div>
  </div>
{:else}
  <div {id} data-ripple-node={id} class={cn('flex flex-col gap-3 rounded-lg border border-border/50 bg-transparent p-3', className)}>
    <!-- Header: avatar + name/role -->
    <div class="flex items-center gap-2.5">
      <div class="relative shrink-0">
        <div
          class="flex items-center justify-center w-9 h-9 rounded-lg text-xs font-semibold text-white select-none"
          style:background-color={color}
        >
          {displayInitials}
        </div>
        <span class={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background', statusColor)}></span>
      </div>
      <div class="flex flex-col min-w-0">
        <span class="text-sm font-semibold text-foreground truncate">{name}</span>
        {#if role}
          <span class="text-xs text-muted-foreground truncate">{role}</span>
        {/if}
      </div>
    </div>

    <!-- Rows -->
    <div class="flex flex-col gap-2">
      <!-- Mood -->
      {#if mood}
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground">Mood</span>
          <span class="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
            {mood}
          </span>
        </div>
      {/if}

      <!-- Energy -->
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs text-muted-foreground">Energy</span>
        <div class="flex items-center gap-2 flex-1 justify-end">
          <div class="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full bg-ripple-info transition-all duration-300"
              style:width="{energyClamped}%"
            ></div>
          </div>
          <span class="text-[11px] text-muted-foreground tabular-nums w-7 text-right">{energyClamped}%</span>
        </div>
      </div>

      <!-- Memories -->
      {#if memories > 0}
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground">Memories</span>
          <span class="text-xs font-medium text-foreground tabular-nums">{memories.toLocaleString()}</span>
        </div>
      {/if}

      <!-- Last Action -->
      {#if lastAction}
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground shrink-0">Last Action</span>
          <span class="text-xs text-foreground truncate text-right">{lastAction}</span>
        </div>
      {/if}
    </div>
  </div>
{/if}
