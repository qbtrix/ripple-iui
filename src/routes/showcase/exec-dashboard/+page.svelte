<!--
  Dev-only showcase for ExecDashboard — NOT part of the published package.
  Demonstrates the package contract: the consumer owns state (date range,
  granularity, loading, error, etc.) and passes it in via $bindable props
  and per-key data maps. The component is a pure renderer.
-->
<script lang="ts">
  import ExecDashboard from '$lib/widgets/composite/ExecDashboard.svelte';

  // ── External state owned by THIS page (the "consumer") ────────────────
  let activeDateRange = $state('30d');
  let activeGranularity = $state('Month');
  let activeActivityFilter = $state<string | undefined>(undefined);
  let density = $state<'comfortable' | 'compact'>('comfortable');
  let loading = $state(false);
  let error = $state<string | undefined>(undefined);
  let lastUpdated = $state('just now');
  let controlsOpen = $state(false);

  // Simulated "refresh" — in a real app this would fetch from an API.
  async function refresh() {
    loading = true;
    error = undefined;
    await new Promise((r) => setTimeout(r, 700));
    loading = false;
    lastUpdated = 'just now';
  }

  function simulateError() {
    error = 'Network request timed out. Try again or check your VPN.';
  }

  // ── Per-key datasets, exactly as the package contract expects ─────────
  // The component picks the most specific key (e.g. "30d|Day") and falls
  // back through granularity → range → base value.

  const kpis = [
    {
      id: 'mrr', label: 'Revenue', icon: 'dollar-sign', status: 'success' as const,
      target: '$3.0M', value: '$2.4M', delta: '+18%', trend: 'up' as const,
      compareLabel: 'vs last month', progress: 80,
      sparkline: [22, 25, 30, 28, 36, 40, 48],
      byKey: {
        Today: { value: '$24k',  delta: '+9%',  sparkline: [3, 4, 3, 5, 4, 6, 7], progress: 8 },
        '7d':  { value: '$182k', delta: '+6%',  sparkline: [22, 24, 23, 26, 28, 27, 29], progress: 55 },
        '30d': { value: '$780k', delta: '+11%', sparkline: [60, 65, 72, 70, 78, 84, 90], progress: 68 },
        '90d': { value: '$2.4M', delta: '+18%', sparkline: [180, 210, 230, 250, 270, 300, 340], progress: 80 },
        QTD:   { value: '$2.4M', delta: '+18%', compareLabel: 'vs last quarter', progress: 80 },
        YTD:   { value: '$8.9M', delta: '+22%', compareLabel: 'vs last year', progress: 71 }
      }
    },
    {
      id: 'arr', label: 'ARR pacing', icon: 'target', status: 'success' as const,
      value: '$11.4M', unit: '/ $14M', delta: '+22%', trend: 'up' as const,
      compareLabel: 'vs plan', target: '$14M', progress: 81,
      sparkline: [50, 58, 62, 68, 74, 80, 81]
    },
    {
      id: 'newcust', label: 'New customers', icon: 'users',
      value: 142, delta: '+12', trend: 'up' as const, compareLabel: 'vs last month',
      sparkline: [10, 12, 18, 16, 20, 22, 28],
      byKey: {
        Today: { value: 6,    delta: '+1' },
        '7d':  { value: 24,   delta: '+4',   sparkline: [3, 4, 3, 5, 4, 5, 6] },
        '30d': { value: 142,  delta: '+12',  sparkline: [10, 12, 18, 16, 20, 22, 28] },
        '90d': { value: 412,  delta: '+38',  sparkline: [30, 35, 50, 60, 65, 78, 90] },
        YTD:   { value: 1284, delta: '+182' }
      }
    },
    {
      id: 'churn', label: 'Churn', icon: 'trending-down', status: 'warning' as const,
      target: '1.5%', value: '2.1', unit: '%', delta: '-0.4pp', trend: 'down' as const, progress: 60,
      sparkline: [3, 2.8, 2.6, 2.5, 2.4, 2.3, 2.1],
      byKey: {
        '7d':  { value: '1.8', delta: '-0.1pp', progress: 75 },
        '30d': { value: '2.1', delta: '-0.4pp', progress: 60 },
        '90d': { value: '2.4', delta: '-0.6pp', progress: 50 },
        YTD:   { value: '2.7', delta: '-1.1pp', progress: 38 }
      }
    },
    {
      id: 'sla', label: 'SLA breaches', icon: 'alert-octagon', status: 'critical' as const,
      value: 7, delta: '+3', trend: 'up' as const, compareLabel: 'past 24h',
      byKey: {
        Today: { value: 7,   compareLabel: 'past 24h' },
        '7d':  { value: 18,  compareLabel: 'past 7 days' },
        '30d': { value: 47,  compareLabel: 'past 30 days' },
        '90d': { value: 132, compareLabel: 'past 90 days' }
      }
    },
    {
      id: 'nps', label: 'NPS', icon: 'smile',
      value: 64, delta: '+5', trend: 'up' as const, compareLabel: 'vs last survey',
      sparkline: [52, 54, 58, 60, 61, 63, 64]
    }
  ];

  const primaryChart = {
    title: 'Recurring revenue vs. plan',
    type: 'area' as const,
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
  };

  const charts = [
    {
      title: 'Revenue by segment', type: 'donut' as const,
      data: {
        '7d':  [{ label: 'Enterprise', value: 55 }, { label: 'Mid-market', value: 30 }, { label: 'SMB', value: 15 }],
        '30d': [{ label: 'Enterprise', value: 58 }, { label: 'Mid-market', value: 29 }, { label: 'SMB', value: 13 }],
        '90d': [{ label: 'Enterprise', value: 60 }, { label: 'Mid-market', value: 28 }, { label: 'SMB', value: 12 }],
        QTD:   [{ label: 'Enterprise', value: 60 }, { label: 'Mid-market', value: 28 }, { label: 'SMB', value: 12 }],
        YTD:   [{ label: 'Enterprise', value: 63 }, { label: 'Mid-market', value: 26 }, { label: 'SMB', value: 11 }]
      }
    },
    {
      title: 'Top regions', type: 'bar' as const,
      data: {
        '7d':  [{ label: 'US', value: 90 },  { label: 'EU', value: 56 },  { label: 'APAC', value: 36 },  { label: 'LATAM', value: 14 }],
        '30d': [{ label: 'US', value: 410 }, { label: 'EU', value: 240 }, { label: 'APAC', value: 160 }, { label: 'LATAM', value: 62 }],
        '90d': [{ label: 'US', value: 1200 },{ label: 'EU', value: 720 }, { label: 'APAC', value: 480 }, { label: 'LATAM', value: 180 }],
        QTD:   [{ label: 'US', value: 1200 },{ label: 'EU', value: 720 }, { label: 'APAC', value: 480 }, { label: 'LATAM', value: 180 }],
        YTD:   [{ label: 'US', value: 4400 },{ label: 'EU', value: 2600 },{ label: 'APAC', value: 1800 }, { label: 'LATAM', value: 720 }]
      }
    },
    {
      title: 'Pipeline conversion', type: 'line' as const,
      data: {
        Day:   [{ label: 'Mon', value: 8 }, { label: 'Tue', value: 9 }, { label: 'Wed', value: 11 }, { label: 'Thu', value: 10 }, { label: 'Fri', value: 12 }, { label: 'Sat', value: 7 }, { label: 'Sun', value: 8 }],
        Week:  [{ label: 'W22', value: 9 }, { label: 'W23', value: 10 }, { label: 'W24', value: 11 }, { label: 'W25', value: 12 }, { label: 'W26', value: 13 }, { label: 'W27', value: 14 }],
        Month: [{ label: 'Jan', value: 7 }, { label: 'Feb', value: 8 }, { label: 'Mar', value: 9 }, { label: 'Apr', value: 11 }, { label: 'May', value: 12 }, { label: 'Jun', value: 14 }]
      }
    }
  ];

  const table = {
    title: 'Top accounts',
    columns: [
      { key: 'name', label: 'Account' },
      { key: 'plan', label: 'Plan' },
      { key: 'owner', label: 'Owner' },
      { key: 'mrr', label: 'MRR', align: 'right' as const },
      { key: 'delta', label: 'Δ', align: 'right' as const },
      { key: 'health', label: 'Health' }
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
  };

  const activity = [
    { id: 'a1', time: '12m ago', label: 'New deal closed: Globex ($120k)', actor: 'Alice', severity: 'success' as const, icon: 'trophy', category: 'Sales', unread: true },
    { id: 'a2', time: '38m ago', label: 'Onboarding kicked off: Initech', actor: 'Bob', severity: 'info' as const, category: 'Customer success' },
    { id: 'a3', time: '1h ago',  label: 'New signup: Vandelay Industries (Mid-market)', actor: 'Greta', severity: 'info' as const, icon: 'user-plus', category: 'Sales' },
    { id: 'a4', time: '2h ago',  label: 'Churn risk flagged: Hooli', severity: 'warning' as const, icon: 'alert-triangle', category: 'Alerts', unread: true },
    { id: 'a5', time: '3h ago',  label: 'SLA breach: payment-api p95 latency 820ms', severity: 'destructive' as const, icon: 'alert-octagon', category: 'Alerts', unread: true },
    { id: 'a6', time: '5h ago',  label: 'Expansion: Pied Piper upgraded to Enterprise (+$48k)', actor: 'Sam', severity: 'success' as const, icon: 'arrow-up-right', category: 'Sales' },
    { id: 'a7', time: 'Yesterday', label: 'Q1 board report published', actor: 'Carol', severity: 'info' as const, icon: 'file-text', category: 'Reports' },
    { id: 'a8', time: '2d ago',   label: 'Quarterly NPS survey completed (n=4,212)', actor: 'Ops', severity: 'info' as const, icon: 'smile', category: 'Reports' }
  ];

  const headerActions = [
    { id: 'export', label: 'Export', icon: 'download', variant: 'outline' as const },
    { id: 'share', label: 'Share', icon: 'share-2', variant: 'default' as const }
  ];

  function onaction(id: string) {
    if (id === 'export') console.log('Export clicked');
    if (id === 'share') console.log('Share clicked');
  }
</script>

<div class="page">
  <header class="page-header">
    <div class="page-header-top">
      <div>
        <h1>ExecDashboard — live state demo</h1>
        <p>
          Every switch below mutates state on <em>this page</em>. The dashboard component
          receives it via bindable props and per-key data maps — proving the package contract
          that all state and data come from outside.
        </p>
      </div>
      <button
        type="button"
        class="controls-toggle"
        aria-expanded={controlsOpen}
        onclick={() => (controlsOpen = !controlsOpen)}
      >
        {controlsOpen ? 'Hide controls' : 'Show controls'}
      </button>
    </div>

    <div class="controls" class:controls-open={controlsOpen}>
      <label>
        <span>Density</span>
        <select bind:value={density}>
          <option value="comfortable">comfortable</option>
          <option value="compact">compact</option>
        </select>
      </label>
      <button type="button" onclick={refresh} disabled={loading}>
        {loading ? 'Refreshing…' : 'Simulate refresh'}
      </button>
      <button type="button" onclick={simulateError} disabled={!!error}>Simulate error</button>
      <button type="button" onclick={() => (error = undefined)} disabled={!error}>Clear error</button>
      <div class="state-readout">
        <code>range={activeDateRange}</code>
        <code>gran={activeGranularity}</code>
        <code>filter={activeActivityFilter ?? '—'}</code>
      </div>
    </div>
  </header>

  <ExecDashboard
    title="Q2 performance"
    subtitle="Cross-team metrics — flip the range or granularity to see live data swap"
    dateRanges={['Today', '7d', '30d', '90d', 'QTD', 'YTD']}
    granularities={['Day', 'Week', 'Month']}
    bind:activeDateRange
    bind:activeGranularity
    bind:activeActivityFilter
    {density}
    {loading}
    {error}
    {lastUpdated}
    actions={headerActions}
    onrefresh={refresh}
    {kpis}
    {primaryChart}
    {charts}
    {table}
    {activity}
  />
</div>

<style>
  .page {
    max-width: 1280px;
    margin: 0 auto;
    padding: 20px 16px 48px;
  }
  @media (min-width: 768px) {
    .page { padding: 28px 24px 64px; }
  }

  .page-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px dashed var(--border);
  }
  .page-header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .page-header h1 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.25;
  }
  @media (min-width: 640px) {
    .page-header h1 { font-size: 20px; }
  }
  .page-header p {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 12.5px;
    line-height: 1.5;
    max-width: 720px;
  }
  @media (min-width: 640px) {
    .page-header p { font-size: 13px; }
  }

  .controls-toggle {
    height: 30px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--foreground);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .controls-toggle:hover { background: var(--muted); }
  @media (min-width: 768px) {
    /* Controls always visible on desktop — hide the toggle */
    .controls-toggle { display: none; }
  }

  .controls {
    margin-top: 14px;
    display: none;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    font-size: 12.5px;
  }
  .controls.controls-open { display: flex; }
  @media (min-width: 768px) {
    .controls { display: flex; }
  }

  .controls label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted-foreground);
  }
  .controls label > span {
    white-space: nowrap;
  }
  .controls select,
  .controls button {
    height: 30px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--foreground);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .controls button:disabled { opacity: 0.5; cursor: not-allowed; }
  .controls button:hover:not(:disabled) { background: var(--muted); }

  .state-readout {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
    width: 100%;
  }
  @media (min-width: 768px) {
    .state-readout { margin-left: auto; width: auto; }
  }
  .state-readout code {
    font-size: 10.5px;
    padding: 3px 7px;
    border-radius: 4px;
    background: var(--muted);
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }
</style>
