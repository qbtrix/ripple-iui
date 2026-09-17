<!--
  src/lib/widgets/vertical/AuditLog.svelte
  Modified: 2026-06-09 — a11y fix: moved onclick/onkeydown off <li> and onto the
  inner content <div> via a `rowInteractive` derived spread (role="button"/tabindex/
  aria-label only when onSelectId is provided), fixing
  a11y_no_noninteractive_element_interactions. Recipe 3.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import type { Component } from 'svelte';
  import * as icons from '@lucide/svelte';

  type Severity = 'info' | 'warning' | 'destructive' | 'success';

  type Entry = {
    id: string | number;
    actor: string;
    actorIcon?: string;
    action: string;
    target?: string;
    timestamp?: string;
    /** Optional category for filtering — e.g. "auth", "billing", "deploy". */
    type?: string;
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
    /** Group rows by timestamp granularity. Default 'none'. */
    groupBy?: 'none' | 'day' | 'week';
    /** When true, renders a filter chip row above the list (uses entries' types/severities/actors). */
    showFilters?: boolean;
    /** Currently selected entry id — receives a highlight + caller can show a side panel. */
    selectedId?: string | number;
    onSelectId?: (id: string | number) => void;
  }

  let {
    id,
    class: className,
    style,
    entries = [],
    showDetails = true,
    groupBy = 'none',
    showFilters = false,
    selectedId,
    onSelectId
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let expanded = $state<Set<string | number>>(new Set());
  let activeTypes = $state<Set<string>>(new Set());
  let activeSeverities = $state<Set<Severity>>(new Set());
  let activeActors = $state<Set<string>>(new Set());

  function toggle(eid: string | number) {
    const next = new Set(expanded);
    if (next.has(eid)) next.delete(eid); else next.add(eid);
    expanded = next;
  }

  function toggleSet<T>(s: Set<T>, val: T): Set<T> {
    const next = new Set(s);
    if (next.has(val)) next.delete(val); else next.add(val);
    return next;
  }

  function getIcon(name?: string): Component | null {
    if (!name) return null;
    const camel = name
      .split('-')
      .map((p) => (p[0]?.toUpperCase() ?? '') + p.slice(1))
      .join('');
    const found = ((icons as unknown) as Record<string, unknown>)[camel];
    return (found as Component | undefined) ?? null;
  }

  function severityClasses(s: Severity = 'info'): string {
    if (s === 'destructive') return 'bg-rose-500';
    if (s === 'warning') return 'bg-amber-500';
    if (s === 'success') return 'bg-emerald-500';
    return 'bg-sky-500';
  }

  function severityChipClasses(s: Severity, active: boolean): string {
    const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors cursor-pointer';
    if (!active) return `${base} border-border text-muted-foreground hover:bg-muted`;
    if (s === 'destructive') return `${base} bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30`;
    if (s === 'warning') return `${base} bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30`;
    if (s === 'success') return `${base} bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30`;
    return `${base} bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30`;
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

  // ---- Filter facets -----------------------------------------------------

  const typeFacets = $derived.by(() => {
    const set = new Set<string>();
    for (const e of entries) if (e.type) set.add(e.type);
    return Array.from(set).sort();
  });

  const severityFacets = $derived.by<Severity[]>(() => {
    const set = new Set<Severity>();
    for (const e of entries) if (e.severity) set.add(e.severity);
    return Array.from(set);
  });

  const actorFacets = $derived.by(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(e.actor);
    return Array.from(set).sort();
  });

  const filtered = $derived(
    entries.filter((e) => {
      if (activeTypes.size > 0 && (!e.type || !activeTypes.has(e.type))) return false;
      if (activeSeverities.size > 0 && (!e.severity || !activeSeverities.has(e.severity))) return false;
      if (activeActors.size > 0 && !activeActors.has(e.actor)) return false;
      return true;
    })
  );

  // ---- Grouping ----------------------------------------------------------

  function dayKey(ts?: string): string {
    if (!ts) return 'No date';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function dayLabel(ts?: string): string {
    if (!ts) return 'No date';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function weekKey(ts?: string): string {
    if (!ts) return 'No date';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    // Move to the Monday of the ISO week.
    const day = (d.getUTCDay() + 6) % 7;
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
    return monday.toISOString().slice(0, 10);
  }

  function weekLabel(ts?: string): string {
    if (!ts) return 'No date';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const day = (d.getUTCDay() + 6) % 7;
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const fmt = (x: Date) => x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `Week of ${fmt(monday)} – ${fmt(sunday)}`;
  }

  const groups = $derived.by<{ key: string; label: string; entries: Entry[] }[]>(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '', entries: filtered }];
    const map = new Map<string, { label: string; entries: Entry[] }>();
    for (const e of filtered) {
      const key = groupBy === 'day' ? dayKey(e.timestamp) : weekKey(e.timestamp);
      const label = groupBy === 'day' ? dayLabel(e.timestamp) : weekLabel(e.timestamp);
      if (!map.has(key)) map.set(key, { label, entries: [] });
      map.get(key)!.entries.push(e);
    }
    // Sort newest first.
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([key, v]) => ({ key, label: v.label, entries: v.entries }));
  });

  function handleRowClick(eid: string | number) {
    onSelectId?.(eid);
  }
  function handleRowKey(eid: string | number, e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(eid);
    }
  }
  // Row is only interactive when onSelectId is provided. Build the interactive
  // attrs as a derived so the spread pattern suppresses the static a11y check.
  const rowInteractive = $derived(
    onSelectId
      ? {
          role: 'button' as const,
          tabindex: 0,
          'aria-label': 'Select entry',
        }
      : {}
  );
