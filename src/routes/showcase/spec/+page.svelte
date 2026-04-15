<script lang="ts">
  import Ripple from '$lib/Ripple.svelte';

  // 30-day revenue series (trending up)
  const revenueSeries = Array.from({ length: 30 }, (_, i) => ({
    label: `Day ${i + 1}`,
    value: 8000 + Math.round(Math.sin(i / 5) * 800 + i * 140 + Math.random() * 400),
  }));

  // hourly p95 latency (ms) (trending up — bad for down-good)
  const latencySeries = Array.from({ length: 24 }, (_, i) => ({
    label: `${i}:00`,
    value: 140 + Math.round(Math.cos(i / 4) * 30 + i * 1.8 + Math.random() * 14),
  }));

  // weekly signups (bar)
  const signupsSeries = [
    { label: 'Mon', value: 32 },
    { label: 'Tue', value: 41 },
    { label: 'Wed', value: 38 },
    { label: 'Thu', value: 57 },
    { label: 'Fri', value: 64 },
    { label: 'Sat', value: 29 },
    { label: 'Sun', value: 18 }
  ];

  // error-rate share (donut)
  const errorShare = [
    { label: '5xx', value: 4 },
    { label: '4xx', value: 38 },
    { label: 'Timeout', value: 12 },
    { label: 'OK', value: 946 }
  ];

  const revenueCardSpec = {
    ui: {
      type: 'card',
      props: { title: 'Monthly revenue', description: 'Last 30 days' },
      children: [
        {
          type: 'stat',
          slot: 'header',
          props: {
            value: 12450.32, format: 'currency',
            deltaPercent: 3.4, direction: 'up-good',
            size: 'sm', align: 'right'
          }
        },
        {
          type: 'chart',
          props: { type: 'area', data: revenueSeries, height: 120, tooltip: false }
        },
        {
          type: 'text',
          slot: 'footer',
          props: { text: 'Updated 2m ago', class: 'text-xs text-muted-foreground' }
        }
      ]
    }
  };

  const latencyCardSpec = {
    ui: {
      type: 'card',
      props: { title: 'p95 latency', description: 'Last hour' },
      children: [
        {
          type: 'stat',
          slot: 'header',
          props: {
            value: 187, deltaPercent: 12.4, direction: 'down-good',
            size: 'sm', align: 'right'
          }
        },
        {
          type: 'chart',
          props: { type: 'line', data: latencySeries, height: 120, tooltip: false }
        }
      ]
    }
  };

  const signupsCardSpec = {
    ui: {
      type: 'card',
      props: { title: 'Signups this week', description: 'Daily total' },
      children: [
        {
          type: 'stat',
          slot: 'header',
          props: { value: 279, deltaPercent: 18.2, direction: 'up-good', size: 'sm', align: 'right' }
        },
        {
          type: 'chart',
          props: { type: 'bar', data: signupsSeries, height: 140, tooltip: true }
        }
      ]
    }
  };

  const errorShareCardSpec = {
    ui: {
      type: 'card',
      props: { title: 'Response mix', description: 'Last 24h' },
      children: [
        {
          type: 'chart',
          props: { type: 'donut', data: errorShare, height: 180, tooltip: true }
        }
      ]
    }
  };

  const kpiRowSpec = {
    ui: {
      type: 'grid',
      props: { columns: 3, gap: 3 },
      children: [
        { type: 'stat', props: { label: 'Revenue', value: 12450, format: 'currency', deltaPercent: 3.4, direction: 'up-good' } },
        { type: 'stat', props: { label: 'Signups', value: 247, deltaPercent: 18.2, direction: 'up-good' } },
        { type: 'stat', props: { label: 'Churn', value: 0.034, format: 'percent', deltaPercent: -0.8, direction: 'down-good' } }
      ]
    }
  };

  const sparkCardSpec = {
    ui: {
      type: 'card',
      props: { title: 'Active sessions', description: 'Real-time' },
      children: [
        {
          type: 'stat',
          slot: 'header',
          props: { value: 1284, deltaPercent: 2.1, direction: 'up-good', size: 'sm', align: 'right' }
        },
        {
          type: 'chart',
          props: { type: 'sparkline', data: revenueSeries.slice(-20), height: 40, tooltip: false }
        }
      ]
    }
  };
</script>

<div class="mx-auto max-w-5xl space-y-10 p-8">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold">JSON-spec composition</h1>
    <p class="text-muted-foreground">
      Card + Stat + Chart rendered from declarative JSON specs — the shape agents emit into pockets.
      Uses <code class="text-xs bg-muted px-1 py-0.5 rounded">slot: 'header'</code> to route
      children into Card's named snippet slots.
    </p>
  </header>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">KPI row</h2>
    <Ripple spec={kpiRowSpec} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">
      Chart-in-card — area (revenue, up-good)
    </h2>
    <Ripple spec={revenueCardSpec} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">
      Chart-in-card — line (latency, down-good)
    </h2>
    <Ripple spec={latencyCardSpec} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">
      Chart-in-card — bar (weekly signups)
    </h2>
    <Ripple spec={signupsCardSpec} />
  </section>

  <section class="grid grid-cols-2 gap-4">
    <div class="space-y-3">
      <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">
        Sparkline in card
      </h2>
      <Ripple spec={sparkCardSpec} />
    </div>
    <div class="space-y-3">
      <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">
        Donut in card
      </h2>
      <Ripple spec={errorShareCardSpec} />
    </div>
  </section>
</div>
