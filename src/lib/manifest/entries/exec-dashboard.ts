import type { WidgetManifestEntry } from '../index.js';

export const execDashboardEntry: WidgetManifestEntry = {
  type: 'exec-dashboard',
  category: 'composite',
  description: 'Executive dashboard with KPI strip (status bands, progress to target, sparklines), primary chart + activity rail, and data-table footer. Supports loading/error/empty states, density toggle, lastUpdated indicator, date-range chips, granularity toggle, refresh, and clickable KPIs/activity items for drill-through.',
  props: {
    title: { type: 'string', required: false, description: 'Page title.' },
    subtitle: { type: 'string', required: false, description: 'Page subtitle / description.' },
    dateRange: { type: 'string', required: false, description: 'Static date-range chip (used when `dateRanges` is not provided).' },
    dateRanges: { type: 'string[]', required: false, description: 'Preset date-range chips (e.g. ["Today","7d","30d","90d","YTD"]). Renders a segmented control.' },
    activeDateRange: { type: 'string', required: false, description: 'Two-way bindable. Defaults to first item.' },
    granularities: { type: 'string[]', required: false, description: 'Optional granularity toggle (e.g. ["Day","Week","Month"]).' },
    activeGranularity: { type: 'string', required: false, description: 'Two-way bindable.' },
    activityFilters: { type: 'string[]', required: false, description: 'Activity-rail filter pills (first item is treated as "all"). If omitted but items have `category`, filters are auto-derived.' },
    activeActivityFilter: { type: 'string', required: false, description: 'Two-way bindable.' },
    showRefresh: { type: 'boolean', required: false, description: 'Show built-in refresh button. Default true.' },
    refreshActions: { type: 'EventAction | EventAction[]', required: false, description: 'Actions dispatched when refresh is clicked.' },
    lastUpdated: { type: 'string', required: false, description: 'Human-readable timestamp shown near the refresh button (e.g. "2m ago"). Pulses while `loading`.' },
    loading: { type: 'boolean', required: false, description: 'When true and there is no existing content, renders animated skeletons. When content is present, only the refresh icon spins.' },
    error: { type: 'string', required: false, description: 'When set, renders an inline error block with optional retry CTA in place of dashboard content.' },
    density: { type: '"comfortable" | "compact"', required: false, description: 'Padding/typography preset. Default "comfortable". Use "compact" for dense ops/finance dashboards.' },
    empty: { type: '{ title?: string; message?: string; icon?: string }', required: false, description: 'Shown when there is no KPI / chart / activity / table data and no error.' },
    actions: { type: 'Array<{ id?: string; label: string; icon?: string; variant?: "default" | "outline" | "ghost"; actions?: EventAction | EventAction[] }>', required: false, description: 'Header action buttons.' },
    kpis: { type: 'Array<{ id?: string; label: string; value: string | number; unit?: string; delta?: string; trend?: "up" | "down" | "flat"; compareLabel?: string; sparkline?: number[]; color?: string; icon?: string; sublabel?: string; status?: "normal" | "success" | "warning" | "critical"; target?: string | number; progress?: number; byKey?: Record<string, KpiOverride>; actions?: EventAction | EventAction[] }>', required: false, description: 'KPI tiles. `status` paints a left-edge band; `progress` (0-100) renders a thin progress bar (optionally with `target`). `byKey` swaps fields (value/delta/trend/sparkline/...) when activeDateRange / activeGranularity changes — keys may be the range, the granularity, or "<range>|<granularity>" (most specific wins). When `actions` (or `id` + a host `onkpiclick`) is set, the tile becomes clickable for drill-through.' },
    primaryChart: { type: '{ title?: string; type?: "bar" | "line" | "area" | "pie" | "donut" | "radar" | "heatmap"; data: DataPoint[] | Record<string, DataPoint[]>; height?: number; colors?: string[] }', required: false, description: 'Hero chart (left, 2/3 width when activity rail is present). `data` may be a flat array, or a record keyed by range/granularity/"<range>|<granularity>" — the component picks the most specific match for the active state.' },
    activity: { type: 'Array<{ id?: string; time: string; label: string; actor?: string; icon?: string; severity?: "info" | "success" | "warning" | "destructive"; category?: string; unread?: boolean; actions?: EventAction | EventAction[] }>', required: false, description: 'Right-rail activity feed. `unread` highlights the item. `category` is surfaced as auto-derived filters when `activityFilters` is omitted. Per-item `actions` makes the item clickable.' },
    activityTitle: { type: 'string', required: false, description: 'Activity rail heading. Default "Recent activity".' },
    charts: { type: 'Array<ChartConfig>', required: false, description: 'Secondary chart row (auto-fit grid). Each `data` may be keyed the same way as `primaryChart.data`.' },
    table: { type: '{ title?: string; columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>; rows: Record<string, unknown>[] | Record<string, Record<string, unknown>[]> }', required: false, description: 'Data table footer. `rows` may be a flat list or keyed by range/granularity. Horizontally scrolls on narrow screens.' },
  },
  example: {
    type: 'exec-dashboard',
    bind: 'activeDateRange',
    props: {
      title: 'Q2 performance',
      subtitle: 'Cross-team metrics — flip the range or granularity to swap data',
      dateRanges: ['Today', '7d', '30d', '90d', 'QTD', 'YTD'],
      granularities: ['Day', 'Week', 'Month'],
      lastUpdated: '2m ago',
      refreshActions: [{ action: 'toast', message: 'Refreshed', variant: 'info' }],
      actions: [
        { id: 'export', label: 'Export', icon: 'download', variant: 'outline',
          actions: [{ action: 'toast', message: 'Exporting…', variant: 'info' }] },
        { id: 'share',  label: 'Share',  icon: 'share-2', variant: 'default',
          actions: [{ action: 'toast', message: 'Share link copied', variant: 'success' }] }
      ],

      // 6 KPIs. `byKey` swaps fields when activeDateRange / activeGranularity flip —
      // keys may be the range, the granularity, or "<range>|<granularity>".
      kpis: [
        {
          id: 'mrr', label: 'Revenue', icon: 'dollar-sign', status: 'success', target: '$3.0M',
          value: '$2.4M', delta: '+18%', trend: 'up', compareLabel: 'vs last month', progress: 80,
          sparkline: [22, 25, 30, 28, 36, 40, 48],
          byKey: {
            Today: { value: '$24k',  delta: '+9%',  sparkline: [3, 4, 3, 5, 4, 6, 7], progress: 8 },
            '7d':  { value: '$182k', delta: '+6%',  sparkline: [22, 24, 23, 26, 28, 27, 29], progress: 55 },
            '30d': { value: '$780k', delta: '+11%', sparkline: [60, 65, 72, 70, 78, 84, 90], progress: 68 },
            '90d': { value: '$2.4M', delta: '+18%', sparkline: [180, 210, 230, 250, 270, 300, 340], progress: 80 },
            QTD:   { value: '$2.4M', delta: '+18%', compareLabel: 'vs last quarter', progress: 80 },
            YTD:   { value: '$8.9M', delta: '+22%', compareLabel: 'vs last year', progress: 71 }
          },
          actions: [{ action: 'toast', message: 'Drill: Revenue', variant: 'info' }]
        },
        {
          id: 'arr', label: 'ARR pacing', icon: 'target', status: 'success',
          value: '$11.4M', unit: '/ $14M', delta: '+22%', trend: 'up',
          compareLabel: 'vs plan', target: '$14M', progress: 81,
          sparkline: [50, 58, 62, 68, 74, 80, 81]
        },
        {
          id: 'cust', label: 'New customers', icon: 'users',
          value: 142, delta: '+12', trend: 'up', compareLabel: 'vs last month',
          sparkline: [10, 12, 18, 16, 20, 22, 28],
          byKey: {
            Today: { value: 6,    delta: '+1' },
            '7d':  { value: 24,   delta: '+4',   sparkline: [3, 4, 3, 5, 4, 5, 6] },
            '30d': { value: 142,  delta: '+12',  sparkline: [10, 12, 18, 16, 20, 22, 28] },
            '90d': { value: 412,  delta: '+38',  sparkline: [30, 35, 50, 60, 65, 78, 90] },
            YTD:   { value: 1284, delta: '+182' }
          },
          actions: [{ action: 'toast', message: 'Drill: customers', variant: 'info' }]
        },
        {
          id: 'churn', label: 'Churn', icon: 'trending-down', status: 'warning', target: '1.5%',
          value: '2.1', unit: '%', delta: '-0.4pp', trend: 'down', progress: 60,
          sparkline: [3, 2.8, 2.6, 2.5, 2.4, 2.3, 2.1],
          byKey: {
            '7d':  { value: '1.8', delta: '-0.1pp', progress: 75 },
            '30d': { value: '2.1', delta: '-0.4pp', progress: 60 },
            '90d': { value: '2.4', delta: '-0.6pp', progress: 50 },
            YTD:   { value: '2.7', delta: '-1.1pp', progress: 38 }
          },
          actions: [{ action: 'toast', message: 'Drill: Churn', variant: 'warning' }]
        },
        {
          id: 'sla', label: 'SLA breaches', icon: 'alert-octagon', status: 'critical',
          value: 7, delta: '+3', trend: 'up', compareLabel: 'past 24h',
          byKey: {
            Today: { value: 7,   compareLabel: 'past 24h' },
            '7d':  { value: 18,  compareLabel: 'past 7 days' },
            '30d': { value: 47,  compareLabel: 'past 30 days' },
            '90d': { value: 132, compareLabel: 'past 90 days' }
          },
          actions: [{ action: 'toast', message: 'Open SLA breach log', variant: 'error' }]
        },
        {
          id: 'nps', label: 'NPS', icon: 'smile',
          value: 64, delta: '+5', trend: 'up', compareLabel: 'vs last survey',
          sparkline: [52, 54, 58, 60, 61, 63, 64]
        }
      ],

      // Multi-series primary chart — `series` carries two lines (Actual vs Plan).
      primaryChart: {
        title: 'Recurring revenue vs. plan',
        type: 'area',
        data: {
          Day: [
            { label: 'Mon', series: { Actual: 320, Plan: 300 } },
            { label: 'Tue', series: { Actual: 340, Plan: 310 } },
            { label: 'Wed', series: { Actual: 360, Plan: 320 } },
            { label: 'Thu', series: { Actual: 380, Plan: 330 } },
            { label: 'Fri', series: { Actual: 410, Plan: 340 } },
            { label: 'Sat', series: { Actual: 200, Plan: 250 } },
            { label: 'Sun', series: { Actual: 220, Plan: 260 } }
          ],
          Week: [
            { label: 'W22', series: { Actual: 2080, Plan: 2000 } },
            { label: 'W23', series: { Actual: 2180, Plan: 2050 } },
            { label: 'W24', series: { Actual: 2240, Plan: 2100 } },
            { label: 'W25', series: { Actual: 2300, Plan: 2150 } },
            { label: 'W26', series: { Actual: 2380, Plan: 2200 } },
            { label: 'W27', series: { Actual: 2400, Plan: 2250 } }
          ],
          Month: [
            { label: 'Jan', series: { Actual: 1450, Plan: 1400 } },
            { label: 'Feb', series: { Actual: 1620, Plan: 1500 } },
            { label: 'Mar', series: { Actual: 1810, Plan: 1620 } },
            { label: 'Apr', series: { Actual: 1980, Plan: 1740 } },
            { label: 'May', series: { Actual: 2200, Plan: 1860 } },
            { label: 'Jun', series: { Actual: 2400, Plan: 2000 } }
          ]
        }
      },

      activityTitle: 'Recent activity',
      // Categories auto-derive filter pills; `unread` items get bold + halo.
      activity: [
        { id: 'a1', time: '12m ago', label: 'New deal closed: Globex ($120k)', actor: 'Alice', severity: 'success', icon: 'trophy', category: 'Sales', unread: true,
          actions: [{ action: 'toast', message: 'Open Globex deal', variant: 'info' }] },
        { id: 'a2', time: '38m ago', label: 'Onboarding kicked off: Initech', actor: 'Bob', severity: 'info', category: 'Customer success' },
        { id: 'a3', time: '1h ago',  label: 'New signup: Vandelay Industries (Mid-market)', actor: 'Greta', severity: 'info', icon: 'user-plus', category: 'Sales' },
        { id: 'a4', time: '2h ago',  label: 'Churn risk flagged: Hooli', severity: 'warning', icon: 'alert-triangle', category: 'Alerts', unread: true,
          actions: [{ action: 'toast', message: 'Why is Hooli at risk?', variant: 'warning' }] },
        { id: 'a5', time: '3h ago',  label: 'SLA breach: payment-api p95 latency 820ms', severity: 'destructive', icon: 'alert-octagon', category: 'Alerts', unread: true,
          actions: [{ action: 'toast', message: 'Open incident', variant: 'error' }] },
        { id: 'a6', time: '5h ago',  label: 'Expansion: Pied Piper upgraded to Enterprise (+$48k)', actor: 'Sam', severity: 'success', icon: 'arrow-up-right', category: 'Sales' },
        { id: 'a7', time: 'Yesterday', label: 'Q1 board report published', actor: 'Carol', severity: 'info', icon: 'file-text', category: 'Reports' },
        { id: 'a8', time: '2d ago',   label: 'Quarterly NPS survey completed (n=4,212)', actor: 'Ops', severity: 'info', icon: 'smile', category: 'Reports' }
      ],

      // Three secondary breakdowns — each `data` keyed by range.
      charts: [
        {
          title: 'Revenue by segment', type: 'donut',
          data: {
            '7d':  [{ label: 'Enterprise', value: 55 }, { label: 'Mid-market', value: 30 }, { label: 'SMB', value: 15 }],
            '30d': [{ label: 'Enterprise', value: 58 }, { label: 'Mid-market', value: 29 }, { label: 'SMB', value: 13 }],
            '90d': [{ label: 'Enterprise', value: 60 }, { label: 'Mid-market', value: 28 }, { label: 'SMB', value: 12 }],
            QTD:   [{ label: 'Enterprise', value: 60 }, { label: 'Mid-market', value: 28 }, { label: 'SMB', value: 12 }],
            YTD:   [{ label: 'Enterprise', value: 63 }, { label: 'Mid-market', value: 26 }, { label: 'SMB', value: 11 }]
          }
        },
        {
          title: 'Top regions', type: 'bar',
          data: {
            '7d':  [{ label: 'US', value: 90 },  { label: 'EU', value: 56 },  { label: 'APAC', value: 36 },  { label: 'LATAM', value: 14 }],
            '30d': [{ label: 'US', value: 410 }, { label: 'EU', value: 240 }, { label: 'APAC', value: 160 }, { label: 'LATAM', value: 62 }],
            '90d': [{ label: 'US', value: 1200 },{ label: 'EU', value: 720 }, { label: 'APAC', value: 480 }, { label: 'LATAM', value: 180 }],
            QTD:   [{ label: 'US', value: 1200 },{ label: 'EU', value: 720 }, { label: 'APAC', value: 480 }, { label: 'LATAM', value: 180 }],
            YTD:   [{ label: 'US', value: 4400 },{ label: 'EU', value: 2600 },{ label: 'APAC', value: 1800 }, { label: 'LATAM', value: 720 }]
          }
        },
        {
          title: 'Pipeline conversion', type: 'line',
          data: {
            Day:   [{ label: 'Mon', value: 8 }, { label: 'Tue', value: 9 }, { label: 'Wed', value: 11 }, { label: 'Thu', value: 10 }, { label: 'Fri', value: 12 }, { label: 'Sat', value: 7 }, { label: 'Sun', value: 8 }],
            Week:  [{ label: 'W22', value: 9 }, { label: 'W23', value: 10 }, { label: 'W24', value: 11 }, { label: 'W25', value: 12 }, { label: 'W26', value: 13 }, { label: 'W27', value: 14 }],
            Month: [{ label: 'Jan', value: 7 }, { label: 'Feb', value: 8 }, { label: 'Mar', value: 9 }, { label: 'Apr', value: 11 }, { label: 'May', value: 12 }, { label: 'Jun', value: 14 }]
          }
        }
      ],

      // Top accounts — rows swap with the active range.
      table: {
        title: 'Top accounts',
        columns: [
          { key: 'name',  label: 'Account' },
          { key: 'plan',  label: 'Plan' },
          { key: 'owner', label: 'Owner' },
          { key: 'mrr',   label: 'MRR',  align: 'right' },
          { key: 'delta', label: 'Δ',    align: 'right' },
          { key: 'health',label: 'Health' }
        ],
        rows: {
          '7d': [
            { name: 'Globex',     plan: 'Enterprise', owner: 'Alice', mrr: '$24,000', delta: '+8%',  health: 'Healthy' },
            { name: 'Initech',    plan: 'Mid-market', owner: 'Bob',   mrr: '$8,400',  delta: '+2%',  health: 'Healthy' },
            { name: 'Pied Piper', plan: 'Mid-market', owner: 'Sam',   mrr: '$6,800',  delta: '+12%', health: 'Healthy' },
            { name: 'Hooli',      plan: 'Enterprise', owner: 'Dana',  mrr: '$19,600', delta: '-3%',  health: 'At risk' }
          ],
          '30d': [
            { name: 'Globex',     plan: 'Enterprise', owner: 'Alice', mrr: '$120,000', delta: '+11%', health: 'Healthy' },
            { name: 'Initech',    plan: 'Mid-market', owner: 'Bob',   mrr: '$42,000',  delta: '+4%',  health: 'Healthy' },
            { name: 'Hooli',      plan: 'Enterprise', owner: 'Dana',  mrr: '$98,000',  delta: '-6%',  health: 'At risk' },
            { name: 'Pied Piper', plan: 'Mid-market', owner: 'Sam',   mrr: '$34,000',  delta: '+18%', health: 'Healthy' },
            { name: 'Soylent',    plan: 'SMB',        owner: 'Pat',   mrr: '$6,400',   delta: '+2%',  health: 'Healthy' },
            { name: 'Vandelay',   plan: 'Mid-market', owner: 'Greta', mrr: '$11,200',  delta: '+22%', health: 'Healthy' }
          ],
          '90d': [
            { name: 'Globex',     plan: 'Enterprise', owner: 'Alice', mrr: '$360,000', delta: '+18%', health: 'Healthy' },
            { name: 'Initech',    plan: 'Mid-market', owner: 'Bob',   mrr: '$126,000', delta: '+9%',  health: 'Healthy' },
            { name: 'Hooli',      plan: 'Enterprise', owner: 'Dana',  mrr: '$294,000', delta: '-12%', health: 'At risk' },
            { name: 'Pied Piper', plan: 'Mid-market', owner: 'Sam',   mrr: '$84,000',  delta: '+24%', health: 'Healthy' },
            { name: 'Soylent',    plan: 'SMB',        owner: 'Pat',   mrr: '$19,200',  delta: '+6%',  health: 'Healthy' },
            { name: 'Vandelay',   plan: 'Mid-market', owner: 'Greta', mrr: '$33,600',  delta: '+28%', health: 'Healthy' },
            { name: 'Wonka Inc',  plan: 'Enterprise', owner: 'Marco', mrr: '$148,000', delta: '+7%',  health: 'Healthy' }
          ],
          QTD: [
            { name: 'Globex',     plan: 'Enterprise', owner: 'Alice', mrr: '$360,000', delta: '+18%', health: 'Healthy' },
            { name: 'Hooli',      plan: 'Enterprise', owner: 'Dana',  mrr: '$294,000', delta: '-12%', health: 'At risk' },
            { name: 'Wonka Inc',  plan: 'Enterprise', owner: 'Marco', mrr: '$148,000', delta: '+7%',  health: 'Healthy' },
            { name: 'Initech',    plan: 'Mid-market', owner: 'Bob',   mrr: '$126,000', delta: '+9%',  health: 'Healthy' }
          ],
          YTD: [
            { name: 'Globex',     plan: 'Enterprise', owner: 'Alice', mrr: '$1.4M', delta: '+34%', health: 'Healthy' },
            { name: 'Hooli',      plan: 'Enterprise', owner: 'Dana',  mrr: '$1.1M', delta: '-8%',  health: 'At risk' },
            { name: 'Wonka Inc',  plan: 'Enterprise', owner: 'Marco', mrr: '$590k', delta: '+19%', health: 'Healthy' },
            { name: 'Initech',    plan: 'Mid-market', owner: 'Bob',   mrr: '$510k', delta: '+12%', health: 'Healthy' },
            { name: 'Pied Piper', plan: 'Mid-market', owner: 'Sam',   mrr: '$320k', delta: '+44%', health: 'Healthy' }
          ]
        }
      }
    }
  }
};
