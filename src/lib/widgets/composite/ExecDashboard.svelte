<!--
  @file ExecDashboard.svelte
  @description Executive / KPI dashboard archetype: header (title + date range
  + actions) → KPI strip (4–6 tiles, optionally with sparklines) → primary
  chart (2/3) + activity rail (1/3) → optional secondary chart row → optional
  bottom data table.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import Chart from '$lib/widgets/data/Chart.svelte';
  import Sparkline from '$lib/widgets/data/Sparkline.svelte';
  import Table from '$lib/widgets/data/Table.svelte';
  import type { EventHandler, EventHandlerOrArray } from '$lib/schema/event-handler.js';
  import type { EventDispatcher } from '$lib/core/event-dispatcher.js';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  type Trend = 'up' | 'down' | 'flat';
  type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'radar' | 'heatmap';
  type Severity = 'info' | 'success' | 'warning' | 'destructive';

  interface Action {
    id?: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'outline' | 'ghost';
    actions?: EventHandlerOrArray;
  }

  interface Kpi {
    id?: string;
    label: string;
    value: string | number;
    delta?: string;
    trend?: Trend;
    sparkline?: number[];
    color?: string;
    sublabel?: string;
    actions?: EventHandlerOrArray;
  }

  interface DataPoint {
    label: string;
    value?: number;
    series?: Record<string, number>;
    [key: string]: unknown;
  }

  interface ChartConfig {
    title?: string;
    type?: ChartType;
    data: DataPoint[];
    height?: number;
    colors?: string[];
  }

  interface ActivityItem {
    id?: string;
    time: string;
    label: string;
    actor?: string;
    icon?: string;
    severity?: Severity;
    actions?: EventHandlerOrArray;
  }

  interface TableConfig {
    title?: string;
    columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
    rows: Record<string, unknown>[];
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    subtitle?: string;
    /** Single chip — used when no `dateRanges` preset list is provided. */
    dateRange?: string;
    /** Preset chips that switch via segmented control. e.g. ['Today','7d','30d','90d','YTD']. */
    dateRanges?: string[];
    /** Active preset (two-way bindable). */
    activeDateRange?: string;
    /** Optional granularity toggle (e.g. ['Day','Week','Month']). */
    granularities?: string[];
    /** Active granularity (two-way bindable). */
    activeGranularity?: string;
    /** Optional activity-rail filter chips (e.g. ['All','Mine','Alerts']). */
    activityFilters?: string[];
    /** Active activity filter (two-way bindable). */
    activeActivityFilter?: string;
    /** Show built-in refresh button. Default true. */
    showRefresh?: boolean;
    /** Actions dispatched when refresh clicked. */
    refreshActions?: EventHandlerOrArray;
    actions?: Action[];
    kpis?: Kpi[];
    primaryChart?: ChartConfig;
    activity?: ActivityItem[];
    activityTitle?: string;
    charts?: ChartConfig[];
    table?: TableConfig;
    onaction?: (id: string) => void;
    onkpiclick?: (id: string) => void;
    onactivityclick?: (id: string) => void;
    ondateRangeChange?: (range: string) => void;
    ongranularitychange?: (g: string) => void;
    onactivityfilterchange?: (f: string) => void;
    onrefresh?: () => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    subtitle,
    dateRange,
    dateRanges,
    activeDateRange = $bindable(),
    granularities,
    activeGranularity = $bindable(),
    activityFilters,
    activeActivityFilter = $bindable(),
    showRefresh = true,
    refreshActions,
    actions = [],
    kpis = [],
    primaryChart,
    activity = [],
    activityTitle = 'Recent activity',
    charts = [],
    table,
    onaction,
    onkpiclick,
    onactivityclick,
    ondateRangeChange,
    ongranularitychange,
    onactivityfilterchange,
    onrefresh
  }: Props = $props();

  $effect(() => {
    if (dateRanges && dateRanges.length > 0 && (!activeDateRange || !dateRanges.includes(activeDateRange))) {
      activeDateRange = dateRanges[0];
    }
  });
  $effect(() => {
    if (granularities && granularities.length > 0 && (!activeGranularity || !granularities.includes(activeGranularity))) {
      activeGranularity = granularities[0];
    }
  });
  $effect(() => {
    if (activityFilters && activityFilters.length > 0 && (!activeActivityFilter || !activityFilters.includes(activeActivityFilter))) {
      activeActivityFilter = activityFilters[0];
    }
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  const SEV_DOT: Record<Severity, string> = {
    info: 'bg-sky-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    destructive: 'bg-rose-500'
  };

  const VARIANT: Record<NonNullable<Action['variant']>, string> = {
    default: 'rdash-btn-primary',
    outline: 'rdash-btn-outline',
    ghost: 'rdash-btn-ghost'
  };

  function trendArrow(t?: Trend): string {
    return t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  }
  function trendClass(t?: Trend): string {
    return t === 'up' ? 'text-emerald-600 dark:text-emerald-400'
      : t === 'down' ? 'text-rose-600 dark:text-rose-400'
      : 'text-muted-foreground';
  }
  function sparklineColor(t?: Trend): string {
    return t === 'down' ? 'oklch(0.55 0.22 25)' : 'oklch(0.55 0.18 250)';
  }

  function dispatch(handler: EventHandlerOrArray | undefined, payload?: unknown): boolean {
    if (!handler || !eventDispatcher) return false;
    const handlers = Array.isArray(handler) ? handler : [handler];
    void eventDispatcher.dispatch(handlers as EventHandler[], { state: stateManager?.state ?? {} }, payload);
    return true;
  }

  function fireAction(a: Action) {
    if (dispatch(a.actions, a.id)) return;
    if (a.id) onaction?.(a.id);
  }

  function handleKpiClick(k: Kpi) {
    if (dispatch(k.actions, k)) return;
    if (k.id) onkpiclick?.(k.id);
  }

  function handleActivityClick(a: ActivityItem) {
    if (dispatch(a.actions, a)) return;
    if (a.id) onactivityclick?.(a.id);
  }

  function handleRefresh() {
    if (dispatch(refreshActions)) return;
    onrefresh?.();
  }

  function pickDateRange(r: string) {
    activeDateRange = r;
    ondateRangeChange?.(r);
  }
  function pickGranularity(g: string) {
    activeGranularity = g;
    ongranularitychange?.(g);
  }
  function pickActivityFilter(f: string) {
    activeActivityFilter = f;
    onactivityfilterchange?.(f);
  }

  const visibleActivity = $derived.by(() => {
    if (!activityFilters || !activeActivityFilter) return activity;
    if (activeActivityFilter === activityFilters[0]) return activity; // first preset = "All"
    if (activeActivityFilter.toLowerCase() === 'alerts') {
      return activity.filter((a) => a.severity === 'warning' || a.severity === 'destructive');
    }
    return activity;
  });

  const isClickableKpi = (k: Kpi) => Boolean(k.actions || (k.id && onkpiclick));
  const isClickableActivity = (a: ActivityItem) => Boolean(a.actions || (a.id && onactivityclick));
</script>

<div {id} class={cn('rdash', className)} style={styleString}>
  {#if title || subtitle || dateRange || actions.length > 0}
    <header class="rdash-header">
      <div class="rdash-header-main">
        {#if title}<h1 class="rdash-title">{title}</h1>{/if}
        {#if subtitle}<p class="rdash-subtitle">{subtitle}</p>{/if}
      </div>
      <div class="rdash-header-tools">
        {#if dateRanges && dateRanges.length > 0}
          <div class="rdash-segmented" role="tablist" aria-label="Date range">
            {#each dateRanges as r}
              <button
                type="button"
                role="tab"
                aria-selected={activeDateRange === r}
                class={cn('rdash-seg-btn', activeDateRange === r && 'rdash-seg-btn-active')}
                onclick={() => pickDateRange(r)}
              >
                {r}
              </button>
            {/each}
          </div>
        {:else if dateRange}
          <span class="rdash-range">
            <Icon name="calendar" size={12} />
            {dateRange}
          </span>
        {/if}
        {#if granularities && granularities.length > 0}
          <div class="rdash-segmented" role="tablist" aria-label="Granularity">
            {#each granularities as g}
              <button
                type="button"
                role="tab"
                aria-selected={activeGranularity === g}
                class={cn('rdash-seg-btn', activeGranularity === g && 'rdash-seg-btn-active')}
                onclick={() => pickGranularity(g)}
              >
                {g}
              </button>
            {/each}
          </div>
        {/if}
        {#if showRefresh}
          <button type="button" class="rdash-icon-btn" aria-label="Refresh" title="Refresh" onclick={handleRefresh}>
            <Icon name="refresh-cw" size={14} />
          </button>
        {/if}
        {#each actions as a}
          <button type="button" class={cn('rdash-btn', VARIANT[a.variant ?? 'outline'])} onclick={() => fireAction(a)}>
            {#if a.icon}<Icon name={a.icon} size={13} />{/if}
            <span>{a.label}</span>
          </button>
        {/each}
      </div>
    </header>
  {/if}

  {#if kpis.length > 0}
    <div class="rdash-kpis">
      {#each kpis as k}
        {@const clickable = isClickableKpi(k)}
        <button
          type="button"
          class={cn('rdash-kpi', clickable && 'rdash-kpi-clickable')}
          onclick={clickable ? () => handleKpiClick(k) : undefined}
          tabindex={clickable ? 0 : -1}
          aria-label={clickable ? `${k.label}: ${k.value}` : undefined}
          disabled={!clickable}
        >
          <div class="rdash-kpi-label">{k.label}</div>
          <div class="rdash-kpi-row">
            <div class="rdash-kpi-value" style={k.color ? `color:${k.color};` : undefined}>{k.value}</div>
            {#if k.sparkline && k.sparkline.length > 1}
              <div class="rdash-kpi-spark">
                <Sparkline values={k.sparkline} color={k.color ?? sparklineColor(k.trend)} height={28} noTooltip />
              </div>
            {/if}
          </div>
          {#if k.delta || k.sublabel}
            <div class="rdash-kpi-meta">
              {#if k.delta}
                <span class={cn('rdash-kpi-delta', trendClass(k.trend))}>{trendArrow(k.trend)} {k.delta}</span>
              {/if}
              {#if k.sublabel}
                <span class="rdash-kpi-sub">{k.sublabel}</span>
              {/if}
            </div>
          {/if}
          {#if clickable}
            <span class="rdash-kpi-arrow" aria-hidden="true">
              <Icon name="arrow-up-right" size={12} />
            </span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  {#if primaryChart || activity.length > 0}
    <div class={cn('rdash-row', primaryChart && activity.length > 0 ? 'rdash-row-2' : 'rdash-row-1')}>
      {#if primaryChart}
        <div class="rdash-card">
          {#if primaryChart.title}
            <div class="rdash-card-title">{primaryChart.title}</div>
          {/if}
          <Chart
            data={primaryChart.data}
            type={primaryChart.type ?? 'line'}
            height={primaryChart.height ?? 260}
            colors={primaryChart.colors}
          />
        </div>
      {/if}
      {#if activity.length > 0}
        <aside class="rdash-card rdash-activity">
          <div class="rdash-card-head">
            <div class="rdash-card-title">{activityTitle}</div>
            {#if activityFilters && activityFilters.length > 0}
              <div class="rdash-pills" role="tablist" aria-label="Activity filter">
                {#each activityFilters as f}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeActivityFilter === f}
                    class={cn('rdash-pill', activeActivityFilter === f && 'rdash-pill-active')}
                    onclick={() => pickActivityFilter(f)}
                  >
                    {f}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          {#if visibleActivity.length === 0}
            <div class="rdash-activity-empty">No matching activity.</div>
          {:else}
            <ol class="rdash-activity-list">
              {#each visibleActivity as a, i (a.id ?? i)}
                {@const clickable = isClickableActivity(a)}
                <li class={cn('rdash-activity-item', clickable && 'rdash-activity-item-clickable')}>
                  <button
                    type="button"
                    class="rdash-activity-btn"
                    onclick={clickable ? () => handleActivityClick(a) : undefined}
                    disabled={!clickable}
                    tabindex={clickable ? 0 : -1}
                  >
                    <span class={cn('rdash-activity-dot', a.severity ? SEV_DOT[a.severity] : 'bg-sky-500')}></span>
                    <div class="rdash-activity-body">
                      <div class="rdash-activity-row">
                        <span class="rdash-activity-label">
                          {#if a.icon}<Icon name={a.icon} size={11} />{/if}
                          {a.label}
                        </span>
                        <span class="rdash-activity-time">{a.time}</span>
                      </div>
                      {#if a.actor}
                        <span class="rdash-activity-actor">{a.actor}</span>
                      {/if}
                    </div>
                  </button>
                </li>
              {/each}
            </ol>
          {/if}
        </aside>
      {/if}
    </div>
  {/if}

  {#if charts.length > 0}
    <div class="rdash-charts">
      {#each charts as c}
        <div class="rdash-card">
          {#if c.title}<div class="rdash-card-title">{c.title}</div>{/if}
          <Chart data={c.data} type={c.type ?? 'bar'} height={c.height ?? 180} colors={c.colors} />
        </div>
      {/each}
    </div>
  {/if}

  {#if table}
    <div class="rdash-card">
      {#if table.title}<div class="rdash-card-title">{table.title}</div>{/if}
      <Table columns={table.columns} rows={table.rows} />
    </div>
  {/if}
</div>

<style>
  .rdash {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .rdash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .rdash-header-main { flex: 1; min-width: 0; }
  .rdash-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .rdash-subtitle {
    font-size: 13px;
    color: var(--muted-foreground);
    margin: 4px 0 0;
  }
  .rdash-header-tools {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .rdash-range {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--card);
    font-size: 12.5px;
    color: var(--foreground);
  }
  .rdash-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    border: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .rdash-btn-primary { background: oklch(0.55 0.18 250); color: white; }
  .rdash-btn-primary:hover { background: oklch(0.5 0.18 250); }
  .rdash-btn-outline { background: transparent; color: var(--foreground); border: 1px solid var(--border); }
  .rdash-btn-outline:hover { background: var(--muted); }
  .rdash-btn-ghost { background: transparent; color: var(--foreground); }
  .rdash-btn-ghost:hover { background: var(--muted); }
  .rdash-icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--muted-foreground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .rdash-icon-btn:hover {
    background: var(--muted);
    color: var(--foreground);
  }

  .rdash-segmented {
    display: inline-flex;
    background: var(--muted);
    border-radius: 8px;
    padding: 2px;
    gap: 0;
  }
  .rdash-seg-btn {
    height: 28px;
    padding: 0 12px;
    border: 0;
    background: transparent;
    color: var(--muted-foreground);
    font-size: 12.5px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .rdash-seg-btn:hover { color: var(--foreground); }
  .rdash-seg-btn-active {
    background: var(--card);
    color: var(--foreground);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .rdash-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .rdash-kpi {
    position: relative;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    color: inherit;
    font: inherit;
    cursor: default;
    transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .rdash-kpi:disabled { cursor: default; }
  .rdash-kpi-clickable { cursor: pointer; }
  .rdash-kpi-clickable:hover {
    border-color: color-mix(in oklab, oklch(0.55 0.18 250) 35%, var(--border));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }
  .rdash-kpi-clickable:focus-visible {
    outline: 2px solid oklch(0.55 0.18 250);
    outline-offset: 1px;
  }
  .rdash-kpi-arrow {
    position: absolute;
    top: 12px;
    right: 12px;
    color: var(--muted-foreground);
    opacity: 0;
    transition: opacity 0.15s, color 0.15s, transform 0.15s;
    display: inline-flex;
  }
  .rdash-kpi-clickable:hover .rdash-kpi-arrow,
  .rdash-kpi-clickable:focus-visible .rdash-kpi-arrow {
    opacity: 1;
    color: oklch(0.55 0.18 250);
    transform: translate(1px, -1px);
  }
  .rdash-kpi-label {
    font-size: 12px;
    color: var(--muted-foreground);
    font-weight: 500;
  }
  .rdash-kpi-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .rdash-kpi-value {
    font-size: 26px;
    font-weight: 600;
    line-height: 1.05;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .rdash-kpi-spark {
    width: 80px;
    flex-shrink: 0;
  }
  .rdash-kpi-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
  }
  .rdash-kpi-delta { font-weight: 500; }
  .rdash-kpi-sub { color: var(--muted-foreground); }

  .rdash-row {
    display: grid;
    gap: 14px;
  }
  .rdash-row-1 { grid-template-columns: 1fr; }
  .rdash-row-2 { grid-template-columns: 1fr; }
  @media (min-width: 920px) {
    .rdash-row-2 { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  }

  .rdash-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }

  .rdash-card {
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .rdash-card-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .rdash-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .rdash-pills {
    display: inline-flex;
    gap: 4px;
  }
  .rdash-pill {
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: transparent;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .rdash-pill:hover { color: var(--foreground); background: var(--muted); }
  .rdash-pill-active {
    background: color-mix(in oklab, oklch(0.55 0.18 250) 14%, transparent);
    color: oklch(0.55 0.18 250);
    border-color: color-mix(in oklab, oklch(0.55 0.18 250) 30%, transparent);
  }

  .rdash-activity {
    max-height: 360px;
    overflow-y: auto;
  }
  .rdash-activity-empty {
    padding: 16px 0;
    text-align: center;
    color: var(--muted-foreground);
    font-size: 12px;
  }
  .rdash-activity-btn {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    background: transparent;
    border: 0;
    padding: 6px 8px;
    border-radius: 8px;
    text-align: left;
    color: inherit;
    font: inherit;
    cursor: default;
    transition: background 0.15s;
  }
  .rdash-activity-item-clickable .rdash-activity-btn {
    cursor: pointer;
  }
  .rdash-activity-item-clickable .rdash-activity-btn:hover {
    background: var(--muted);
  }
  .rdash-activity-item-clickable .rdash-activity-btn:focus-visible {
    outline: 2px solid oklch(0.55 0.18 250);
    outline-offset: 1px;
  }
  .rdash-activity-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .rdash-activity-item {
    display: block;
    margin: 0 -8px;
  }
  .rdash-activity-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 6px;
  }
  .rdash-activity-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .rdash-activity-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .rdash-activity-label {
    font-size: 13px;
    color: var(--foreground);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .rdash-activity-time {
    font-size: 11px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .rdash-activity-actor {
    font-size: 11.5px;
    color: var(--muted-foreground);
  }
</style>