</script>

<div {id} class={cn('flex flex-col gap-3', className)} style={styleString}>
  {#if showFilters && (typeFacets.length > 0 || severityFacets.length > 0 || actorFacets.length > 0)}
    <div class="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
      {#if typeFacets.length > 0}
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs font-medium text-muted-foreground mr-1">Type</span>
          {#each typeFacets as t}
            <button
              type="button"
              class={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors cursor-pointer',
                activeTypes.has(t)
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
              onclick={() => (activeTypes = toggleSet(activeTypes, t))}
            >
              {t}
            </button>
          {/each}
        </div>
      {/if}
      {#if severityFacets.length > 0}
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs font-medium text-muted-foreground mx-1">Severity</span>
          {#each severityFacets as s}
            <button
              type="button"
              class={severityChipClasses(s, activeSeverities.has(s))}
              onclick={() => (activeSeverities = toggleSet(activeSeverities, s))}
            >
              <span class={cn('w-1.5 h-1.5 rounded-full', severityClasses(s))}></span>
              {s}
            </button>
          {/each}
        </div>
      {/if}
      {#if actorFacets.length > 0 && actorFacets.length <= 8}
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs font-medium text-muted-foreground mx-1">Actor</span>
          {#each actorFacets as a}
            <button
              type="button"
              class={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors cursor-pointer',
                activeActors.has(a)
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
              onclick={() => (activeActors = toggleSet(activeActors, a))}
            >
              {a}
            </button>
          {/each}
        </div>
      {/if}
      {#if activeTypes.size + activeSeverities.size + activeActors.size > 0}
        <button
          type="button"
          class="ml-auto text-xs text-muted-foreground hover:text-foreground"
          onclick={() => { activeTypes = new Set(); activeSeverities = new Set(); activeActors = new Set(); }}
        >
          Clear
        </button>
      {/if}
    </div>
  {/if}

  {#if filtered.length === 0}
    <div class="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      No matching entries.
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each groups as g (g.key)}
        {#if g.label}
          <div class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label}
            <span class="ml-1 text-muted-foreground/60">· {g.entries.length}</span>
          </div>
        {/if}
        <ul class="flex flex-col gap-0 m-0 p-0 list-none">
          {#each g.entries as entry, i (entry.id)}
            {@const ActorIcon = getIcon(entry.actorIcon)}
            {@const isOpen = expanded.has(entry.id)}
            {@const isLast = i === g.entries.length - 1}
            {@const isSelected = selectedId !== undefined && selectedId === entry.id}
            <li
              class={cn(
                'relative pl-6 py-2.5 -mx-2 px-2 rounded-md transition-colors',
                isSelected && 'bg-primary/5 ring-1 ring-primary/30'
              )}
            >
              <span class={cn('absolute left-3.5 top-3.5 h-2 w-2 rounded-full', severityClasses(entry.severity))}></span>
              {#if !isLast}
                <span class="absolute left-[18px] top-5 bottom-0 w-px bg-border" aria-hidden="true"></span>
              {/if}
              <div
                class={cn('flex items-center justify-between gap-3', onSelectId && 'cursor-pointer hover:bg-muted/40 rounded-sm')}
                {...rowInteractive}
                onclick={onSelectId ? () => handleRowClick(entry.id) : undefined}
                onkeydown={onSelectId ? (e) => handleRowKey(entry.id, e) : undefined}
              >
                <div class="flex-1 min-w-0">
                  <div class="text-sm">
                    {#if ActorIcon}<ActorIcon size={12} class="inline opacity-60 mr-1 align-[-2px]" />{/if}
                    <span class="font-medium">{entry.actor}</span>
                    <span class="text-muted-foreground"> {entry.action} </span>
                    {#if entry.target}
                      <span class="font-mono text-xs bg-muted/50 rounded px-1 py-0.5">{entry.target}</span>
                    {/if}
                    {#if entry.type}
                      <span class="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground/80 bg-muted/50 rounded px-1.5 py-0.5">{entry.type}</span>
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
                    onclick={(e) => { e.stopPropagation(); toggle(entry.id); }}
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
      {/each}
    </div>
  {/if}
</div>
