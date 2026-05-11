import type { WidgetManifestEntry } from '../index.js';

export const execDashboardEntry: WidgetManifestEntry = {
  type: 'exec-dashboard',
  category: 'composite',
  description: 'Executive dashboard with KPI strip, primary chart + activity rail, and data-table footer. Date-range chips, granularity toggle, refresh, clickable KPIs and activity items for drill-through.',
  props: {
    title: { type: 'string', required: false, description: 'Page title.' },
    subtitle: { type: 'string', required: false, description: 'Page subtitle / description.' },
    dateRange: { type: 'string', required: false, description: 'Static date-range chip (used when `dateRanges` is not provided).' },
    dateRanges: { type: 'string[]', required: false, description: 'Preset date-range chips (e.g. ["Today","7d","30d","90d","YTD"]). Renders a segmented control.' },
    activeDateRange: { type: 'string', required: false, description: 'Two-way bindable. Defaults to first item.' },
    granularities: { type: 'string[]', required: false, description: 'Optional granularity toggle (e.g. ["Day","Week","Month"]).' },
    activeGranularity: { type: 'string', required: false, description: 'Two-way bindable.' },
    activityFilters: { type: 'string[]', required: false, description: 'Activity-rail filter pills (first item is treated as "all").' },
    activeActivityFilter: { type: 'string', required: false, description: 'Two-way bindable.' },
    showRefresh: { type: 'boolean', required: false, description: 'Show built-in refresh button. Default true.' },
    refreshActions: { type: 'EventAction | EventAction[]', required: false, description: 'Actions dispatched when refresh is clicked.' },
    actions: { type: 'Array<{ id?: string; label: string; icon?: string; variant?: "default" | "outline" | "ghost"; actions?: EventAction | EventAction[] }>', required: false, description: 'Header action buttons.' },
    kpis: { type: 'Array<{ id?: string; label: string; value: string | number; delta?: string; trend?: "up" | "down" | "flat"; sparkline?: number[]; color?: string; sublabel?: string; actions?: EventAction | EventAction[] }>', required: false, description: 'KPI tiles. When `actions` (or `id` + a host `onkpiclick`) is set, the tile becomes clickable for drill-through.' },
    primaryChart: { type: '{ title?: string; type?: "bar" | "line" | "area" | "pie" | "donut" | "radar" | "heatmap"; data: Array<{ label: string; value?: number; series?: Record<string, number> }>; height?: number; colors?: string[] }', required: false, description: 'Hero chart (left, 2/3 width when activity rail is present).' },
    activity: { type: 'Array<{ id?: string; time: string; label: string; actor?: string; icon?: string; severity?: "info" | "success" | "warning" | "destructive"; actions?: EventAction | EventAction[] }>', required: false, description: 'Right-rail activity feed. Per-item `actions` makes the item clickable.' },
    activityTitle: { type: 'string', required: false, description: 'Activity rail heading. Default "Recent activity".' },
    charts: { type: 'Array<ChartConfig>', required: false, description: 'Secondary chart row (auto-fit grid).' },
    table: { type: '{ title?: string; columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>; rows: Record<string, unknown>[] }', required: false, description: 'Data table footer.' },
  },
  example: {
    type: 'exec-dashboard',
    bind: 'activeDateRange',
    props: {
      title: 'Q2 performance',
      subtitle: 'Cross-team metrics and KPIs',
      dateRanges: ['7d', '30d', '90d', 'QTD', 'YTD'],
      granularities: ['Day', 'Week', 'Month'],
      activityFilters: ['All', 'Mine', 'Alerts'],
      refreshActions: [{ action: 'toast', message: 'Refreshed', variant: 'info' }],
      kpis: [
        { id: 'mrr', label: 'Revenue', value: '$2.4M', delta: '+18%', trend: 'up', sparkline: [22, 25, 30, 28, 36, 40, 48], actions: [{ action: 'emit', target: 'chat.send', value: 'Tell me what drove the 18% MRR jump this period.' }] },
        { id: 'newcust', label: 'New customers', value: 142, delta: '+12', trend: 'up', sparkline: [10, 12, 18, 16, 20, 22, 28], actions: [{ action: 'emit', target: 'chat.send', value: 'Break down new customers by acquisition source.' }] },
        { id: 'churn', label: 'Churn', value: '2.1%', delta: '-0.4pp', trend: 'down', sparkline: [3, 2.8, 2.6, 2.5, 2.4, 2.3, 2.1], actions: [{ action: 'emit', target: 'chat.send', value: 'Which accounts churned, and why?' }] },
        { id: 'nps', label: 'NPS', value: 64, delta: '+5', trend: 'up' }
      ],
      primaryChart: {
        title: 'Monthly recurring revenue',
        type: 'area',
        data: [
          { label: 'Jan', value: 1450 }, { label: 'Feb', value: 1620 }, { label: 'Mar', value: 1810 },
          { label: 'Apr', value: 1980 }, { label: 'May', value: 2200 }, { label: 'Jun', value: 2400 }
        ]
      },
      activity: [
        { id: 'a1', time: '12m ago', label: 'New deal closed: Globex ($120k)', actor: 'Alice', severity: 'success', icon: 'trophy', actions: [{ action: 'emit', target: 'chat.send', value: 'Show me the Globex deal details.' }] },
        { id: 'a2', time: '38m ago', label: 'Onboarding kicked off: Initech', actor: 'Bob', severity: 'info' },
        { id: 'a3', time: '2h ago', label: 'Churn risk flagged: Hooli', severity: 'warning', icon: 'alert-triangle', actions: [{ action: 'emit', target: 'chat.send', value: 'Why is Hooli at churn risk?' }] },
        { id: 'a4', time: 'Yesterday', label: 'Q1 report published', actor: 'Carol', severity: 'info' }
      ],
      charts: [
        { title: 'Revenue by segment', type: 'donut', data: [{ label: 'Enterprise', value: 60 }, { label: 'Mid-market', value: 28 }, { label: 'SMB', value: 12 }] },
        { title: 'Top regions', type: 'bar', data: [{ label: 'US', value: 1200 }, { label: 'EU', value: 720 }, { label: 'APAC', value: 480 }] }
      ]
    },
  },
};
