<script lang="ts">
  import Ripple from '$lib/Ripple.svelte';

  const revenueCardSpec = {
    ui: {
      type: 'card',
      props: { title: 'Monthly revenue', description: 'Last 30 days' },
      children: [
        {
          type: 'stat',
          slot: 'header',
          props: {
            value: 12450.32,
            format: 'currency',
            deltaPercent: 3.4,
            direction: 'up-good',
            size: 'sm',
            align: 'right'
          }
        },
        {
          type: 'container',
          props: { class: 'h-16 rounded bg-muted/50' },
          children: []
        },
        {
          type: 'text',
          slot: 'footer',
          props: { text: 'Updated 2m ago', class: 'text-xs text-muted-foreground' }
        }
      ]
    }
  };

  const statGridSpec = {
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

  const latencyCardSpec = {
    ui: {
      type: 'card',
      props: { title: 'p95 latency', description: 'Last hour' },
      children: [
        {
          type: 'stat',
          slot: 'header',
          props: {
            value: 187,
            deltaPercent: 12.4,
            direction: 'down-good',
            size: 'sm',
            align: 'right'
          }
        },
        {
          type: 'container',
          props: { class: 'h-16 rounded bg-muted/50' },
          children: []
        }
      ]
    }
  };
</script>

<div class="mx-auto max-w-4xl space-y-10 p-8">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold">JSON-spec composition</h1>
    <p class="text-muted-foreground">
      Card + Stat rendered from declarative JSON specs — the shape agents emit into pockets.
      Uses <code class="text-xs bg-muted px-1 py-0.5 rounded">slot: 'header'</code> to route
      children into Card's named snippet slots.
    </p>
  </header>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">
      Revenue card (positive trend, up-good)
    </h2>
    <Ripple spec={revenueCardSpec} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">
      Latency card (increase = bad, down-good)
    </h2>
    <Ripple spec={latencyCardSpec} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase text-muted-foreground tracking-wide">
      Grid of stats
    </h2>
    <Ripple spec={statGridSpec} />
  </section>
</div>
