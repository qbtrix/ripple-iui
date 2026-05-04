<!-- src/lib/widgets/overlay/NotificationCenter.svelte -->
<script lang="ts">
  import { Popover as P } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import * as icons from '@lucide/svelte';
  import BellIcon from '@lucide/svelte/icons/bell';
  import CheckCheckIcon from '@lucide/svelte/icons/check-check';

  type Notification = {
    id: string | number;
    title: string;
    description?: string;
    timestamp?: string;
    icon?: string;
    /** Visual variant. */
    severity?: 'info' | 'success' | 'warning' | 'destructive';
    read?: boolean;
    /** Optional href when clicked. */
    href?: string;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Notification list. Bind via `bind: "<state-path>"` to receive read-state changes. */
    value?: Notification[];
    title?: string;
    emptyText?: string;
    /** Hide bell trigger, render inline (e.g. inside a sheet/drawer). */
    inline?: boolean;
    onchange?: (next: Notification[]) => void;
    onselect?: (id: string | number) => void;
  }

  let {
    id,
    class: className,
    style,
    value = [],
    title = 'Notifications',
    emptyText = "You're all caught up.",
    inline = false,
    onchange,
    onselect
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const notifications = $derived(Array.isArray(value) ? value : []);
  const unread = $derived(notifications.filter((n) => !n.read).length);

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    return ((icons as unknown) as Record<string, unknown>)[camel] ?? null;
  }

  function severityColor(s: Notification['severity']): string {
    if (s === 'destructive') return 'bg-ripple-error';
    if (s === 'warning') return 'bg-ripple-warning';
    if (s === 'success') return 'bg-ripple-success';
    return 'bg-ripple-info';
  }

  function markAllRead() {
    onchange?.(notifications.map((n) => ({ ...n, read: true })));
  }

  function pick(n: Notification) {
    if (!n.read) {
      onchange?.(notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    onselect?.(n.id);
  }

  // Build the panel as a snippet so we can render it inline OR inside a Popover.
</script>

{#snippet panel()}
  <div class="w-[360px] max-w-[92vw]">
    <div class="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold">{title}</span>
        {#if unread > 0}
          <span class="inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
            {unread}
          </span>
        {/if}
      </div>
      {#if unread > 0}
        <button
          type="button"
          onclick={markAllRead}
          class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <CheckCheckIcon size={12} />
          Mark all read
        </button>
      {/if}
    </div>

    <ul class="max-h-[420px] overflow-y-auto m-0 p-0 list-none">
      {#if notifications.length === 0}
        <li class="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</li>
      {:else}
        {#each notifications as n (n.id)}
          {@const Icon = getIcon(n.icon)}
          <li
            class={cn(
              'border-b border-border last:border-b-0',
              !n.read && 'bg-primary/5'
            )}
          >
            <button
              type="button"
              onclick={() => pick(n)}
              class="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <span class={cn('mt-1 h-2 w-2 rounded-full shrink-0', !n.read ? severityColor(n.severity) : 'bg-transparent')}></span>
              {#if Icon}<Icon size={14} class="mt-1 opacity-70 shrink-0" />{/if}
              <div class="flex-1 min-w-0">
                <div class={cn('text-sm', !n.read && 'font-medium')}>{n.title}</div>
                {#if n.description}
                  <div class="text-xs text-muted-foreground mt-0.5">{n.description}</div>
                {/if}
                {#if n.timestamp}
                  <div class="text-[11px] text-muted-foreground mt-0.5">{n.timestamp}</div>
                {/if}
              </div>
            </button>
          </li>
        {/each}
      {/if}
    </ul>
  </div>
{/snippet}

{#if inline}
  <div
    {id}
    class={cn('rounded-md border border-border bg-popover text-popover-foreground shadow-sm overflow-hidden', className)}
    style={styleString}
  >
    {@render panel()}
  </div>
{:else}
  <div {id} class={cn('inline-block', className)} style={styleString}>
    <P.Root>
      <P.Trigger
        class="relative inline-grid place-items-center h-9 w-9 rounded-md border border-input bg-ripple-surface hover:bg-ripple-muted/60 transition-colors"
        aria-label={title}
      >
        <BellIcon size={16} />
        {#if unread > 0}
          <span class="absolute -top-1 -right-1 inline-grid place-items-center min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
            {unread > 9 ? '9+' : unread}
          </span>
        {/if}
      </P.Trigger>
      <P.Portal>
        <P.Content
          sideOffset={8}
          align="end"
          class="z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-md overflow-hidden"
        >
          {@render panel()}
        </P.Content>
      </P.Portal>
    </P.Root>
  </div>
{/if}
