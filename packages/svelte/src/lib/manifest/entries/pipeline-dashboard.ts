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
      subtitle: 'Team performance and active deals',
      period: 'Q2 2026',
      quota: { label: 'Team quota', current: 1820000, target: 2500000, currency: '$', period: 'Q2 — 28 days remaining' },
      funnel: {
        title: 'Pipeline funnel',
        stages: [
          { label: 'Leads',         value: 1240 },
          { label: 'Qualified',     value: 480 },
          { label: 'Discovery',     value: 320 },
          { label: 'Proposal',      value: 180 },
          { label: 'Negotiation',   value: 92 },
          { label: 'Closed won',    value: 38 }
        ]
      },
      conversion: [
        { from: 'Leads',       to: 'Qualified',    rate: 38.7 },
        { from: 'Qualified',   to: 'Discovery',    rate: 66.7 },
        { from: 'Discovery',   to: 'Proposal',     rate: 56.3 },
        { from: 'Proposal',    to: 'Negotiation',  rate: 51.1 },
        { from: 'Negotiation', to: 'Closed won',   rate: 41.3 }
      ],
      leaderboard: {
        title: 'Top reps — Q2',
        items: [
          { position: 1, name: 'Alex Liu',     value: '$420k', delta: '+$80k', sublabel: '12 deals' },
          { position: 2, name: 'Sam Patel',    value: '$380k', delta: '+$45k', sublabel: '9 deals' },
          { position: 3, name: 'Jess Tan',     value: '$310k', delta: '+$22k', sublabel: '14 deals' },
          { position: 4, name: 'Rico Diaz',    value: '$240k', delta: '+$12k', sublabel: '8 deals' },
          { position: 5, name: 'Priya Sharma', value: '$215k', delta: '+$30k', sublabel: '11 deals' },
          { position: 6, name: 'Marco Bianchi',value: '$198k', delta: '+$18k', sublabel: '7 deals' },
          { position: 7, name: 'Hana Kim',     value: '$172k', delta: '+$24k', sublabel: '10 deals' },
          { position: 8, name: 'Tomás Vega',   value: '$148k', delta: '+$8k',  sublabel: '6 deals' },
          { position: 9, name: 'Lara Novak',   value: '$132k', delta: '+$14k', sublabel: '8 deals' },
          { position: 10,name: 'Yuki Watanabe',value: '$118k',                  sublabel: '5 deals' }
        ]
      },
      deals: {
        title: 'Active deals',
        columns: [
          { key: 'name',  label: 'Deal' },
          { key: 'stage', label: 'Stage' },
          { key: 'value', label: 'Value', align: 'right' },
          { key: 'prob',  label: 'Prob.', align: 'right' },
          { key: 'close', label: 'Close' },
          { key: 'owner', label: 'Owner' }
        ],
        rows: [
          { name: 'Globex Q2 expansion',      stage: 'Negotiation', value: '$120k', prob: '75%', close: 'Jun 14', owner: 'Alex Liu' },
          { name: 'Hooli SSO add-on',         stage: 'Proposal',    value: '$48k',  prob: '50%', close: 'Jun 22', owner: 'Sam Patel' },
          { name: 'Initech renewal',          stage: 'Closed won',  value: '$62k',  prob: '100%',close: 'Jun 2',  owner: 'Jess Tan' },
          { name: 'Massive Dynamic platform', stage: 'Discovery',   value: '$240k', prob: '30%', close: 'Jul 12', owner: 'Sam Patel' },
          { name: 'Pied Piper trial → annual',stage: 'Negotiation', value: '$84k',  prob: '70%', close: 'Jun 18', owner: 'Priya Sharma' },
          { name: 'Wonka Inc enterprise',     stage: 'Proposal',    value: '$320k', prob: '45%', close: 'Jul 5',  owner: 'Marco Bianchi' },
          { name: 'Soylent SMB plan',         stage: 'Qualified',   value: '$18k',  prob: '20%', close: 'Jul 28', owner: 'Hana Kim' },
          { name: 'Vandelay add-ons',         stage: 'Negotiation', value: '$36k',  prob: '60%', close: 'Jun 28', owner: 'Rico Diaz' },
          { name: 'Acme renewal + upsell',    stage: 'Discovery',   value: '$210k', prob: '25%', close: 'Aug 4',  owner: 'Alex Liu' },
          { name: 'Sirius Cybernetics POC',   stage: 'Proposal',    value: '$72k',  prob: '40%', close: 'Jul 18', owner: 'Lara Novak' }
        ]
      },
      ticker: [
        { time: '2m ago',  label: 'Closed: Globex Q2 expansion ($120k)',   actor: 'Alex Liu',     icon: 'trophy' },
        { time: '14m ago', label: 'Demo scheduled: Massive Dynamic',       actor: 'Sam Patel',    icon: 'calendar' },
        { time: '32m ago', label: 'Proposal sent: Wonka Inc enterprise',   actor: 'Marco Bianchi',icon: 'file-text' },
        { time: '38m ago', label: 'Lead qualified: Pied Piper',            actor: 'Jess Tan',     icon: 'check-circle-2' },
        { time: '1h ago',  label: 'Stage advanced: Hooli SSO → Negotiation',actor: 'Sam Patel',   icon: 'arrow-up-right' },
        { time: '2h ago',  label: 'New lead: BioReactor Industries',       actor: 'Priya Sharma', icon: 'user-plus' },
        { time: '3h ago',  label: 'Lost: Cyberdyne pilot ($45k)',          actor: 'Rico Diaz',    icon: 'x-circle' },
        { time: '5h ago',  label: 'Demo completed: Vandelay add-ons',      actor: 'Rico Diaz',    icon: 'play' }
      ]
    },
  },
};
