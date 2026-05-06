import type { WidgetManifestEntry } from '../index.js';

export const pipelineDashboardEntry: WidgetManifestEntry = {
  type: 'pipeline-dashboard',
  category: 'composite',
  description: 'Sales / pipeline / funnel archetype: quota progress hero + leaderboard side rail + funnel chart + stage conversion + deals table + live activity ticker.',
  props: {
    title: { type: 'string', required: false, description: 'Page title.' },
    subtitle: { type: 'string', required: false, description: 'Subheading.' },
    period: { type: 'string', required: false, description: 'Period label (e.g. "Q2 2026").' },
    quota: { type: '{ label?: string; current: number; target: number; currency?: string; period?: string }', required: false, description: 'Big quota progress hero (current vs target).' },
    funnel: { type: '{ title?: string; stages: Array<{ label: string; value: number; color?: string }> }', required: false, description: 'Funnel chart data.' },
    conversion: { type: 'Array<{ from: string; to: string; rate: number }>', required: false, description: 'Stage-to-stage conversion percentages (0–100).' },
    leaderboard: { type: '{ title?: string; items: Array<{ name: string; avatar?: string; value: string | number; delta?: string; sublabel?: string; position?: number }> }', required: false, description: 'Leaderboard sidebar (medals on top 3).' },
    deals: { type: '{ title?: string; columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>; rows: Record<string, unknown>[] }', required: false, description: 'Deals / opportunities table.' },
    ticker: { type: 'Array<{ time: string; label: string; actor?: string; icon?: string }>', required: false, description: 'Live activity ticker.' },
  },
  example: {
    type: 'pipeline-dashboard',
    props: {
      title: 'Sales pipeline',
      period: 'Q2 2026',
      quota: { label: 'Team quota', current: 1820000, target: 2500000, currency: '$', period: 'Q2 — 28 days remaining' },
      funnel: {
        title: 'Pipeline funnel',
        stages: [
          { label: 'Leads', value: 1240 },
          { label: 'Qualified', value: 480 },
          { label: 'Proposal', value: 180 },
          { label: 'Negotiation', value: 92 },
          { label: 'Closed won', value: 38 }
        ]
      },
      conversion: [
        { from: 'Leads', to: 'Qualified', rate: 38.7 },
        { from: 'Qualified', to: 'Proposal', rate: 37.5 },
        { from: 'Proposal', to: 'Negotiation', rate: 51.1 },
        { from: 'Negotiation', to: 'Closed won', rate: 41.3 }
      ],
      leaderboard: {
        title: 'Top reps',
        items: [
          { name: 'Alex Liu', value: '$420k', delta: '+$80k', sublabel: '12 deals' },
          { name: 'Sam Patel', value: '$380k', delta: '+$45k', sublabel: '9 deals' },
          { name: 'Jess Tan', value: '$310k', delta: '+$22k', sublabel: '14 deals' },
          { name: 'Rico Diaz', value: '$240k', sublabel: '8 deals' }
        ]
      },
      deals: {
        title: 'Recent deals',
        columns: [
          { key: 'name', label: 'Deal' },
          { key: 'stage', label: 'Stage' },
          { key: 'value', label: 'Value', align: 'right' },
          { key: 'owner', label: 'Owner' }
        ],
        rows: [
          { name: 'Globex Q2 expansion', stage: 'Negotiation', value: '$120k', owner: 'Alex Liu' },
          { name: 'Hooli SSO add-on', stage: 'Proposal', value: '$48k', owner: 'Sam Patel' },
          { name: 'Initech renewal', stage: 'Closed won', value: '$62k', owner: 'Jess Tan' }
        ]
      },
      ticker: [
        { time: '2m ago', label: 'Closed: Globex Q2 expansion', actor: 'Alex Liu', icon: 'trophy' },
        { time: '14m ago', label: 'Demo scheduled: Massive Dynamic', actor: 'Sam Patel' },
        { time: '38m ago', label: 'Lead qualified: Pied Piper', actor: 'Jess Tan' }
      ]
    },
  },
};
