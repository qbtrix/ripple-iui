<!--
  @file EntityDetail.svelte
  @description The "view one record" layout: hero header (avatar/title/status),
  KPI strip, action buttons, meta sidebar, and a content body via children.
  Used for any single-entity page — customer, order, ticket, project, employee,
  patient, asset, SKU. Most-reused enterprise layout in any business app.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import type { EventHandler, EventHandlerOrArray } from '@ripple-ui/core';
  import type { EventDispatcher } from '@ripple-ui/core';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  type StatusVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info';
  type Trend = 'up' | 'down' | 'flat';

  interface Status {
    label: string;
    variant?: StatusVariant;
  }

  interface Kpi {
    label: string;
    value: string | number;
    delta?: string;
    trend?: Trend;
    sublabel?: string;
  }

  interface Action {
    id?: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    actions?: EventHandlerOrArray;
  }

  interface MetaItem {
    label: string;
    value: string;
    icon?: string;
  }

  interface Tag {
    label: string;
    color?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title: string;
    subtitle?: string;
    eyebrow?: string;
    avatar?: string;
    icon?: string;
    iconColor?: string;
    status?: Status;
    tags?: (string | Tag)[];
    kpis?: Kpi[];
    actions?: Action[];
    meta?: MetaItem[];
    /** Show meta as a right-side rail (default) or stacked above the body. */
    metaPlacement?: 'rail' | 'stacked';
    children?: Snippet;
    hasChildren?: boolean;
    onaction?: (id: string) => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    subtitle,
    eyebrow,
    avatar,
    icon,
    iconColor,
    status,
    tags: rawTags = [],
    kpis: rawKpis = [],
    actions: rawActions = [],
    meta: rawMeta = [],
    metaPlacement = 'rail',
    children,
    hasChildren = false,
    onaction
  }: Props = $props();

  // Defensive: array props may arrive as undefined / unevaluated strings
  // from LLM-generated specs.
  const tags = $derived(safeArray<string | Tag>(rawTags, { widget: 'entity-detail', key: 'tags' }));
  const kpis = $derived(safeArray<Kpi>(rawKpis, { widget: 'entity-detail', key: 'kpis' }));
  const actions = $derived(safeArray<Action>(rawActions, { widget: 'entity-detail', key: 'actions' }));
  const meta = $derived(safeArray<MetaItem>(rawMeta, { widget: 'entity-detail', key: 'meta' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  const STATUS_CLASS: Record<StatusVariant, string> = {
    default: 'bg-muted text-foreground border border-border',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    destructive: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
  };

  const VARIANT_CLASS: Record<NonNullable<Action['variant']>, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-border bg-transparent hover:bg-muted',
    ghost: 'bg-transparent hover:bg-muted',
    destructive: 'bg-red-500 text-white hover:bg-red-500/90'
  };

  function fireAction(a: Action) {
    if (a.actions && eventDispatcher) {
      const handlers = Array.isArray(a.actions) ? a.actions : [a.actions];
      void eventDispatcher.dispatch(
        handlers as EventHandler[],
        { state: stateManager?.state ?? {} },
        a.id
      );
      return;
    }
    if (a.id) onaction?.(a.id);
  }

  function tagText(t: string | Tag): string {
    return typeof t === 'string' ? t : t.label;
  }
  function tagColor(t: string | Tag): string | undefined {
    return typeof t === 'string' ? undefined : t.color;
  }

  function trendArrow(t?: Trend): string {
    return t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  }
  function trendClass(t?: Trend): string {
    return t === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : t === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';
  }
</script>

<div {id} class={cn('rentity', className)} style={styleString}>
  <!-- Hero -->
  <header class="rentity-hero">
    <div class="rentity-hero-main">
      {#if avatar}
        <img src={avatar} alt={title} class="rentity-avatar" />
      {:else if icon}
        <div class="rentity-icon" style={iconColor ? `background:${iconColor};` : undefined}>
          <Icon name={icon} size={28} color="white" />
        </div>
      {/if}
      <div class="rentity-titles">
        {#if eyebrow}
          <div class="rentity-eyebrow">{eyebrow}</div>
        {/if}
        <h1 class="rentity-title">{title}</h1>
        {#if subtitle}
          <p class="rentity-subtitle">{subtitle}</p>
        {/if}
        {#if status || tags.length > 0}
          <div class="rentity-pills">
            {#if status}
              <span class={cn('rentity-status', STATUS_CLASS[status.variant ?? 'default'])}>
                <span class="rentity-status-dot"></span>
                {status.label}
              </span>
            {/if}
            {#each tags as t}
              <span class="rentity-tag" style={tagColor(t) ? `--rtag:${tagColor(t)};` : undefined}>
                {tagText(t)}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    {#if actions.length > 0}
      <div class="rentity-actions">
        {#each actions as a}
          <button
            type="button"
            class={cn('rentity-btn', VARIANT_CLASS[a.variant ?? 'default'])}
            onclick={() => fireAction(a)}
          >
            {#if a.icon}
              <Icon name={a.icon} size={14} />
            {/if}
            <span>{a.label}</span>
          </button>
        {/each}
      </div>
    {/if}
  </header>

  <!-- KPI strip -->
  {#if kpis.length > 0}
    <div class="rentity-kpis">
      {#each kpis as k}
        <div class="rentity-kpi">
          <div class="rentity-kpi-label">{k.label}</div>
          <div class="rentity-kpi-value">{k.value}</div>
          {#if k.delta || k.sublabel}
            <div class="rentity-kpi-meta">
              {#if k.delta}
                <span class={cn('rentity-kpi-delta', trendClass(k.trend))}>
                  {trendArrow(k.trend)} {k.delta}
                </span>
              {/if}
              {#if k.sublabel}
                <span class="rentity-kpi-sublabel">{k.sublabel}</span>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Body + optional rail -->
  <div class={cn('rentity-body', metaPlacement === 'rail' && meta.length > 0 && 'rentity-body-with-rail')}>
    {#if metaPlacement === 'stacked' && meta.length > 0}
      <dl class="rentity-meta-stacked">
        {#each meta as m}
          <div class="rentity-meta-item">
            <dt class="rentity-meta-label">
              {#if m.icon}<Icon name={m.icon} size={12} />{/if}
              {m.label}
            </dt>
            <dd class="rentity-meta-value">{m.value}</dd>
          </div>
        {/each}
      </dl>
    {/if}

    <main class="rentity-content">
      {#if hasChildren && children}
        {@render children()}
      {/if}
    </main>

    {#if metaPlacement === 'rail' && meta.length > 0}
      <aside class="rentity-rail">
        <h3 class="rentity-rail-title">Details</h3>
        <dl class="rentity-rail-list">
          {#each meta as m}
            <div class="rentity-rail-item">
              <dt class="rentity-rail-label">
                {#if m.icon}<Icon name={m.icon} size={12} />{/if}
                {m.label}
              </dt>
              <dd class="rentity-rail-value">{m.value}</dd>
            </div>
          {/each}
        </dl>
      </aside>
    {/if}
  </div>
</div>

<style>
  .rentity {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Hero */
  .rentity-hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  .rentity-hero-main {
    display: flex;
    gap: 16px;
    flex: 1;
    min-width: 0;
  }
  .rentity-avatar {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid var(--border);
  }
  .rentity-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: oklch(0.55 0.18 250);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rentity-titles {
    min-width: 0;
    flex: 1;
  }
  .rentity-eyebrow {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
    margin-bottom: 4px;
  }
  .rentity-title {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.2;
    margin: 0;
    color: var(--foreground);
  }
  .rentity-subtitle {
    font-size: 14px;
    color: var(--muted-foreground);
    margin: 4px 0 0;
  }
  .rentity-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }
  .rentity-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
  }
  .rentity-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .rentity-tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
    background: color-mix(in oklab, var(--rtag, var(--muted)) 20%, transparent);
    color: var(--rtag, var(--foreground));
    border: 1px solid color-mix(in oklab, var(--rtag, var(--border)) 25%, transparent);
  }

  /* Actions */
  .rentity-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .rentity-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  /* KPI strip */
  .rentity-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .rentity-kpi {
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
  }
  .rentity-kpi-label {
    font-size: 12px;
    color: var(--muted-foreground);
    margin-bottom: 4px;
  }
  .rentity-kpi-value {
    font-size: 22px;
    font-weight: 600;
    line-height: 1.1;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }
  .rentity-kpi-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: 11px;
  }
  .rentity-kpi-delta {
    font-weight: 500;
  }
  .rentity-kpi-sublabel {
    color: var(--muted-foreground);
  }

  /* Body */
  .rentity-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  @media (min-width: 900px) {
    .rentity-body-with-rail {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 260px;
      gap: 24px;
      align-items: start;
    }
  }
  .rentity-content {
    min-width: 0;
  }

  /* Rail */
  .rentity-rail {
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
  }
  .rentity-rail-title {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
  }
  .rentity-rail-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
  }
  .rentity-rail-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
  }
  .rentity-rail-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--muted-foreground);
    margin: 0;
  }
  .rentity-rail-value {
    font-size: 13px;
    color: var(--foreground);
    margin: 0;
  }

  /* Stacked meta */
  .rentity-meta-stacked {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: color-mix(in oklab, var(--muted) 30%, transparent);
    margin: 0;
  }
  .rentity-meta-item {
    margin: 0;
  }
  .rentity-meta-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--muted-foreground);
    margin: 0 0 2px;
  }
  .rentity-meta-value {
    font-size: 13px;
    color: var(--foreground);
    margin: 0;
  }
</style>
