<!-- src/lib/widgets/vertical/AuditLog.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as icons from '@lucide/svelte';

  type Severity = 'info' | 'warning' | 'destructive' | 'success';

  type Entry = {
    id: string | number;
    actor: string;
    actorIcon?: string;
    action: string;
    target?: string;
    timestamp?: string;
    /** Optional JSON-ish details / diff body. */
    details?: string | Record<string, unknown>;
    severity?: Severity;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    entries?: Entry[];
    /** Show "details" expansion column. */
    showDetails?: boolean;
  }

  let {
    id,
    class: className,
    style,
    entries = [],
    showDetails = true
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let expanded = $state<Set<string | number>>(new Set());

  function toggle(eid: string | number) {
    const next = new Set(expanded);
    if (next.has(eid)) next.delete(eid); else next.add(eid);
    expanded = next;
  }

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    return ((icons as unknown) as Record<string, unknown>)[camel] ?? null;
  }

  function severityClasses(s: Severity = 'info'): string {
    if (s === 'destructive') return 'bg-ripple-error';
    if (s === 'warning') return 'bg-ripple-warning';
    if (s === 'success') return 'bg-ripple-success';
    return 'bg-ripple-info';
  }

  function formatDetails(d: Entry['details']): string {
    if (!d) return '';
    if (typeof d === 'string') return d;
    try {
      return JSON.stringify(d, null, 2);
    } catch {
      return String(d);
    }
  }
</script>

<ul
  {id}
  class={cn('flex flex-col gap-0 m-0 p-0 list-none', className)}
  style={styleString}
>
  {#each entries as entry, i (entry.id)}
    {@const ActorIcon = getIcon(entry.actorIcon)}
    {@const isOpen = expanded.has(entry.id)}
    {@const isLast = i === entries.length - 1}
    <li class="relative pl-6 py-2.5">
      <span
        class={cn('absolute left-1.5 top-3.5 h-2 w-2 rounded-full', severityClasses(entry.severity))}
      ></span>
      {#if !isLast}
        <span class="absolute left-2.5 top-5 bottom-0 w-px bg-border" aria-hidden="true"></span>
      {/if}

      <div class="flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="text-sm">
            {#if ActorIcon}<ActorIcon size={12} class="inline opacity-60 mr-1 align-[-2px]" />{/if}
            <span class="font-medium">{entry.actor}</span>
            <span class="text-muted-foreground"> {entry.action} </span>
            {#if entry.target}
              <span class="font-mono text-xs bg-muted/50 rounded px-1 py-0.5">{entry.target}</span>
            {/if}
          </div>
          {#if entry.timestamp}
            <div class="text-xs text-muted-foreground mt-0.5">{entry.timestamp}</div>
          {/if}
        </div>
        {#if showDetails && entry.details}
          <button
            type="button"
            class="text-xs text-muted-foreground hover:text-foreground"
            onclick={() => toggle(entry.id)}
            aria-expanded={isOpen}
          >
            {isOpen ? 'Hide details' : 'Details'}
          </button>
        {/if}
      </div>

      {#if showDetails && entry.details && isOpen}
        <pre class="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all">{formatDetails(entry.details)}</pre>
      {/if}
    </li>
  {/each}
</ul>
