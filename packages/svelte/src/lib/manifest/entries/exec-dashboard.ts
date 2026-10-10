// manifest/entries/exec-dashboard.ts — the concierge's view of exec-dashboard
// (design doc 2026-10-09 §3.10). Rows mode leads: the model writes raw rows and
// says which measures and dimensions to show; the widget computes every
// number. `filters` is the one bindable field; `on_filter` and
// `on_date_range_change` are node-level, under `events`. The prebuilt KPI
// props stay documented for specs that already use them.
import type { WidgetManifestEntry } from '../index.js';

export const execDashboardEntry: WidgetManifestEntry = {
  type: 'exec-dashboard',
  category: 'composite',
  description:
    'KPI dashboard from raw rows: give rows, measures {key,label,format,agg}, dimensions {key,label}, x and split; it computes KPIs, trends, a chart, a breakdown and a filtered table with totals.',
  props: {
    verdict: {
      type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }',
      required: false,
      description: 'The answer up front, at most 140 chars, e.g. "September was the best month; East leads on revenue."',
    },
    currency: { type: 'string', required: false, description: 'ISO 4217 code for money measures. Default "USD". Never put a symbol in the data.' },
    rows: {
      type: 'Array<Record<string, string | number>>',
      required: false,
      description: 'Rows mode: the raw records, one per order/event, e.g. { id, date: "2026-07-14", region, channel, amount }. Numbers as numbers. Every KPI, chart bar, breakdown and total is computed from these.',
    },
    measures: {
      type: 'Array<{ key?: string; label: string; format?: "money" | "number" | "percent"; agg?: "sum" | "avg" | "count"; good?: "up" | "down" }>',
      required: false,
      description: 'One KPI each, in order; the first also drives the chart and breakdown. `agg` defaults to sum (count needs no key). `percent` values are 0 to 100. `good` says which way is good (default up).',
    },
    dimensions: {
      type: 'Array<{ key: string; label: string }>',
      required: false,
      description: 'Filter chip rows (e.g. region). A pick recomputes every number; the breakdown shows the first dimension not filtered.',
    },
    x: { type: 'string', required: false, description: 'The column the chart runs along. ISO dates group by day (span up to 31 days) or by month; other values group as written.' },
    split: { type: 'string', required: false, description: 'A column to stack the chart by (e.g. channel), one colour per value; past five values the rest fold into Other.' },
    compare: { type: 'Array<Record<string, string | number>>', required: false, description: 'The previous period\'s rows, for KPI trends. Without it, trends compare the last x group with the one before.' },
    compareLabel: { type: 'string', required: false, description: 'Trend wording when `compare` is given, e.g. "vs Q2". Default "vs previous period".' },
    filters: {
      type: 'Record<string, string>',
      required: false,
      description: 'The active filter per dimension, e.g. { region: "West" }. Use top-level `bind` to keep it in state (e.g. `bind: "salesFilter"`).',
    },
    title: { type: 'string', required: false, description: 'Page title.' },
    subtitle: { type: 'string', required: false, description: 'Page subtitle / description.' },
    dateRange: { type: 'string', required: false, description: 'Static date-range chip (used when `dateRanges` is not provided).' },
    dateRanges: { type: 'string[]', required: false, description: 'Preset date-range chips (e.g. ["Today","7d","30d","90d","YTD"]). Renders a segmented control.' },
    activeDateRange: { type: 'string', required: false, description: 'Active date-range chip. Defaults to the first item.' },
    granularities: { type: 'string[]', required: false, description: 'Optional granularity toggle (e.g. ["Day","Week","Month"]).' },
    activeGranularity: { type: 'string', required: false, description: 'Two-way bindable.' },
    activityFilters: { type: 'string[]', required: false, description: 'Activity-rail filter pills (first item is treated as "all"). If omitted but items have `category`, filters are auto-derived.' },
    activeActivityFilter: { type: 'string', required: false, description: 'Two-way bindable.' },
    showRefresh: { type: 'boolean', required: false, description: 'KPI mode refresh button. Default true in KPI mode, false in rows mode.' },
    refreshActions: { type: 'EventAction | EventAction[]', required: false, description: 'Actions dispatched when refresh is clicked.' },
    lastUpdated: { type: 'string', required: false, description: 'Human-readable timestamp shown near the refresh button (e.g. "2m ago"). Pulses while `loading`.' },
    loading: { type: 'boolean', required: false, description: 'When true and there is no existing content, renders animated skeletons. When content is present, only the refresh icon spins.' },
    error: { type: 'string', required: false, description: 'When set, renders an inline error block with optional retry CTA in place of dashboard content.' },
    density: { type: '"comfortable" | "compact"', required: false, description: 'Padding/typography preset. Default "comfortable". Use "compact" for dense ops/finance dashboards.' },
    empty: { type: '{ title?: string; message?: string; icon?: string }', required: false, description: 'Shown when there is no KPI / chart / activity / table data and no error.' },
    actions: { type: 'Array<{ id?: string; label: string; icon?: string; variant?: "default" | "outline" | "ghost"; actions?: EventAction | EventAction[] }>', required: false, description: 'Header action buttons.' },
    kpis: { type: 'Array<{ id?: string; label: string; value: string | number; unit?: string; delta?: string; trend?: "up" | "down" | "flat"; compareLabel?: string; sparkline?: number[]; color?: string; icon?: string; sublabel?: string; status?: "normal" | "success" | "warning" | "critical"; target?: string | number; progress?: number; byKey?: Record<string, KpiOverride>; actions?: EventAction | EventAction[] }>', required: false, description: 'KPI tiles. `status` paints a left-edge band; `progress` (0-100) renders a thin progress bar (optionally with `target`). `byKey` swaps fields (value/delta/trend/sparkline/...) when activeDateRange / activeGranularity changes. Keys may be the range, the granularity, or "<range>|<granularity>" (most specific wins). When `actions` (or `id` + a host `onkpiclick`) is set, the tile becomes clickable for drill-through.' },
    primaryChart: { type: '{ title?: string; type?: "bar" | "line" | "area" | "pie" | "donut" | "radar" | "heatmap"; data: DataPoint[] | Record<string, DataPoint[]>; height?: number; colors?: string[] }', required: false, description: 'Hero chart (left, 2/3 width when activity rail is present). `data` may be a flat array, or a record keyed by range/granularity/"<range>|<granularity>"; the component picks the most specific match for the active state.' },
    activity: { type: 'Array<{ id?: string; time: string; label: string; actor?: string; icon?: string; severity?: "info" | "success" | "warning" | "destructive"; category?: string; unread?: boolean; actions?: EventAction | EventAction[] }>', required: false, description: 'Right-rail activity feed. `unread` highlights the item. `category` is surfaced as auto-derived filters when `activityFilters` is omitted. Per-item `actions` makes the item clickable.' },
    activityTitle: { type: 'string', required: false, description: 'Activity rail heading. Default "Recent activity".' },
    charts: { type: 'Array<ChartConfig>', required: false, description: 'Secondary chart row (auto-fit grid). Each `data` may be keyed the same way as `primaryChart.data`.' },
    table: { type: '{ title?: string; columns?: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>; rows?: Record<string, unknown>[] | Record<string, Record<string, unknown>[]> }', required: false, description: 'Rows mode: `title` and optional `columns` for the filtered rows table. KPI mode: a table footer whose `rows` may be keyed by range/granularity.' },
  },
  events: {
    on_filter: {
      type: 'EventAction | EventAction[]',
      required: false,
      description: 'Rows mode. Fires with { key, value } when a filter chip is picked (value null for All).',
    },
    on_date_range_change: {
      type: 'EventAction | EventAction[]',
      required: false,
      description: 'KPI mode. Fires with the picked date-range chip, e.g. "30d".',
    },
  },
  example: {
    type: 'exec-dashboard',
    bind: 'salesFilter',
    props: {
      title: 'Fernleaf Ceramics, Q3 sales',
      subtitle: 'Online orders, July to September',
      verdict: { text: 'September was the best month; East leads on revenue.', status: 'good' },
      currency: 'USD',
      x: 'date',
      split: 'channel',
      measures: [
        { key: 'amount', label: 'Revenue', format: 'money' },
        { label: 'Orders', agg: 'count' },
        { key: 'amount', label: 'Avg order', format: 'money', agg: 'avg' },
        { key: 'items', label: 'Items sold' },
      ],
      dimensions: [{ key: 'region', label: 'Region' }],
      table: { title: 'Orders' },
      rows: [
        { id: 'FL-1041', date: '2026-07-01', region: 'West', channel: 'Marketplace', items: 3, amount: 133.38 },
        { id: 'FL-1046', date: '2026-07-09', region: 'East', channel: 'Web', items: 2, amount: 98.4 },
        { id: 'FL-1050', date: '2026-07-18', region: 'North', channel: 'Social', items: 1, amount: 42.5 },
        { id: 'FL-1055', date: '2026-07-27', region: 'South', channel: 'Web', items: 2, amount: 87.1 },
        { id: 'FL-1061', date: '2026-08-04', region: 'East', channel: 'Web', items: 3, amount: 151.2 },
        { id: 'FL-1066', date: '2026-08-12', region: 'West', channel: 'Social', items: 1, amount: 38.9 },
        { id: 'FL-1070', date: '2026-08-19', region: 'South', channel: 'Marketplace', items: 2, amount: 76.0 },
        { id: 'FL-1074', date: '2026-08-28', region: 'North', channel: 'Web', items: 2, amount: 104.75 },
        { id: 'FL-1081', date: '2026-09-03', region: 'East', channel: 'Web', items: 4, amount: 212.6 },
        { id: 'FL-1086', date: '2026-09-11', region: 'West', channel: 'Web', items: 2, amount: 95.3 },
        { id: 'FL-1090', date: '2026-09-17', region: 'East', channel: 'Social', items: 1, amount: 49.0 },
        { id: 'FL-1095', date: '2026-09-22', region: 'South', channel: 'Web', items: 3, amount: 139.45 },
        { id: 'FL-1099', date: '2026-09-29', region: 'North', channel: 'Marketplace', items: 2, amount: 88.2 },
      ],
    },
  },
};
