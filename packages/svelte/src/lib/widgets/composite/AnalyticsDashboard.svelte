<!--
  @file AnalyticsDashboard.svelte
  @description Analytics archetype: headline hero metric with period
  comparison → dominant time-series chart → breakdown row of small charts
  (by source/device/region/etc.) → top items table.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import Chart from '$lib/widgets/data/Chart.svelte';
  import Sparkline from '$lib/widgets/data/Sparkline.svelte';
  import Table from '$lib/widgets/data/Table.svelte';

  type Trend = 'up' | 'down' | 'flat';
  type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'radar' | 'heatmap';

  interface DataPoint {
    label: string;
    value?: number;
    series?: Record<string, number>;
    [key: string]: unknown;
  }

  interface Headline {
    label: string;
    value: string | number;
    delta?: string;
    trend?: Trend;
    comparison?: string;
    sparkline?: number[];
  }

  interface SecondaryMetric {
    label: string;
    value: string | number;
    delta?: string;
    trend?: Trend;
    sublabel?: string;
  }

  interface ChartConfig {
    title?: string;
    subtitle?: string;
    type?: ChartType;
    data: DataPoint[];
    height?: number;
    colors?: string[];
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
    dateRange?: string;
    /** The "big number" hero — center stage. */
    headline?: Headline;
    /** Smaller metric cards next to the headline. */
    secondaryMetrics?: SecondaryMetric[];
    primaryChart?: ChartConfig;
    breakdowns?: ChartConfig[];
    topItems?: TableConfig;
  }

  let {
    id,
    class: className,
    style,
    title,
    subtitle,
    dateRange,
    headline,
    secondaryMetrics = [],
    primaryChart,
    breakdowns = [],
    topItems
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function trendArrow(t?: Trend): string {
    return t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  }
  function trendClass(t?: Trend): string {
    return t === 'up' ? 'text-emerald-600 dark:text-emerald-400'
      : t === 'down' ? 'text-rose-600 dark:text-rose-400'
      : 'text-muted-foreground';
  }
  function sparkColor(t?: Trend): string {
    return t === 'down' ? 'oklch(0.55 0.22 25)' : 'oklch(0.55 0.18 250)';
  }
</script>

<div {id} class={cn('ranal', className)} style={styleString}>
  {#if title || subtitle || dateRange}
    <header class="ranal-header">
      <div>
        {#if title}<h1 class="ranal-title">{title}</h1>{/if}
        {#if subtitle}<p class="ranal-subtitle">{subtitle}</p>{/if}
      </div>
      {#if dateRange}
        <span class="ranal-range">
          <Icon name="calendar" size={12} />
          {dateRange}
        </span>
      {/if}
    </header>
  {/if}

  {#if headline || secondaryMetrics.length > 0}
    <div class={cn('ranal-hero-row', secondaryMetrics.length > 0 && headline ? 'ranal-hero-with-side' : '')}>
      {#if headline}
        <div class="ranal-hero">
          <div class="ranal-hero-label">{headline.label}</div>
          <div class="ranal-hero-row-inline">
            <div class="ranal-hero-value">{headline.value}</div>
            {#if headline.sparkline && headline.sparkline.length > 1}
              <div class="ranal-hero-spark">
                <Sparkline values={headline.sparkline} color={sparkColor(headline.trend)} height={48} noTooltip />
              </div>
            {/if}
          </div>
          {#if headline.delta || headline.comparison}
            <div class="ranal-hero-meta">
              {#if headline.delta}
                <span class={cn('ranal-hero-delta', trendClass(headline.trend))}>{trendArrow(headline.trend)} {headline.delta}</span>
              {/if}
              {#if headline.comparison}
                <span class="ranal-hero-compare">{headline.comparison}</span>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
      {#if secondaryMetrics.length > 0}
        <div class="ranal-secondaries">
          {#each secondaryMetrics as m}
            <div class="ranal-secondary">
              <div class="ranal-secondary-label">{m.label}</div>
              <div class="ranal-secondary-value">{m.value}</div>
              {#if m.delta || m.sublabel}
                <div class="ranal-secondary-meta">
                  {#if m.delta}<span class={trendClass(m.trend)}>{trendArrow(m.trend)} {m.delta}</span>{/if}
                  {#if m.sublabel}<span class="ranal-secondary-sub">{m.sublabel}</span>{/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if primaryChart}
    <div class="ranal-card">
      {#if primaryChart.title || primaryChart.subtitle}
        <div class="ranal-card-head">
          <div>
            {#if primaryChart.title}<div class="ranal-card-title">{primaryChart.title}</div>{/if}
            {#if primaryChart.subtitle}<div class="ranal-card-sub">{primaryChart.subtitle}</div>{/if}
          </div>
        </div>
      {/if}
      <Chart
        data={primaryChart.data}
        type={primaryChart.type ?? 'area'}
        height={primaryChart.height ?? 300}
        colors={primaryChart.colors}
      />
    </div>
  {/if}

  {#if breakdowns.length > 0}
    <div class="ranal-breakdowns">
      {#each breakdowns as b}
        <div class="ranal-card">
          {#if b.title || b.subtitle}
            <div class="ranal-card-head">
              <div>
                {#if b.title}<div class="ranal-card-title">{b.title}</div>{/if}
                {#if b.subtitle}<div class="ranal-card-sub">{b.subtitle}</div>{/if}
              </div>
            </div>
          {/if}
          <Chart data={b.data} type={b.type ?? 'donut'} height={b.height ?? 200} colors={b.colors} />
        </div>
      {/each}
    </div>
  {/if}

  {#if topItems}
    <div class="ranal-card">
      {#if topItems.title}<div class="ranal-card-title">{topItems.title}</div>{/if}
      <Table columns={topItems.columns} rows={topItems.rows} />
    </div>
  {/if}
</div>

<style>
  .ranal {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .ranal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .ranal-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .ranal-subtitle {
    font-size: 13px;
    color: var(--muted-foreground);
    margin: 4px 0 0;
  }
  .ranal-range {
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

  .ranal-hero-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  @media (min-width: 720px) {
    .ranal-hero-with-side {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    }
  }

  .ranal-hero {
    padding: 24px 28px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: linear-gradient(180deg, color-mix(in oklab, oklch(0.55 0.18 250) 6%, var(--card)) 0%, var(--card) 100%);
  }
  .ranal-hero-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .ranal-hero-row-inline {
    display: flex;
    align-items: flex-end;
    gap: 14px;
    margin-top: 6px;
  }
  .ranal-hero-value {
    font-size: 44px;
    font-weight: 700;
    line-height: 1;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }
  .ranal-hero-spark {
    flex: 1;
    min-width: 100px;
    margin-bottom: 6px;
  }
  .ranal-hero-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
    font-size: 12.5px;
  }
  .ranal-hero-delta { font-weight: 600; }
  .ranal-hero-compare { color: var(--muted-foreground); }

  .ranal-secondaries {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
  }
  .ranal-secondary {
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ranal-secondary-label {
    font-size: 11.5px;
    color: var(--muted-foreground);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ranal-secondary-value {
    font-size: 22px;
    font-weight: 600;
    line-height: 1;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .ranal-secondary-meta {
    display: flex;
    gap: 6px;
    font-size: 11.5px;
    align-items: center;
  }
  .ranal-secondary-sub { color: var(--muted-foreground); }

  .ranal-card {
    padding: 16px 18px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .ranal-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .ranal-card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--foreground);
  }
  .ranal-card-sub {
    font-size: 12px;
    color: var(--muted-foreground);
    margin-top: 2px;
  }

  .ranal-breakdowns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
</style>
