import type { WidgetManifestEntry } from '../index.js';

export const analyticsDashboardEntry: WidgetManifestEntry = {
  type: 'analytics-dashboard',
  category: 'composite',
  description: 'Analytics archetype: hero headline metric with period comparison → dominant time-series chart → small-chart breakdown row → top-items table.',
  props: {
    title: { type: 'string', required: false, description: 'Page title.' },
    subtitle: { type: 'string', required: false, description: 'Subheading.' },
    dateRange: { type: 'string', required: false, description: 'Date-range chip.' },
    headline: { type: '{ label: string; value: string | number; delta?: string; trend?: "up" | "down" | "flat"; comparison?: string; sparkline?: number[] }', required: false, description: 'The "big number" hero — center stage with sparkline + period comparison.' },
    secondaryMetrics: { type: 'Array<{ label: string; value: string | number; delta?: string; trend?: "up" | "down" | "flat"; sublabel?: string }>', required: false, description: 'Smaller cards next to the headline.' },
    primaryChart: { type: '{ title?: string; subtitle?: string; type?: "bar" | "line" | "area" | "pie" | "donut" | "radar" | "heatmap"; data: DataPoint[]; height?: number; colors?: string[] }', required: false, description: 'Dominant time-series chart.' },
    breakdowns: { type: 'Array<ChartConfig>', required: false, description: 'Small charts in a responsive row (e.g. by source / device / region).' },
    topItems: { type: '{ title?: string; columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>; rows: Record<string, unknown>[] }', required: false, description: 'Top items / pages / referrers table.' },
  },
  example: {
    type: 'analytics-dashboard',
    props: {
      title: 'Web traffic',
      subtitle: 'docs.acme.com',
      dateRange: 'Last 30 days',
      headline: {
        label: 'Visitors',
        value: '482k',
        delta: '+22.4%',
        trend: 'up',
        comparison: 'vs prior 30 days',
        sparkline: [12, 14, 18, 16, 20, 22, 26, 24, 28, 32, 36, 38, 42, 48]
      },
      secondaryMetrics: [
        { label: 'Pageviews', value: '1.6M', delta: '+18%', trend: 'up' },
        { label: 'Avg session', value: '2m 14s', delta: '+8s', trend: 'up' },
        { label: 'Bounce rate', value: '38%', delta: '-3pp', trend: 'down' }
      ],
      primaryChart: {
        title: 'Visitors by day',
        type: 'area',
        data: Array.from({ length: 14 }, (_, i) => ({ label: `Day ${i + 1}`, value: 8000 + Math.round(Math.sin(i / 2) * 2000 + i * 1500) }))
      },
      breakdowns: [
        { title: 'By source', type: 'donut', data: [{ label: 'Direct', value: 42 }, { label: 'Search', value: 31 }, { label: 'Social', value: 15 }, { label: 'Referral', value: 12 }] },
        { title: 'By device', type: 'donut', data: [{ label: 'Desktop', value: 64 }, { label: 'Mobile', value: 30 }, { label: 'Tablet', value: 6 }] },
        { title: 'By region', type: 'bar', data: [{ label: 'NA', value: 220 }, { label: 'EU', value: 154 }, { label: 'APAC', value: 78 }, { label: 'LATAM', value: 30 }] }
      ],
      topItems: {
        title: 'Top pages',
        columns: [
          { key: 'page', label: 'Page' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'avg', label: 'Avg time', align: 'right' }
        ],
        rows: [
          { page: '/getting-started', views: '92k', avg: '3m 12s' },
          { page: '/api', views: '64k', avg: '4m 02s' },
          { page: '/pricing', views: '48k', avg: '1m 18s' },
          { page: '/faq', views: '24k', avg: '0m 54s' }
        ]
      }
    },
  },
};
