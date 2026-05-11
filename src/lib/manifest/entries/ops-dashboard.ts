import type { WidgetManifestEntry } from '../index.js';

export const opsDashboardEntry: WidgetManifestEntry = {
  type: 'ops-dashboard',
  category: 'composite',
  description: 'Operations / SRE / NOC dashboard: status banner + service × region matrix + metric mini-charts + incidents feed + recent deploys list.',
  props: {
    title: { type: 'string', required: false, description: 'Heading. Default "Operations".' },
    subtitle: { type: 'string', required: false, description: 'Subheading.' },
    systemStatus: { type: '"operational" | "degraded" | "partial-outage" | "major-outage" | "maintenance"', required: false, description: 'Overall status. Auto-computed from `services` cell statuses if omitted.' },
    statusMessage: { type: 'string', required: false, description: 'Detail line in the status banner.' },
    services: { type: 'Array<{ id: string; name: string; description?: string; icon?: string; regions: Array<{ region: string; status: "operational" | "degraded" | "down" | "maintenance" | "unknown"; note?: string }> }>', required: false, description: 'Service × region matrix. Each cell is color-coded.' },
    regions: { type: 'string[]', required: false, description: 'Explicit region order; otherwise inferred from service entries.' },
    incidents: { type: 'Array<{ id: string; title: string; severity?: "sev1" | "sev2" | "sev3" | "sev4" | "info"; started?: string; status?: "investigating" | "identified" | "monitoring" | "resolved"; body?: string; services?: string[] }>', required: false, description: 'Active and recent incidents.' },
    metrics: { type: 'Array<{ label: string; value: string | number; unit?: string; sparkline?: number[]; trend?: "up" | "down" | "flat"; color?: string }>', required: false, description: 'Latency, error rate, etc.' },
    deploys: { type: 'Array<{ id: string; label: string; actor?: string; time: string; status?: "success" | "failed" | "in-progress" | "reverted"; sha?: string }>', required: false, description: 'Recent deploys / changes feed.' },
  },
  example: {
    type: 'ops-dashboard',
    props: {
      systemStatus: 'partial-outage',
      statusMessage: 'API errors elevated in EU regions; team is investigating.',
      services: [
        { id: 'api', name: 'API', icon: 'server', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'degraded' },
          { region: 'apac', status: 'operational' }
        ] },
        { id: 'web', name: 'Web app', icon: 'globe', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'operational' },
          { region: 'apac', status: 'operational' }
        ] },
        { id: 'db', name: 'Database', icon: 'database', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'down' },
          { region: 'apac', status: 'maintenance' }
        ] }
      ],
      metrics: [
        { label: 'P95 latency', value: 184, unit: 'ms', trend: 'up', sparkline: [120, 128, 140, 165, 178, 184], color: 'oklch(0.55 0.22 25)' },
        { label: 'Error rate', value: '0.42%', trend: 'up', sparkline: [0.1, 0.12, 0.18, 0.28, 0.36, 0.42] },
        { label: 'Requests/s', value: '12.4k', trend: 'flat', sparkline: [12, 12.1, 12.3, 12.0, 12.4, 12.4] },
        { label: 'Active alerts', value: 3 }
      ],
      incidents: [
        { id: 'i1', severity: 'sev2', title: 'EU API elevated 5xx errors', status: 'investigating', started: '14m ago', services: ['api', 'db'] },
        { id: 'i2', severity: 'sev3', title: 'Slow DB query in audit log', status: 'identified', started: '38m ago', services: ['db'] }
      ],
      deploys: [
        { id: 'd1', label: 'api: bump v1.42.3', actor: 'Alice', time: '08:32', status: 'success', sha: 'a3f2c1' },
        { id: 'd2', label: 'web: feature flag rollout', actor: 'Bob', time: '07:11', status: 'success', sha: '0d12bf' },
        { id: 'd3', label: 'api: schema migration', actor: 'CI', time: 'Yesterday', status: 'reverted', sha: '7e9a8b' }
      ]
    },
  },
};
