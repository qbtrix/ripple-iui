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
      title: 'Operations',
      subtitle: 'Production health across services & regions',
      systemStatus: 'partial-outage',
      statusMessage: 'API errors elevated in EU regions; team is investigating.',
      regions: ['us-east', 'us-west', 'eu-west', 'eu-central', 'apac', 'sa-east'],
      services: [
        { id: 'api', name: 'API', icon: 'server', description: 'Public REST + GraphQL', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'degraded', note: 'p95 > 800ms' },
          { region: 'eu-central', status: 'degraded', note: 'p95 > 600ms' },
          { region: 'apac', status: 'operational' },
          { region: 'sa-east', status: 'operational' }
        ] },
        { id: 'web', name: 'Web app', icon: 'globe', description: 'Customer dashboard SPA', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'operational' },
          { region: 'eu-central', status: 'operational' },
          { region: 'apac', status: 'operational' },
          { region: 'sa-east', status: 'operational' }
        ] },
        { id: 'auth', name: 'Auth service', icon: 'shield', description: 'OIDC + session', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'operational' },
          { region: 'eu-central', status: 'operational' },
          { region: 'apac', status: 'operational' },
          { region: 'sa-east', status: 'operational' }
        ] },
        { id: 'db', name: 'Database', icon: 'database', description: 'Primary Postgres cluster', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'down', note: 'replica failover in progress' },
          { region: 'eu-central', status: 'degraded', note: 'replication lag 4s' },
          { region: 'apac', status: 'maintenance', note: 'planned upgrade until 18:00 UTC' },
          { region: 'sa-east', status: 'operational' }
        ] },
        { id: 'cache', name: 'Cache', icon: 'zap', description: 'Redis cluster', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'operational' },
          { region: 'eu-central', status: 'operational' },
          { region: 'apac', status: 'operational' },
          { region: 'sa-east', status: 'unknown' }
        ] },
        { id: 'search', name: 'Search', icon: 'search', description: 'Elasticsearch', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'degraded', note: 'reindex backlog' },
          { region: 'eu-central', status: 'operational' },
          { region: 'apac', status: 'operational' },
          { region: 'sa-east', status: 'operational' }
        ] },
        { id: 'payments', name: 'Payments', icon: 'credit-card', description: 'Stripe + internal ledger', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'operational' },
          { region: 'eu-central', status: 'operational' },
          { region: 'apac', status: 'operational' },
          { region: 'sa-east', status: 'operational' }
        ] },
        { id: 'queue', name: 'Job queue', icon: 'list', description: 'Worker pool + scheduled jobs', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'degraded', note: 'backlog 12k jobs' },
          { region: 'eu-central', status: 'operational' },
          { region: 'apac', status: 'operational' },
          { region: 'sa-east', status: 'operational' }
        ] },
        { id: 'cdn', name: 'CDN', icon: 'cloud', description: 'Static asset edge', regions: [
          { region: 'us-east', status: 'operational' },
          { region: 'us-west', status: 'operational' },
          { region: 'eu-west', status: 'operational' },
          { region: 'eu-central', status: 'operational' },
          { region: 'apac', status: 'operational' },
          { region: 'sa-east', status: 'operational' }
        ] }
      ],
      metrics: [
        { label: 'P95 latency', value: 184, unit: 'ms', trend: 'up', sparkline: [120, 128, 140, 165, 178, 184], color: 'oklch(0.55 0.22 25)' },
        { label: 'P99 latency', value: 412, unit: 'ms', trend: 'up', sparkline: [240, 260, 290, 340, 380, 412], color: 'oklch(0.55 0.22 25)' },
        { label: 'Error rate', value: '0.42%', trend: 'up', sparkline: [0.1, 0.12, 0.18, 0.28, 0.36, 0.42] },
        { label: 'Requests/s', value: '12.4k', trend: 'flat', sparkline: [12, 12.1, 12.3, 12.0, 12.4, 12.4] },
        { label: 'Apdex score', value: '0.91', trend: 'down', sparkline: [0.97, 0.96, 0.94, 0.93, 0.92, 0.91] },
        { label: 'Active alerts', value: 7, trend: 'up' },
        { label: 'CPU (avg)', value: '64%', unit: '', trend: 'up', sparkline: [42, 48, 54, 58, 60, 64] },
        { label: 'Saturation', value: '72%', trend: 'up', sparkline: [40, 45, 52, 60, 68, 72] }
      ],
      incidents: [
        { id: 'i1', severity: 'sev1', title: 'EU-west database primary failover', status: 'investigating', started: '6m ago', services: ['db', 'api'],
          body: 'Replica promotion underway. Customer-facing writes failing in EU-west; reads degraded.' },
        { id: 'i2', severity: 'sev2', title: 'API elevated 5xx rate in EU regions', status: 'identified', started: '14m ago', services: ['api'],
          body: 'Root cause: connection pool exhaustion from downstream db failover. Pool size increase rolling out.' },
        { id: 'i3', severity: 'sev3', title: 'Search reindex backlog in eu-west', status: 'monitoring', started: '38m ago', services: ['search'],
          body: 'Reindex worker scaled 2× — backlog draining at ~400 docs/s.' },
        { id: 'i4', severity: 'sev3', title: 'Job queue backlog above SLO', status: 'identified', started: '1h ago', services: ['queue'],
          body: 'Linked to db failover. Auto-scaling triggered for worker pool.' },
        { id: 'i5', severity: 'sev4', title: 'CDN cache hit ratio dipped on /assets/v2', status: 'resolved', started: '3h ago', services: ['cdn'],
          body: 'Edge config rolled back. Hit ratio recovered to 96%.' },
        { id: 'i6', severity: 'info',  title: 'Planned maintenance: APAC db upgrade', status: 'monitoring', started: '2h ago', services: ['db'],
          body: 'Read-only window until 18:00 UTC; writes paused for ~5 minutes during cutover.' }
      ],
      deploys: [
        { id: 'd1', label: 'api: pool size bump v1.42.4',     actor: 'Alice', time: '09:14', status: 'in-progress', sha: 'b41e7f' },
        { id: 'd2', label: 'api: bump v1.42.3',                actor: 'Alice', time: '08:32', status: 'success',     sha: 'a3f2c1' },
        { id: 'd3', label: 'web: feature flag rollout',        actor: 'Bob',   time: '07:11', status: 'success',     sha: '0d12bf' },
        { id: 'd4', label: 'search: shard rebalance script',   actor: 'CI',    time: '06:48', status: 'success',     sha: 'fc8a23' },
        { id: 'd5', label: 'payments: 3DS retry tweak',        actor: 'Greta', time: 'Yesterday', status: 'success', sha: '21d9b0' },
        { id: 'd6', label: 'auth: rotate signing keys',        actor: 'Sam',   time: 'Yesterday', status: 'success', sha: '4a7e90' },
        { id: 'd7', label: 'api: schema migration',            actor: 'CI',    time: '2d ago',   status: 'reverted', sha: '7e9a8b' },
        { id: 'd8', label: 'queue: priority lane',             actor: 'Dana',  time: '2d ago',   status: 'failed',   sha: '9e3411' }
      ]
    },
  },
};
