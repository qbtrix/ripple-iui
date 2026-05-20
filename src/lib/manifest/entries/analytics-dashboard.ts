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
      subtitle: 'docs.acme.com — Last 30 days',
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
        { label: 'Pageviews',    value: '1.6M',    delta: '+18%',  trend: 'up',   sublabel: '3.3 per visit' },
        { label: 'Avg session',  value: '2m 14s',  delta: '+8s',   trend: 'up' },
        { label: 'Bounce rate',  value: '38%',     delta: '-3pp',  trend: 'down' },
        { label: 'New visitors', value: '62%',     delta: '+4pp',  trend: 'up' },
        { label: 'Signups',      value: 1284,      delta: '+182',  trend: 'up',   sublabel: '2.7% conv.' },
        { label: 'Goal completions', value: 612,   delta: '+88',   trend: 'up',   sublabel: 'Trial start' }
      ],
      primaryChart: {
        title: 'Visitors by day',
        subtitle: 'Daily unique visitors over the last 30 days',
        type: 'area',
        data: Array.from({ length: 30 }, (_, i) => ({
          label: `Day ${i + 1}`,
          value: 9000 + Math.round(Math.sin(i / 3) * 2400 + i * 320 + (i > 22 ? 1200 : 0))
        }))
      },
      breakdowns: [
        { title: 'By source', type: 'donut', data: [
          { label: 'Direct', value: 38 }, { label: 'Search', value: 33 },
          { label: 'Social', value: 14 }, { label: 'Referral', value: 10 }, { label: 'Email', value: 5 }
        ] },
        { title: 'By device', type: 'donut', data: [
          { label: 'Desktop', value: 62 }, { label: 'Mobile', value: 32 }, { label: 'Tablet', value: 6 }
        ] },
        { title: 'By region', type: 'bar', data: [
          { label: 'NA', value: 220 }, { label: 'EU', value: 154 },
          { label: 'APAC', value: 78 }, { label: 'LATAM', value: 30 }, { label: 'MEA', value: 14 }
        ] },
        { title: 'By browser', type: 'bar', data: [
          { label: 'Chrome', value: 58 }, { label: 'Safari', value: 22 },
          { label: 'Firefox', value: 9 }, { label: 'Edge', value: 8 }, { label: 'Other', value: 3 }
        ] }
      ],
      topItems: {
        title: 'Top pages',
        columns: [
          { key: 'page',    label: 'Page' },
          { key: 'views',   label: 'Views',    align: 'right' },
          { key: 'unique',  label: 'Unique',   align: 'right' },
          { key: 'avg',     label: 'Avg time', align: 'right' },
          { key: 'bounce',  label: 'Bounce',   align: 'right' }
        ],
        rows: [
          { page: '/getting-started', views: '92k', unique: '64k', avg: '3m 12s', bounce: '24%' },
          { page: '/api',             views: '64k', unique: '41k', avg: '4m 02s', bounce: '18%' },
          { page: '/pricing',         views: '48k', unique: '38k', avg: '1m 18s', bounce: '42%' },
          { page: '/docs/auth',       views: '38k', unique: '22k', avg: '2m 44s', bounce: '28%' },
          { page: '/docs/quickstart', views: '32k', unique: '24k', avg: '5m 18s', bounce: '14%' },
          { page: '/changelog',       views: '28k', unique: '19k', avg: '1m 02s', bounce: '52%' },
          { page: '/faq',             views: '24k', unique: '18k', avg: '0m 54s', bounce: '61%' },
          { page: '/blog/launch',     views: '21k', unique: '17k', avg: '2m 32s', bounce: '34%' },
          { page: '/integrations',    views: '18k', unique: '13k', avg: '1m 48s', bounce: '38%' },
          { page: '/security',        views: '14k', unique: '11k', avg: '2m 04s', bounce: '29%' }
        ]
      }
    },
  },
};
