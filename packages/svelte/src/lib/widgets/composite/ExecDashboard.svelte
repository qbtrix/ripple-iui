<!--
  @file ExecDashboard.svelte
  @description Executive / KPI dashboard (`exec-dashboard`, aliases
  `kpi-dashboard`, `executive-dashboard`). Two modes:

  - Rows mode (a spec with `rows`): the model writes raw records plus
    `measures`, `dimensions`, `x`, `split` and optional `compare` rows, and
    ExecDashboardRows computes every KPI, trend, chart series, breakdown and
    table total from the filtered rows (logic in exec-dashboard.ts). `filters`
    is the bound field (contract event `onfilterschange`); a spec's
    `on_filter` gets `{ key, value }`.
  - KPI mode (no `rows`): the original prebuilt archetype. Header (title, date
    range chips, granularity, refresh, actions), KPI strip with sparklines and
    `byKey` overrides, primary chart plus activity rail, secondary charts and a
    table footer, all drawn from props as given.

  Events: the date-range chip fires both `ondaterangechange` (what a spec's
  `on_date_range_change` becomes) and the camel-cased `ondateRangeChange`, which
  stays separate so a bind writer and a spec handler never replace each other.
  A visitor's chip picks (range, granularity, activity filter) hold across a
  re-sent spec and give way only to a different value from the spec. Layout
  reads the widget's own width through container queries. The refresh icon's
  spin stops under prefers-reduced-motion.
