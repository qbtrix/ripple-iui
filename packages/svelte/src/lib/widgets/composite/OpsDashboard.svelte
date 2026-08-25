<!--
  @file OpsDashboard.svelte
  @description Operations / SRE / NOC dashboard archetype: status banner →
  service × region matrix → metric mini-charts row → incidents feed and
  deploys list. Color-coded service cells let the eye catch outages instantly.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import Sparkline from '$lib/widgets/data/Sparkline.svelte';

  type SystemStatus = 'operational' | 'degraded' | 'partial-outage' | 'major-outage' | 'maintenance';
  type CellStatus = 'operational' | 'degraded' | 'down' | 'maintenance' | 'unknown';
  type Severity = 'sev1' | 'sev2' | 'sev3' | 'sev4' | 'info';

  interface ServiceRegion {
    region: string;
    status: CellStatus;
    note?: string;
  }

  interface Service {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    regions: ServiceRegion[];
  }

  interface Incident {
    id: string;
    title: string;
    severity?: Severity;
    started?: string;
    status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    body?: string;
    services?: string[];
  }

  interface MetricCard {
    label: string;
    value: string | number;
    unit?: string;
    sparkline?: number[];
    trend?: 'up' | 'down' | 'flat';
    color?: string;
  }

  interface Deploy {
    id: string;
    label: string;
    actor?: string;
    time: string;
    status?: 'success' | 'failed' | 'in-progress' | 'reverted';
    sha?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    subtitle?: string;
    systemStatus?: SystemStatus;
    statusMessage?: string;
    services?: Service[];
    regions?: string[];
    incidents?: Incident[];
    metrics?: MetricCard[];
    deploys?: Deploy[];
  }

  let {
    id,
    class: className,
    style,
    title = 'Operations',
    subtitle,
    systemStatus,
    statusMessage,
    services = [],
    regions,
    incidents = [],
    metrics = [],
    deploys = []
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const STATUS_META: Record<SystemStatus, { label: string; color: string; bg: string; icon: string }> = {
    operational: { label: 'All systems operational', color: 'oklch(0.55 0.18 150)', bg: 'color-mix(in oklab, oklch(0.55 0.18 150) 14%, transparent)', icon: 'check-circle-2' },
    degraded: { label: 'Degraded performance', color: 'oklch(0.65 0.18 70)', bg: 'color-mix(in oklab, oklch(0.65 0.18 70) 16%, transparent)', icon: 'alert-triangle' },
    'partial-outage': { label: 'Partial outage', color: 'oklch(0.6 0.2 50)', bg: 'color-mix(in oklab, oklch(0.6 0.2 50) 16%, transparent)', icon: 'alert-octagon' },
    'major-outage': { label: 'Major outage', color: 'oklch(0.55 0.22 25)', bg: 'color-mix(in oklab, oklch(0.55 0.22 25) 18%, transparent)', icon: 'alert-octagon' },
    maintenance: { label: 'Scheduled maintenance', color: 'oklch(0.55 0.18 250)', bg: 'color-mix(in oklab, oklch(0.55 0.18 250) 14%, transparent)', icon: 'tool' }
  };

  const CELL_META: Record<CellStatus, { label: string; cls: string }> = {
    operational: { label: 'OK', cls: 'rops-cell-ok' },
    degraded: { label: 'Degraded', cls: 'rops-cell-degraded' },
    down: { label: 'Down', cls: 'rops-cell-down' },
    maintenance: { label: 'Maint', cls: 'rops-cell-maint' },
    unknown: { label: '?', cls: 'rops-cell-unknown' }
  };

  const SEV_META: Record<Severity, { label: string; cls: string }> = {
    sev1: { label: 'SEV1', cls: 'rops-sev-1' },
    sev2: { label: 'SEV2', cls: 'rops-sev-2' },
    sev3: { label: 'SEV3', cls: 'rops-sev-3' },
    sev4: { label: 'SEV4', cls: 'rops-sev-4' },
    info: { label: 'INFO', cls: 'rops-sev-info' }
  };

  const STATUS_PILL: Record<NonNullable<Incident['status']>, string> = {
    investigating: 'rops-status-investigating',
    identified: 'rops-status-identified',
    monitoring: 'rops-status-monitoring',
    resolved: 'rops-status-resolved'
  };

  const DEPLOY_PILL: Record<NonNullable<Deploy['status']>, { cls: string; icon: string }> = {
    success: { cls: 'rops-deploy-ok', icon: 'check-circle-2' },
    failed: { cls: 'rops-deploy-fail', icon: 'x-circle' },
    'in-progress': { cls: 'rops-deploy-pending', icon: 'loader' },
    reverted: { cls: 'rops-deploy-reverted', icon: 'undo-2' }
  };

  const effectiveRegions = $derived.by(() => {
    if (regions && regions.length > 0) return regions;
    const set = new Set<string>();
    for (const s of services) for (const r of s.regions) set.add(r.region);
    return Array.from(set);
  });

  function regionStatus(s: Service, region: string): CellStatus {
    return s.regions.find((r) => r.region === region)?.status ?? 'unknown';
  }

  const effectiveStatus = $derived.by<SystemStatus>(() => {
    if (systemStatus) return systemStatus;
    let worst: SystemStatus = 'operational';
    for (const s of services) {
      for (const r of s.regions) {
        if (r.status === 'down') return 'major-outage';
        if (r.status === 'degraded') worst = 'partial-outage';
        if (r.status === 'maintenance' && worst === 'operational') worst = 'maintenance';
      }
    }
    return worst;
  });

  const activeIncidents = $derived(incidents.filter((i) => i.status !== 'resolved'));
  const meta = $derived(STATUS_META[effectiveStatus]);
</script>

<div {id} class={cn('rops', className)} style={styleString}>
  <header class="rops-header">
    <div>
      <h1 class="rops-title">{title}</h1>
      {#if subtitle}<p class="rops-subtitle">{subtitle}</p>{/if}
    </div>
    {#if activeIncidents.length > 0}
      <span class="rops-active-count">
        <Icon name="alert-circle" size={13} />
        {activeIncidents.length} active incident{activeIncidents.length === 1 ? '' : 's'}
      </span>
    {/if}
  </header>

  <div class="rops-banner" style={`background:${meta.bg}; border-color:color-mix(in oklab, ${meta.color} 30%, transparent);`}>
    <span class="rops-banner-icon" style={`color:${meta.color};`}>
      <Icon name={meta.icon} size={20} />
    </span>
    <div class="rops-banner-text">
      <div class="rops-banner-title" style={`color:${meta.color};`}>{meta.label}</div>
      {#if statusMessage}<div class="rops-banner-body">{statusMessage}</div>{/if}
    </div>
  </div>

  {#if metrics.length > 0}
    <div class="rops-metrics">
      {#each metrics as m}
        <div class="rops-metric">
          <div class="rops-metric-label">{m.label}</div>
          <div class="rops-metric-row">
            <div class="rops-metric-value" style={m.color ? `color:${m.color};` : undefined}>
              {m.value}
              {#if m.unit}<span class="rops-metric-unit">{m.unit}</span>{/if}
            </div>
            {#if m.sparkline && m.sparkline.length > 1}
              <div class="rops-metric-spark">
                <Sparkline values={m.sparkline} color={m.color ?? 'oklch(0.55 0.18 250)'} height={26} noTooltip />
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if services.length > 0}
    <div class="rops-card">
      <div class="rops-card-title">Services</div>
      <div class="rops-grid-scroll">
        <table class="rops-grid">
          <thead>
            <tr>
              <th class="rops-grid-svc">Service</th>
              {#each effectiveRegions as r}
                <th class="rops-grid-region">{r}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each services as s}
              <tr>
                <td class="rops-grid-svc">
                  <div class="rops-grid-svc-row">
                    {#if s.icon}<Icon name={s.icon} size={13} />{/if}
                    <div>
                      <div class="rops-grid-svc-name">{s.name}</div>
                      {#if s.description}<div class="rops-grid-svc-desc">{s.description}</div>{/if}
                    </div>
                  </div>
                </td>
                {#each effectiveRegions as r}
                  {@const status = regionStatus(s, r)}
                  <td class="rops-grid-cell">
                    <span class={cn('rops-cell', CELL_META[status].cls)} title={CELL_META[status].label}>
                      {CELL_META[status].label}
                    </span>
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <div class={cn('rops-row', incidents.length > 0 && deploys.length > 0 ? 'rops-row-2' : 'rops-row-1')}>
    {#if incidents.length > 0}
      <div class="rops-card">
        <div class="rops-card-title-row">
          <span class="rops-card-title">Incidents</span>
          {#if incidents.length}<span class="rops-card-count">{incidents.length}</span>{/if}
        </div>
        <ul class="rops-incidents">
          {#each incidents as inc}
            <li class="rops-incident">
              <div class="rops-incident-row">
                {#if inc.severity}
                  <span class={cn('rops-sev', SEV_META[inc.severity].cls)}>{SEV_META[inc.severity].label}</span>
                {/if}
                <span class="rops-incident-title">{inc.title}</span>
                {#if inc.status}
                  <span class={cn('rops-status', STATUS_PILL[inc.status])}>{inc.status}</span>
                {/if}
              </div>
              <div class="rops-incident-meta">
                {#if inc.started}<span>Started {inc.started}</span>{/if}
                {#if inc.services && inc.services.length > 0}
                  <span>· {inc.services.join(', ')}</span>
                {/if}
              </div>
              {#if inc.body}<p class="rops-incident-body">{inc.body}</p>{/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if deploys.length > 0}
      <div class="rops-card">
        <div class="rops-card-title">Recent deploys</div>
        <ul class="rops-deploys">
          {#each deploys as d}
            <li class="rops-deploy">
              {#if d.status}
                <span class={cn('rops-deploy-pill', DEPLOY_PILL[d.status].cls)} title={d.status}>
                  <Icon name={DEPLOY_PILL[d.status].icon} size={12} />
                </span>
              {/if}
              <div class="rops-deploy-body">
                <div class="rops-deploy-row">
                  <span class="rops-deploy-label">{d.label}</span>
                  <span class="rops-deploy-time">{d.time}</span>
                </div>
                <div class="rops-deploy-meta">
                  {#if d.actor}{d.actor}{/if}
                  {#if d.sha}<span class="rops-deploy-sha">· {d.sha}</span>{/if}
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>

<style>
  .rops {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
  }

  .rops-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    padding-bottom: 10px;
  }
  .rops-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .rops-subtitle {
    font-size: 13px;
    color: var(--muted-foreground);
    margin: 4px 0 0;
  }
  .rops-active-count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: color-mix(in oklab, oklch(0.55 0.22 25) 14%, transparent);
    color: oklch(0.55 0.22 25);
    font-size: 12px;
    font-weight: 600;
  }

  .rops-banner {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    border-radius: 12px;
    border: 1px solid;
  }
  .rops-banner-icon { display: inline-flex; }
  .rops-banner-text { flex: 1; min-width: 0; }
  .rops-banner-title {
    font-size: 14.5px;
    font-weight: 600;
  }
  .rops-banner-body {
    font-size: 12.5px;
    color: var(--muted-foreground);
    margin-top: 2px;
  }

  .rops-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
  }
  .rops-metric {
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rops-metric-label {
    font-size: 11.5px;
    color: var(--muted-foreground);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .rops-metric-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .rops-metric-value {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.05;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }
  .rops-metric-unit {
    font-size: 11px;
    margin-left: 3px;
    color: var(--muted-foreground);
    font-weight: 500;
  }
  .rops-metric-spark { width: 80px; flex-shrink: 0; }

  .rops-card {
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .rops-card-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .rops-card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .rops-card-count {
    background: var(--muted);
    color: var(--muted-foreground);
    font-size: 11px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 999px;
  }

  .rops-grid-scroll {
    overflow-x: auto;
  }
  .rops-grid {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 12.5px;
  }
  .rops-grid th,
  .rops-grid td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .rops-grid thead th {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .rops-grid-svc { min-width: 160px; }
  .rops-grid-region {
    text-align: center;
    min-width: 88px;
  }
  .rops-grid-cell { text-align: center; }
  .rops-grid-svc-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rops-grid-svc-name { font-weight: 500; color: var(--foreground); }
  .rops-grid-svc-desc { font-size: 11px; color: var(--muted-foreground); }

  .rops-cell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 56px;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 1px solid transparent;
  }
  .rops-cell-ok {
    background: color-mix(in oklab, oklch(0.55 0.18 150) 12%, transparent);
    color: oklch(0.55 0.18 150);
    border-color: color-mix(in oklab, oklch(0.55 0.18 150) 30%, transparent);
  }
  .rops-cell-degraded {
    background: color-mix(in oklab, oklch(0.65 0.18 70) 18%, transparent);
    color: oklch(0.55 0.18 70);
    border-color: color-mix(in oklab, oklch(0.65 0.18 70) 35%, transparent);
  }
  .rops-cell-down {
    background: color-mix(in oklab, oklch(0.55 0.22 25) 18%, transparent);
    color: oklch(0.55 0.22 25);
    border-color: color-mix(in oklab, oklch(0.55 0.22 25) 40%, transparent);
  }
  .rops-cell-maint {
    background: color-mix(in oklab, oklch(0.55 0.18 250) 14%, transparent);
    color: oklch(0.55 0.18 250);
    border-color: color-mix(in oklab, oklch(0.55 0.18 250) 30%, transparent);
  }
  .rops-cell-unknown {
    background: var(--muted);
    color: var(--muted-foreground);
  }

  .rops-row { display: grid; gap: 12px; }
  .rops-row-1 { grid-template-columns: 1fr; }
  .rops-row-2 { grid-template-columns: 1fr; }
  @media (min-width: 920px) {
    .rops-row-2 { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); }
  }

  /* Incidents */
  .rops-incidents {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .rops-incident {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .rops-incident:last-child { border-bottom: 0; padding-bottom: 0; }
  .rops-incident-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .rops-incident-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
    flex: 1;
    min-width: 0;
  }
  .rops-incident-meta {
    font-size: 11px;
    color: var(--muted-foreground);
    display: inline-flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .rops-incident-body {
    font-size: 12px;
    color: var(--muted-foreground);
    margin: 4px 0 0;
    line-height: 1.5;
  }
  .rops-sev {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    letter-spacing: 0.04em;
  }
  .rops-sev-1 { background: color-mix(in oklab, oklch(0.55 0.22 25) 18%, transparent); color: oklch(0.55 0.22 25); }
  .rops-sev-2 { background: color-mix(in oklab, oklch(0.6 0.2 50) 18%, transparent); color: oklch(0.55 0.2 50); }
  .rops-sev-3 { background: color-mix(in oklab, oklch(0.65 0.18 70) 18%, transparent); color: oklch(0.55 0.18 70); }
  .rops-sev-4 { background: color-mix(in oklab, oklch(0.55 0.18 250) 14%, transparent); color: oklch(0.55 0.18 250); }
  .rops-sev-info { background: var(--muted); color: var(--muted-foreground); }

  .rops-status {
    font-size: 10.5px;
    text-transform: capitalize;
    padding: 1px 8px;
    border-radius: 999px;
  }
  .rops-status-investigating { background: color-mix(in oklab, oklch(0.6 0.2 50) 14%, transparent); color: oklch(0.55 0.2 50); }
  .rops-status-identified { background: color-mix(in oklab, oklch(0.65 0.18 70) 14%, transparent); color: oklch(0.55 0.18 70); }
  .rops-status-monitoring { background: color-mix(in oklab, oklch(0.55 0.18 250) 14%, transparent); color: oklch(0.55 0.18 250); }
  .rops-status-resolved { background: color-mix(in oklab, oklch(0.55 0.18 150) 14%, transparent); color: oklch(0.55 0.18 150); }

  /* Deploys */
  .rops-deploys {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rops-deploy {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .rops-deploy-pill {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .rops-deploy-ok { background: color-mix(in oklab, oklch(0.55 0.18 150) 18%, transparent); color: oklch(0.55 0.18 150); }
  .rops-deploy-fail { background: color-mix(in oklab, oklch(0.55 0.22 25) 18%, transparent); color: oklch(0.55 0.22 25); }
  .rops-deploy-pending { background: color-mix(in oklab, oklch(0.55 0.18 250) 14%, transparent); color: oklch(0.55 0.18 250); }
  .rops-deploy-reverted { background: var(--muted); color: var(--muted-foreground); }
  .rops-deploy-body { flex: 1; min-width: 0; }
  .rops-deploy-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .rops-deploy-label { font-size: 13px; color: var(--foreground); }
  .rops-deploy-time { font-size: 11px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .rops-deploy-meta { font-size: 11.5px; color: var(--muted-foreground); }
  .rops-deploy-sha { font-family: var(--font-mono, monospace); font-size: 10.5px; }
</style>
