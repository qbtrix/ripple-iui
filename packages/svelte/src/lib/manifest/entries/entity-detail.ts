import type { WidgetManifestEntry } from '../index.js';

export const entityDetailEntry: WidgetManifestEntry = {
  type: 'entity-detail',
  category: 'composite',
  description:
    'The "view one record" page: hero header, status badge, KPI strip, action buttons, meta sidebar, content body via children. Use for any single-entity page.',
  props: {
    title: { type: 'string', required: true, description: 'Primary heading (e.g. customer name, ticket title).' },
    subtitle: { type: 'string', required: false, description: 'Smaller line under the title.' },
    eyebrow: { type: 'string', required: false, description: 'Small uppercase label above the title (e.g. "Customer · ACME-1042").' },
    avatar: { type: 'string', required: false, description: 'Avatar image URL.' },
    icon: { type: 'string', required: false, description: 'Lucide icon slug, used when there is no avatar.' },
    iconColor: { type: 'string', required: false, description: 'Background color for the icon block (e.g. oklch(0.55 0.18 250)).' },
    status: { type: '{ label: string; variant?: "default" | "success" | "warning" | "destructive" | "info" }', required: false, description: 'Status pill rendered next to the title.' },
    tags: { type: 'Array<string | { label: string; color?: string }>', required: false, description: 'Tag pills.' },
    kpis: { type: 'Array<{ label: string; value: string | number; delta?: string; trend?: "up" | "down" | "flat"; sublabel?: string }>', required: false, description: 'KPI strip cards. Trend controls the colored arrow on `delta`.' },
    actions: { type: 'Array<{ id?: string; label: string; icon?: string; variant?: "default" | "secondary" | "outline" | "ghost" | "destructive"; actions?: EventAction | EventAction[] }>', required: false, description: 'Action buttons on the right of the hero.' },
    meta: { type: 'Array<{ label: string; value: string; icon?: string }>', required: false, description: 'Key-value pairs for the right rail (or stacked, depending on `metaPlacement`).' },
    metaPlacement: { type: '"rail" | "stacked"', required: false, description: 'Where to place the meta block. Default "rail".' },
  },
  example: {
    type: 'entity-detail',
    props: {
      eyebrow: 'Customer · ACME-1042',
      title: 'Acme Corp',
      subtitle: 'Enterprise · Annual contract',
      icon: 'building-2',
      iconColor: 'oklch(0.55 0.18 250)',
      status: { label: 'Active', variant: 'success' },
      tags: ['SSO', 'Audit', { label: 'Strategic', color: 'oklch(0.55 0.22 25)' }],
      kpis: [
        { label: 'MRR', value: '$48k', delta: '+12%', trend: 'up' },
        { label: 'Open tickets', value: 3, sublabel: '1 high priority' },
        { label: 'Health score', value: 92, delta: '+4', trend: 'up' },
        { label: 'Last touch', value: '2d ago', trend: 'flat' },
      ],
      actions: [
        { id: 'edit', label: 'Edit', icon: 'pencil', variant: 'outline' },
        { id: 'note', label: 'Add note', icon: 'message-square', variant: 'default' },
      ],
      meta: [
        { label: 'Owner', value: 'Jane Doe', icon: 'user' },
        { label: 'Created', value: 'Aug 14, 2019' },
        { label: 'Renewal', value: 'Mar 1, 2027', icon: 'calendar' },
        { label: 'Industry', value: 'Logistics' },
      ],
    },
    children: [
      { type: 'tabs', props: { tabs: ['Overview', 'Activity', 'Files', 'Settings'] }, bind: 'tab', children: [
        { type: 'text', props: { text: 'Overview content goes here.' } },
        { type: 'text', props: { text: 'Activity feed goes here.' } },
        { type: 'text', props: { text: 'Files list goes here.' } },
        { type: 'text', props: { text: 'Settings panel goes here.' } },
      ] },
    ],
  },
};