-->
<script lang="ts">
  import { safeStyle } from '@ripple-ui/core';
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import Chart from '$lib/widgets/data/Chart.svelte';
  import Sparkline from '$lib/widgets/data/Sparkline.svelte';
  import Table from '$lib/widgets/data/Table.svelte';
  import type { EventHandler, EventHandlerOrArray } from '@ripple-ui/core';
  import type { EventDispatcher } from '@ripple-ui/core';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';
  import VerdictLine from '../data-kit/VerdictLine.svelte';
  import type { Verdict } from '../data-kit/types.js';
  import ExecDashboardRows from './ExecDashboardRows.svelte';
  import { readFilters, type Filters } from './exec-dashboard.js';

  type Trend = 'up' | 'down' | 'flat';
  type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'radar' | 'heatmap';
  type Severity = 'info' | 'success' | 'warning' | 'destructive';
  type Status = 'normal' | 'success' | 'warning' | 'critical';
  type Density = 'comfortable' | 'compact';

  interface Action {
    id?: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'outline' | 'ghost';
    actions?: EventHandlerOrArray;
  }

  /**
   * Per-key override for KPI fields. Keyed by activeDateRange, activeGranularity,
   * or a combined "range|granularity" string. The component falls back through
   * specificity when a key isn't found.
   *
   * Declared standalone (not as `Pick<Kpi, ...>`) to keep the Props type
   * inlinable during `.d.ts` emit — a Pick-of-Kpi reference forces the
   * compiler to retain `Kpi` as a private named symbol in the public type.
   */
  interface KpiOverride {
    value?: string | number;
    unit?: string;
    delta?: string;
    trend?: Trend;
    compareLabel?: string;
    sparkline?: number[];
    sublabel?: string;
    status?: Status;
    target?: string | number;
    progress?: number;
  }

  interface Kpi {
    id?: string;
    label: string;
    value: string | number;
    /** Optional unit, e.g. '$', '%', 'ms'. Rendered after the value with a subtle style. */
    unit?: string;
    delta?: string;
    trend?: Trend;
    /** Optional context for the delta (e.g. "vs last month"). */
    compareLabel?: string;
    sparkline?: number[];
    /** Override accent color (e.g. brand color). */
    color?: string;
    /** Optional leading icon next to the label. */
    icon?: string;
    sublabel?: string;
    /** Status band on the left edge — useful for threshold alerting. */
    status?: Status;
    /** Goal/threshold for the KPI; renders alongside `progress`. */
    target?: string | number;
    /** Progress toward target (0–100). Renders a thin progress bar. */
    progress?: number;
    /**
     * Per-key value overrides. The map is keyed by activeDateRange,
     * activeGranularity, or "<range>|<granularity>". When the active state
     * matches a key, those fields override the base values.
     *
     * The value type allows `undefined` so that consumers can write
     * heterogeneous literal maps (some KPIs only cover a subset of keys)
     * without TypeScript widening issues.
     */
    byKey?: { [key: string]: KpiOverride | undefined };
    actions?: EventHandlerOrArray;
  }

  interface DataPoint {
    label: string;
    value?: number;
    series?: Record<string, number>;
    [key: string]: unknown;
  }

  /**
   * Chart data can be a flat array OR a record keyed by activeDateRange,
   * activeGranularity, or "<range>|<granularity>". The component picks the
   * most specific match. Values may be `undefined` to permit literal maps
   * with gaps without TypeScript widening pain.
   */
  type ChartData = DataPoint[] | { [key: string]: DataPoint[] | undefined };

  interface ChartConfig {
    title?: string;
    type?: ChartType;
    data: ChartData;
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
    /** Optional category — surfaces in activity filter auto-derivation. */
    category?: string;
    /** Highlights the item with a stronger weight and an unread dot. */
    unread?: boolean;
    actions?: EventHandlerOrArray;
  }

  type TableRows =
    | Record<string, unknown>[]
    | { [key: string]: Record<string, unknown>[] | undefined };

  /** KPI mode: `columns` and `rows` render as given. Rows mode: only `title` and `columns` are read. */
  interface TableConfig {
    title?: string;
    columns?: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
    rows?: TableRows;
  }

  interface EmptyState {
    title?: string;
    message?: string;
    icon?: string;
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
    /** Human-readable "last updated" timestamp shown near the refresh button. */
    lastUpdated?: string;
    /** Render skeleton placeholders across the dashboard. */
    loading?: boolean;
    /** Render an error message in place of dashboard content. */
    error?: string;
    /** Density preset — 'compact' reduces padding & font sizes for dense ops/finance views. */
    density?: Density;
    /** Empty state shown when nothing is present. */
    empty?: EmptyState;
    actions?: Action[];
    kpis?: Kpi[];
    primaryChart?: ChartConfig;
    activity?: ActivityItem[];
    activityTitle?: string;
    charts?: ChartConfig[];
    table?: TableConfig;
    /** The answer up front: one model-written sentence, at most 140 chars. */
    verdict?: Verdict;
    /** ISO 4217 code for money measures in rows mode. Default USD. */
    currency?: string;
    /** Rows mode: raw records, e.g. orders `{ date, region, channel, amount }`. */
    rows?: Record<string, unknown>[];
    /** Rows mode: what to compute, in order; the first is the chart and breakdown measure. */
    measures?: { key?: string; label: string; format?: 'money' | 'number' | 'percent'; agg?: 'sum' | 'avg' | 'count'; good?: 'up' | 'down' }[];
    /** Rows mode: filter chip rows, in order. */
    dimensions?: { key: string; label: string }[];
    /** Rows mode: the time (or label) column the chart runs along. */
    x?: string;
    /** Rows mode: a column that stacks the chart by entity colour. */
    split?: string;
    /** Rows mode: the previous period's rows, for KPI trends. */
    compare?: Record<string, unknown>[];
    /** Rows mode: trend wording, e.g. "vs Q2". */
    compareLabel?: string;
    /** Rows mode: the active filter per dimension (the bound field). */
    filters?: Filters;
    onfilterschange?: (filters: Filters) => void;
    onfilter?: (pick: { key: string; value: string | null }) => void;
    onaction?: (id: string) => void;
    onkpiclick?: (id: string) => void;
    onactivityclick?: (id: string) => void;
    ondateRangeChange?: (range: string) => void;
    ondaterangechange?: (range: string) => void;
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
    showRefresh: showRefreshProp,
    refreshActions,
    lastUpdated,
    loading = false,
    error,
    density = 'comfortable',
    empty,
    actions: rawActions = [],
    kpis: rawKpis = [],
    primaryChart,
    activity: rawActivity = [],
    activityTitle = 'Recent activity',
    charts: rawCharts = [],
    table,
    verdict,
    currency,
    rows,
    measures,
    dimensions,
    x,
    split,
    compare,
    compareLabel,
    filters = $bindable(),
    onfilterschange,
    onfilter,
    onaction,
    onkpiclick,
    onactivityclick,
    ondateRangeChange,
    ondaterangechange,
    ongranularitychange,
    onactivityfilterchange,
    onrefresh
  }: Props = $props();

  // Rows mode starts at the `rows` key, even while it is still empty mid-stream.
  const rowsMode = $derived(rows !== undefined && rows !== null);
  // A refresh button with nothing to refresh is noise; rows mode leaves it off.
  const showRefresh = $derived(showRefreshProp ?? !rowsMode);

  const actions = $derived(safeArray<Action>(rawActions, { widget: 'exec-dashboard', key: 'actions' }));
  const kpis = $derived(safeArray<Kpi>(rawKpis, { widget: 'exec-dashboard', key: 'kpis' }));
  const activity = $derived(safeArray<ActivityItem>(rawActivity, { widget: 'exec-dashboard', key: 'activity' }));
  const charts = $derived(safeArray<ChartConfig>(rawCharts, { widget: 'exec-dashboard', key: 'charts' }));

  /**
   * Auto-derive activity filters from `activity[].category` when the user
   * doesn't supply an explicit `activityFilters` list. Always prepended with "All".
   */
  const effectiveActivityFilters = $derived.by<string[] | undefined>(() => {
    if (activityFilters && activityFilters.length > 0) return activityFilters;
    const cats = new Set<string>();
    for (const a of activity) if (a.category) cats.add(a.category);
    if (cats.size === 0) return undefined;
    return ['All', ...Array.from(cats)];
  });

  const hasAnyContent = $derived(
    kpis.length > 0 || !!primaryChart || activity.length > 0 || charts.length > 0 || !!table
  );

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
    const list = effectiveActivityFilters;
    if (list && list.length > 0 && (!activeActivityFilter || !list.includes(activeActivityFilter))) {
      activeActivityFilter = list[0];
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

  const STATUS_CLASS: Record<Status, string> = {
    normal: 'rdash-kpi-status-normal',
    success: 'rdash-kpi-status-success',
    warning: 'rdash-kpi-status-warning',
    critical: 'rdash-kpi-status-critical'
  };

  function trendArrow(t?: Trend): string {
    return t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  }
  function trendClass(t?: Trend): string {
    return t === 'up' ? 'text-emerald-600 dark:text-emerald-400'
      : t === 'down' ? 'text-rose-600 dark:text-rose-400'
      : 'text-muted-foreground';
  }
  // Hex, not oklch: the echarts sparkline appends a hex alpha ('…30') to its
  // colour, which turns an oklch() value into an unparsable gradient stop.
  function sparklineColor(t?: Trend): string {
    return t === 'down' ? '#d40924' : '#0072d5';
  }
  function clampProgress(p: number | undefined): number {
    if (typeof p !== 'number' || Number.isNaN(p)) return 0;
    return Math.max(0, Math.min(100, p));
  }

  /**
   * Build the ordered list of lookup keys for the current active state.
   * Most specific first: "range|granularity" → granularity → range.
   */
  function buildKeys(): string[] {
    const keys: string[] = [];
    if (range && gran) keys.push(`${range}|${gran}`);
    if (gran) keys.push(gran);
    if (range) keys.push(range);
    return keys;
  }

  function pickKeyed<T>(map: { [key: string]: T | undefined } | undefined, keys: string[]): T | undefined {
    if (!map) return undefined;
    for (const k of keys) {
      const v = map[k];
      if (v !== undefined) return v;
    }
    return undefined;
  }

  function firstDefined<T>(map: { [key: string]: T | undefined }): T | undefined {
    for (const v of Object.values(map)) if (v !== undefined) return v;
    return undefined;
  }

  function resolveChartData(data: ChartData | undefined, keys: string[]): DataPoint[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const match = pickKeyed(data, keys);
    if (match) return match;
    // Last-resort fallback: first declared dataset.
    const first = firstDefined(data);
    return Array.isArray(first) ? first : [];
  }

  function resolveTableRows(tableRows: TableRows | undefined, keys: string[]): Record<string, unknown>[] {
    if (!tableRows) return [];
    if (Array.isArray(tableRows)) return tableRows;
    const match = pickKeyed(tableRows, keys);
    if (match) return match;
    const first = firstDefined(tableRows);
    return Array.isArray(first) ? first : [];
  }

  function resolveKpi(k: Kpi, keys: string[]): Kpi {
    if (!k.byKey) return k;
    const override = pickKeyed(k.byKey, keys);
    if (!override) return k;
    return { ...k, ...override };
  }

  const keys = $derived(buildKeys());

  const resolvedKpis = $derived(kpis.map((k) => resolveKpi(k, keys)));
  const resolvedPrimaryData = $derived(primaryChart ? resolveChartData(primaryChart.data, keys) : []);
  const resolvedCharts = $derived(charts.map((c) => ({
    ...c,
    _data: resolveChartData(c.data, keys),
  })));
  const resolvedTableRows = $derived(table ? resolveTableRows(table.rows, keys) : []);

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

  // A visitor's chip pick wins until the spec sends a value other than the one
  // it overrode. When the bound filter changes, the host re-sends the spec with
  // its original props, and Svelte drops a local write to an unbound prop then,
  // so without this every chip would snap back.
  type Pick = { over: string | undefined; value: string } | null;
  let rangePick = $state<Pick>(null);
  let granPick = $state<Pick>(null);
  let actPick = $state<Pick>(null);
  const held = (p: Pick, incoming: string | undefined) => (p && p.over === incoming ? p.value : incoming);
  const range = $derived(held(rangePick, activeDateRange));
  const gran = $derived(held(granPick, activeGranularity));
  const actFilter = $derived(held(actPick, activeActivityFilter));

  function pickDateRange(r: string) {
    rangePick = { over: activeDateRange, value: r };
    activeDateRange = r;
    ondateRangeChange?.(r);
    ondaterangechange?.(r);
  }
  function pickFilter(key: string, value: string | undefined) {
    const next = readFilters(filters);
    if (value === undefined) delete next[key];
    else next[key] = value;
    filters = next;
    onfilterschange?.(next);
    onfilter?.({ key, value: value ?? null });
  }
  function pickGranularity(g: string) {
    granPick = { over: activeGranularity, value: g };
    activeGranularity = g;
    ongranularitychange?.(g);
  }
  function pickActivityFilter(f: string) {
    actPick = { over: activeActivityFilter, value: f };
    activeActivityFilter = f;
    onactivityfilterchange?.(f);
  }

  const visibleActivity = $derived.by(() => {
    const list = effectiveActivityFilters;
    if (!list || !actFilter) return activity;
    if (actFilter === list[0]) return activity; // first preset = "All"
    const f = actFilter.toLowerCase();
    if (f === 'alerts') {
      return activity.filter((a) => a.severity === 'warning' || a.severity === 'destructive');
    }
    if (f === 'unread') {
      return activity.filter((a) => a.unread);
    }
    // Otherwise, filter by category match (case-insensitive).
    return activity.filter((a) => (a.category ?? '').toLowerCase() === f);
  });

  const isClickableKpi = (k: Kpi) => Boolean(k.actions || (k.id && onkpiclick));
  const isClickableActivity = (a: ActivityItem) => Boolean(a.actions || (a.id && onactivityclick));
</script>

<div {id} class={cn('rdash', `rdash-density-${density}`, className)} style={styleString} data-widget="exec-dashboard">
  {#if rowsMode && !error}
    <ExecDashboardRows
      {title}
      {subtitle}
      {verdict}
      {currency}
      {rows}
      {measures}
      {dimensions}
      {x}
      {split}
      {compare}
      {compareLabel}
      tableTitle={table?.title}
      tableColumns={table?.columns}
      {filters}
      onpick={pickFilter}
    />
  {:else}
  {#if title || subtitle || dateRange || dateRanges || granularities || actions.length > 0 || showRefresh || lastUpdated}
    <header class="rdash-header">
      <div class="rdash-header-main">
        {#if title}<h1 class="rdash-title">{title}</h1>{/if}
        {#if subtitle}<p class="rdash-subtitle">{subtitle}</p>{/if}
      </div>
      <div class="rdash-header-tools">
        {#if dateRanges && dateRanges.length > 0}
          <div class="rdash-segmented rdash-scroll-x" role="tablist" aria-label="Date range">
            {#each dateRanges as r}
              <button
                type="button"
                role="tab"
                aria-selected={range === r}
                class={cn('rdash-seg-btn', range === r && 'rdash-seg-btn-active')}
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
          <div class="rdash-segmented rdash-scroll-x" role="tablist" aria-label="Granularity">
            {#each granularities as g}
              <button
                type="button"
                role="tab"
                aria-selected={gran === g}
                class={cn('rdash-seg-btn', gran === g && 'rdash-seg-btn-active')}
                onclick={() => pickGranularity(g)}
              >
                {g}
              </button>
            {/each}
          </div>
        {/if}
        {#if lastUpdated}
          <span class="rdash-updated" title="Last updated">
            <span class={cn('rdash-updated-dot', loading && 'rdash-updated-dot-pulse')} aria-hidden="true"></span>
            Updated {lastUpdated}
          </span>
        {/if}
        {#if showRefresh}
          <button
            type="button"
            class="rdash-icon-btn"
            aria-label="Refresh"
            title="Refresh"
            disabled={loading}
            onclick={handleRefresh}
          >
            <span class={cn('rdash-icon-spin-wrap', loading && 'rdash-spin')}>
              <Icon name="refresh-cw" size={14} />
            </span>
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

  <VerdictLine {verdict} />

  {#if error}
    <div class="rdash-error" role="alert">
      <div class="rdash-error-icon">
        <Icon name="alert-triangle" size={18} />
      </div>
      <div class="rdash-error-body">
        <div class="rdash-error-title">Couldn't load dashboard</div>
        <div class="rdash-error-msg">{error}</div>
      </div>
      {#if showRefresh || refreshActions || onrefresh}
        <button type="button" class="rdash-btn rdash-btn-outline" onclick={handleRefresh}>
          <Icon name="refresh-cw" size={13} />
          <span>Retry</span>
        </button>
      {/if}
    </div>
  {:else if loading && !hasAnyContent}
    <!-- Loading skeleton: only when there is no existing content to overlay -->
    <div class="rdash-kpis" aria-hidden="true">
      {#each Array(4) as _, i (i)}
        <div class="rdash-kpi rdash-skel">
          <div class="rdash-skel-line rdash-skel-line-sm"></div>
          <div class="rdash-skel-line rdash-skel-line-lg"></div>
          <div class="rdash-skel-line rdash-skel-line-md"></div>
        </div>
      {/each}
    </div>
    <div class="rdash-row rdash-row-2">
      <div class="rdash-card rdash-skel rdash-skel-block" style="height: 260px;"></div>
      <div class="rdash-card rdash-skel rdash-skel-block" style="height: 260px;"></div>
    </div>
  {:else if !hasAnyContent && empty}
    <div class="rdash-empty">
      <div class="rdash-empty-icon">
        <Icon name={empty.icon ?? 'inbox'} size={24} />
      </div>
      <div class="rdash-empty-title">{empty.title ?? 'No data to show'}</div>
      {#if empty.message}
        <div class="rdash-empty-msg">{empty.message}</div>
      {/if}
    </div>
  {:else}
    {#if resolvedKpis.length > 0}
      <div class="rdash-kpis">
        {#each resolvedKpis as k}
          {@const clickable = isClickableKpi(k)}
          {@const hasProgress = typeof k.progress === 'number'}
          <button
            type="button"
            class={cn(
              'rdash-kpi',
              clickable && 'rdash-kpi-clickable',
              k.status && STATUS_CLASS[k.status]
            )}
            onclick={clickable ? () => handleKpiClick(k) : undefined}
            tabindex={clickable ? 0 : -1}
            aria-label={clickable ? `${k.label}: ${k.value}` : undefined}
            disabled={!clickable}
          >
            <div class="rdash-kpi-label">
              {#if k.icon}<Icon name={k.icon} size={12} />{/if}
              <span class="rdash-truncate">{k.label}</span>
            </div>
            <div class="rdash-kpi-row">
              <div class="rdash-kpi-value-wrap">
                <span class="rdash-kpi-value" style={safeStyle(k.color ? `color:${k.color};` : undefined)}>
                  {k.value}
                </span>
                {#if k.unit}
                  <span class="rdash-kpi-unit">{k.unit}</span>
                {/if}
              </div>
              {#if k.sparkline && k.sparkline.length > 1}
                <div class="rdash-kpi-spark">
                  <Sparkline values={k.sparkline} color={k.color ?? sparklineColor(k.trend)} height={28} noTooltip />
                </div>
              {/if}
            </div>
            {#if k.delta || k.compareLabel || k.sublabel}
              <div class="rdash-kpi-meta">
                {#if k.delta}
                  <span class={cn('rdash-kpi-delta', trendClass(k.trend))}>
                    {trendArrow(k.trend)} {k.delta}
                  </span>
                {/if}
                {#if k.compareLabel}
                  <span class="rdash-kpi-sub rdash-truncate">{k.compareLabel}</span>
                {:else if k.sublabel}
                  <span class="rdash-kpi-sub rdash-truncate">{k.sublabel}</span>
                {/if}
              </div>
            {/if}
            {#if hasProgress}
              {@const p = clampProgress(k.progress)}
              <div class="rdash-kpi-progress" aria-hidden="true">
                <div class="rdash-kpi-progress-track">
                  <div class="rdash-kpi-progress-fill" style={safeStyle(`width: ${p}%;`)}></div>
                </div>
                <div class="rdash-kpi-progress-meta">
                  <span>{p.toFixed(0)}%</span>
                  {#if k.target !== undefined && k.target !== null && k.target !== ''}
                    <span class="rdash-kpi-target">of {k.target}</span>
                  {/if}
                </div>
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
            {#if resolvedPrimaryData.length > 0}
              <Chart
                data={resolvedPrimaryData}
                type={primaryChart.type ?? 'line'}
                height={primaryChart.height ?? 260}
                colors={primaryChart.colors}
              />
            {:else}
              <div class="rdash-section-empty" style={safeStyle(`height: ${primaryChart.height ?? 260}px;`)}>
                <Icon name="bar-chart-3" size={20} />
                <span>No chart data</span>
              </div>
            {/if}
          </div>
        {/if}
        {#if activity.length > 0}
          <aside class="rdash-card rdash-activity">
            <div class="rdash-card-head">
              <div class="rdash-card-title">{activityTitle}</div>
              {#if effectiveActivityFilters && effectiveActivityFilters.length > 0}
                <div class="rdash-pills rdash-scroll-x" role="tablist" aria-label="Activity filter">
                  {#each effectiveActivityFilters as f}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={actFilter === f}
                      class={cn('rdash-pill', actFilter === f && 'rdash-pill-active')}
                      onclick={() => pickActivityFilter(f)}
                    >
                      {f}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
            {#if visibleActivity.length === 0}
              <div class="rdash-section-empty rdash-section-empty-flat">
                <Icon name="check-circle" size={18} />
                <span>No matching activity.</span>
              </div>
            {:else}
              <ol class="rdash-activity-list">
                <!-- Keyed by id AND position: a streamed item can lack its id, or carry a half-written one equal to a finished id, and a duplicate key throws. -->
                {#each visibleActivity as a, i (`${a.id}:${i}`)}
                  {@const clickable = isClickableActivity(a)}
                  <li class={cn('rdash-activity-item', clickable && 'rdash-activity-item-clickable')}>
                    <button
                      type="button"
                      class={cn('rdash-activity-btn', a.unread && 'rdash-activity-btn-unread')}
                      onclick={clickable ? () => handleActivityClick(a) : undefined}
                      disabled={!clickable}
                      tabindex={clickable ? 0 : -1}
                    >
                      <span class={cn('rdash-activity-dot', a.severity ? SEV_DOT[a.severity] : 'bg-sky-500', a.unread && 'rdash-activity-dot-unread')}></span>
                      <div class="rdash-activity-body">
                        <div class="rdash-activity-row">
                          <span class="rdash-activity-label">
                            {#if a.icon}<Icon name={a.icon} size={11} />{/if}
                            {a.label}
                          </span>
                          <span class="rdash-activity-time">{a.time}</span>
                        </div>
                        {#if a.actor || a.category}
                          <div class="rdash-activity-meta">
                            {#if a.actor}
                              <span class="rdash-activity-actor">{a.actor}</span>
                            {/if}
                            {#if a.actor && a.category}<span class="rdash-activity-sep" aria-hidden="true">·</span>{/if}
                            {#if a.category}
                              <span class="rdash-activity-category">{a.category}</span>
                            {/if}
                          </div>
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

    {#if resolvedCharts.length > 0}
      <div class="rdash-charts">
        {#each resolvedCharts as c}
          <div class="rdash-card">
            {#if c.title}<div class="rdash-card-title">{c.title}</div>{/if}
            {#if c._data.length > 0}
              <Chart data={c._data} type={c.type ?? 'bar'} height={c.height ?? 180} colors={c.colors} />
            {:else}
              <div class="rdash-section-empty" style={safeStyle(`height: ${c.height ?? 180}px;`)}>
                <Icon name="bar-chart-3" size={18} />
                <span>No data</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if table}
      <div class="rdash-card">
        {#if table.title}<div class="rdash-card-title">{table.title}</div>{/if}
        {#if resolvedTableRows.length > 0}
          <div class="rdash-scroll-x rdash-table-wrap">
            <Table columns={table.columns ?? []} rows={resolvedTableRows} />
          </div>
        {:else}
          <div class="rdash-section-empty rdash-section-empty-flat">
            <Icon name="inbox" size={18} />
            <span>No rows to display</span>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
  {/if}
</div>

<style>
  .rdash {
    --rdash-accent: oklch(0.55 0.18 250);
    --rdash-success: oklch(0.62 0.18 150);
    --rdash-warning: oklch(0.72 0.17 75);
    --rdash-critical: oklch(0.6 0.22 25);
    --rdash-gap: 16px;
    --rdash-card-pad: 16px;
    --rdash-kpi-pad-y: 14px;
    --rdash-kpi-pad-x: 16px;
    --rdash-kpi-value-size: 26px;
    --rdash-kpi-min: 180px;
    display: flex;
    flex-direction: column;
    gap: var(--rdash-gap);
    width: 100%;
    /* Breakpoints below read the widget's own width, not the viewport. */
    container-type: inline-size;
  }
  .rdash-density-compact {
    --rdash-gap: 12px;
    --rdash-card-pad: 12px;
    --rdash-kpi-pad-y: 10px;
    --rdash-kpi-pad-x: 12px;
    --rdash-kpi-value-size: 22px;
    --rdash-kpi-min: 150px;
  }
  /* A container query cannot style the container itself, so the narrow
     sizes land on its children, which inherit them. */
  @container (max-width: 640px) {
    .rdash > :global(*) {
      --rdash-kpi-min: 150px;
      --rdash-kpi-value-size: 22px;
    }
  }

  .rdash-truncate {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rdash-scroll-x {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in oklab, var(--muted-foreground) 25%, transparent) transparent;
  }
  .rdash-scroll-x::-webkit-scrollbar { height: 6px; }
  .rdash-scroll-x::-webkit-scrollbar-thumb {
    background: color-mix(in oklab, var(--muted-foreground) 25%, transparent);
    border-radius: 3px;
  }

  /* Header */
  .rdash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .rdash-header-main { flex: 1 1 220px; min-width: 0; }
  .rdash-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  .rdash-density-compact .rdash-title { font-size: 18px; }
  .rdash-subtitle {
    font-size: 13px;
    color: var(--muted-foreground);
    margin: 4px 0 0;
    line-height: 1.4;
  }
  .rdash-header-tools {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    max-width: 100%;
  }
  @container (max-width: 640px) {
    .rdash-header-tools {
      width: 100%;
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .rdash-header-tools::-webkit-scrollbar { display: none; }
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
    white-space: nowrap;
  }
  .rdash-updated {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    color: var(--muted-foreground);
    white-space: nowrap;
    padding: 0 4px;
    font-variant-numeric: tabular-nums;
  }
  .rdash-updated-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--rdash-success);
    display: inline-block;
  }
  .rdash-updated-dot-pulse {
    background: var(--rdash-accent);
    animation: rdash-pulse 1.4s ease-in-out infinite;
  }
  @keyframes rdash-pulse {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }
  .rdash-icon-spin-wrap { display: inline-flex; }
  .rdash-spin { animation: rdash-spin 0.9s linear infinite; }
  @keyframes rdash-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .rdash-spin { animation: none; }
  }

  /* Buttons */
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
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .rdash-btn:focus-visible {
    outline: 2px solid var(--rdash-accent);
    outline-offset: 1px;
  }
  .rdash-btn-primary { background: var(--rdash-accent); color: white; }
  .rdash-btn-primary:hover { background: color-mix(in oklab, var(--rdash-accent) 88%, black); }
  .rdash-btn-outline { background: transparent; color: var(--foreground); border: 1px solid var(--border); }
  .rdash-btn-outline:hover { background: var(--muted); border-color: color-mix(in oklab, var(--border) 60%, var(--foreground)); }
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
    flex-shrink: 0;
  }
  .rdash-icon-btn:hover:not(:disabled) {
    background: var(--muted);
    color: var(--foreground);
  }
  .rdash-icon-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .rdash-icon-btn:focus-visible {
    outline: 2px solid var(--rdash-accent);
    outline-offset: 1px;
  }

  /* Segmented controls */
  .rdash-segmented {
    display: inline-flex;
    background: var(--muted);
    border-radius: 8px;
    padding: 2px;
    gap: 0;
    flex-shrink: 0;
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
    white-space: nowrap;
  }
  .rdash-seg-btn:hover { color: var(--foreground); }
  .rdash-seg-btn-active {
    background: var(--card);
    color: var(--foreground);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  /* KPI grid */
  .rdash-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(var(--rdash-kpi-min), 1fr));
    gap: 12px;
  }
  .rdash-kpi {
    position: relative;
    padding: var(--rdash-kpi-pad-y) var(--rdash-kpi-pad-x);
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
    overflow: hidden;
  }
  .rdash-kpi:disabled { cursor: default; }
  .rdash-kpi-clickable { cursor: pointer; }
  .rdash-kpi-clickable:hover {
    border-color: color-mix(in oklab, var(--rdash-accent) 35%, var(--border));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }
  .rdash-kpi-clickable:focus-visible {
    outline: 2px solid var(--rdash-accent);
    outline-offset: 1px;
  }

  /* Status band — 3px left edge */
  .rdash-kpi::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: transparent;
    transition: background 0.15s;
  }
  .rdash-kpi-status-success::before { background: var(--rdash-success); }
  .rdash-kpi-status-warning::before { background: var(--rdash-warning); }
  .rdash-kpi-status-critical::before { background: var(--rdash-critical); }
  .rdash-kpi-status-critical {
    background: color-mix(in oklab, var(--rdash-critical) 4%, var(--card));
  }

  .rdash-kpi-arrow {
    position: absolute;
    top: 10px;
    right: 10px;
    color: var(--muted-foreground);
    opacity: 0;
    transition: opacity 0.15s, color 0.15s, transform 0.15s;
    display: inline-flex;
  }
  .rdash-kpi-clickable:hover .rdash-kpi-arrow,
  .rdash-kpi-clickable:focus-visible .rdash-kpi-arrow {
    opacity: 1;
    color: var(--rdash-accent);
    transform: translate(1px, -1px);
  }
  .rdash-kpi-label {
    font-size: 12px;
    color: var(--muted-foreground);
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    /* Keep room for the hover arrow */
    padding-right: 20px;
  }
  .rdash-kpi-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }
  .rdash-kpi-value-wrap {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    min-width: 0;
  }
  .rdash-kpi-value {
    font-size: var(--rdash-kpi-value-size);
    font-weight: 600;
    line-height: 1.05;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rdash-kpi-unit {
    font-size: 13px;
    font-weight: 500;
    color: var(--muted-foreground);
  }
  .rdash-kpi-spark {
    width: 72px;
    flex-shrink: 0;
  }
  @container (max-width: 480px) {
    .rdash-kpi-spark { width: 60px; }
  }
  .rdash-kpi-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    min-width: 0;
  }
  .rdash-kpi-delta { font-weight: 500; flex-shrink: 0; }
  .rdash-kpi-sub { color: var(--muted-foreground); min-width: 0; }

  .rdash-kpi-progress {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rdash-kpi-progress-track {
    height: 4px;
    border-radius: 999px;
    background: color-mix(in oklab, var(--muted-foreground) 12%, transparent);
    overflow: hidden;
  }
  .rdash-kpi-progress-fill {
    height: 100%;
    background: var(--rdash-accent);
    border-radius: inherit;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .rdash-kpi-status-success .rdash-kpi-progress-fill { background: var(--rdash-success); }
  .rdash-kpi-status-warning .rdash-kpi-progress-fill { background: var(--rdash-warning); }
  .rdash-kpi-status-critical .rdash-kpi-progress-fill { background: var(--rdash-critical); }
  .rdash-kpi-progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
  .rdash-kpi-target { color: var(--muted-foreground); }

  /* Row layouts */
  .rdash-row {
    display: grid;
    gap: var(--rdash-gap);
  }
  .rdash-row-1 { grid-template-columns: 1fr; }
  .rdash-row-2 { grid-template-columns: 1fr; }
  @container (min-width: 920px) {
    .rdash-row-2 { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  }

  .rdash-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--rdash-gap);
  }

  /* Cards */
  .rdash-card {
    padding: var(--rdash-card-pad);
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .rdash-card-title {
    font-size: 12px;
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
    min-width: 0;
  }

  .rdash-pills {
    display: inline-flex;
    gap: 4px;
    min-width: 0;
    max-width: 100%;
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
    white-space: nowrap;
    flex-shrink: 0;
  }
  .rdash-pill:hover { color: var(--foreground); background: var(--muted); }
  .rdash-pill-active {
    background: color-mix(in oklab, var(--rdash-accent) 14%, transparent);
    color: var(--rdash-accent);
    border-color: color-mix(in oklab, var(--rdash-accent) 30%, transparent);
  }

  /* Activity */
  .rdash-activity {
    max-height: 380px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in oklab, var(--muted-foreground) 25%, transparent) transparent;
  }
  .rdash-activity::-webkit-scrollbar { width: 6px; }
  .rdash-activity::-webkit-scrollbar-thumb {
    background: color-mix(in oklab, var(--muted-foreground) 25%, transparent);
    border-radius: 3px;
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
    outline: 2px solid var(--rdash-accent);
    outline-offset: 1px;
  }
  .rdash-activity-btn-unread .rdash-activity-label {
    font-weight: 600;
  }
  .rdash-activity-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
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
    box-shadow: 0 0 0 0 transparent;
    transition: box-shadow 0.15s;
  }
  .rdash-activity-dot-unread {
    box-shadow: 0 0 0 3px color-mix(in oklab, currentColor 18%, transparent);
  }
  .rdash-activity-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .rdash-activity-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
  }
  .rdash-activity-label {
    font-size: 13px;
    color: var(--foreground);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rdash-activity-time {
    font-size: 11px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .rdash-activity-meta {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    color: var(--muted-foreground);
    min-width: 0;
  }
  .rdash-activity-actor { white-space: nowrap; }
  .rdash-activity-category {
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--muted);
    color: var(--foreground);
    font-size: 10.5px;
    font-weight: 500;
    white-space: nowrap;
  }
  .rdash-activity-sep { color: var(--muted-foreground); }

  /* Error state */
  .rdash-error {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid color-mix(in oklab, var(--rdash-critical) 30%, var(--border));
    background: color-mix(in oklab, var(--rdash-critical) 6%, var(--card));
    flex-wrap: wrap;
  }
  .rdash-error-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: color-mix(in oklab, var(--rdash-critical) 14%, transparent);
    color: var(--rdash-critical);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .rdash-error-body { flex: 1; min-width: 200px; }
  .rdash-error-title { font-weight: 600; font-size: 14px; color: var(--foreground); }
  .rdash-error-msg { font-size: 12.5px; color: var(--muted-foreground); margin-top: 2px; }

  /* Empty states */
  .rdash-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 48px 16px;
    border-radius: 12px;
    border: 1px dashed var(--border);
    background: color-mix(in oklab, var(--muted) 40%, transparent);
    color: var(--muted-foreground);
    text-align: center;
  }
  .rdash-empty-icon {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: var(--muted);
    color: var(--muted-foreground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .rdash-empty-title { font-size: 14px; font-weight: 600; color: var(--foreground); }
  .rdash-empty-msg { font-size: 12.5px; }

  .rdash-section-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--muted-foreground);
    font-size: 12px;
  }
  .rdash-section-empty-flat { padding: 18px 0; }

  /* Skeleton */
  .rdash-skel {
    pointer-events: none;
  }
  .rdash-skel-block {
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--muted-foreground) 8%, var(--card)) 0%,
      color-mix(in oklab, var(--muted-foreground) 14%, var(--card)) 50%,
      color-mix(in oklab, var(--muted-foreground) 8%, var(--card)) 100%
    );
    background-size: 200% 100%;
    animation: rdash-shimmer 1.4s ease-in-out infinite;
  }
  .rdash-skel-line {
    height: 10px;
    border-radius: 4px;
    background: linear-gradient(90deg,
      color-mix(in oklab, var(--muted-foreground) 10%, transparent) 0%,
      color-mix(in oklab, var(--muted-foreground) 22%, transparent) 50%,
      color-mix(in oklab, var(--muted-foreground) 10%, transparent) 100%
    );
    background-size: 200% 100%;
    animation: rdash-shimmer 1.4s ease-in-out infinite;
  }
  .rdash-skel-line-sm { width: 40%; height: 9px; }
  .rdash-skel-line-md { width: 60%; }
  .rdash-skel-line-lg { width: 75%; height: 22px; }
  @keyframes rdash-shimmer {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }

  .rdash-table-wrap {
    /* Allow long tables to scroll horizontally rather than overflow card */
    width: 100%;
  }
</style>
