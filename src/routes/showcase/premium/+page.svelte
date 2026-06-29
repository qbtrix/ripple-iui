<!--
  Created: 2026-05-30 — RFC 12 premium-pack showcase. Renders the 8 ported
  premium widgets (svelte-animations + aceternity.sveltekit.io, all MIT), each
  in its own labeled demo so the captain can see the motion: marquee,
  border-beam, shimmer, animated-beam, aurora, spotlight, bento-grid,
  text-effect. Each panel is one declarative <Ripple {spec} onEvent={...} />,
  matching the card/stat/flow sub-route pattern. All effects are pure CSS/SVG
  (Tier 0) and SSR-safe; nothing touches the motion engine.
-->
<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  function handleEvent(event: RippleEvent) {
    console.log('RippleEvent:', event);
  }

  // 1 ── marquee — seamless scrolling row, pauses on hover
  const marqueeSpec = {
    version: '1.0' as const,
    ui: {
      type: 'marquee',
      props: { duration: 22, pauseOnHover: true },
      class: 'py-2',
      children: [
        { type: 'badge', props: { text: 'Acme', variant: 'secondary' } },
        { type: 'badge', props: { text: 'Globex', variant: 'secondary' } },
        { type: 'badge', props: { text: 'Initech', variant: 'secondary' } },
        { type: 'badge', props: { text: 'Soylent', variant: 'secondary' } },
        { type: 'badge', props: { text: 'Hooli', variant: 'secondary' } },
        { type: 'badge', props: { text: 'Vandelay', variant: 'secondary' } },
        { type: 'badge', props: { text: 'Pied Piper', variant: 'secondary' } },
      ],
    },
  };

  // 2 ── border-beam — gradient beam orbiting a card border
  const borderBeamSpec = {
    version: '1.0' as const,
    ui: {
      type: 'border-beam',
      props: { duration: 7, size: 2 },
      class: 'rounded-xl border bg-card p-6 max-w-sm',
      children: [
        { type: 'flex', props: { direction: 'column', gap: '4px' }, children: [
          { type: 'heading', props: { text: 'Pro plan', level: 4 } },
          { type: 'text', props: { text: 'A beam orbits the border to draw the eye to the featured card.', size: 'sm' }, class: 'text-muted-foreground' },
        ] },
      ],
    },
  };

  // 3 ── shimmer — moving highlight band swept across a label
  const shimmerSpec = {
    version: '1.0' as const,
    ui: {
      type: 'shimmer',
      props: { duration: 2.4, width: '120px' },
      class: 'text-xl font-semibold inline-block',
      children: [{ type: 'text', props: { text: 'Get early access' } }],
    },
  };

  // 4 ── animated-beam — SVG curve with a flowing gradient pulse
  const animatedBeamSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '6px' },
      children: [
        { type: 'animated-beam', props: { duration: 4, curvature: -50 }, class: 'h-24 text-muted-foreground' },
        { type: 'text', props: { text: 'A gradient pulse flows along the curve — suggests a connection or data flow.', size: 'sm' }, class: 'text-muted-foreground' },
      ],
    },
  };

  // 5 ── aurora — soft drifting multi-gradient backdrop behind content
  const auroraSpec = {
    version: '1.0' as const,
    ui: {
      type: 'aurora',
      props: { speed: 12 },
      class: 'min-h-[260px] flex items-center justify-center p-12 rounded-xl border',
      children: [
        { type: 'flex', props: { direction: 'column', gap: '8px', align: 'center' }, children: [
          { type: 'heading', props: { text: 'Sites that move', level: 2 } },
          { type: 'text', props: { text: 'A drifting aurora makes a great hero backdrop.', size: 'sm' } },
        ] },
      ],
    },
  };

  // 6 ── spotlight — radial highlight that follows the cursor on hover
  const spotlightSpec = {
    version: '1.0' as const,
    ui: {
      type: 'spotlight',
      props: { size: '360px' },
      class: 'rounded-xl border bg-card p-10 flex items-center justify-center min-h-[200px]',
      children: [
        { type: 'flex', props: { direction: 'column', gap: '6px', align: 'center' }, children: [
          { type: 'heading', props: { text: 'Hover to light it up', level: 3 } },
          { type: 'text', props: { text: 'Move your cursor across the card — a radial highlight tracks it.', size: 'sm' }, class: 'text-muted-foreground' },
        ] },
      ],
    },
  };

  // 7 ── bento-grid — bento/masonry feature grid with spanning cells
  const bentoGridSpec = {
    version: '1.0' as const,
    ui: {
      type: 'bento-grid',
      props: {
        columns: 3,
        items: [
          { title: 'Edge-fast', description: 'Served from the closest edge node, worldwide.', span: 2 },
          { title: 'White-label', description: 'Your brand, end to end.', span: 1 },
          { title: 'No infra', description: 'We host it.', span: 1 },
          { title: 'Edit by chat', description: 'Change anything just by asking — the spec re-renders in place.', span: 2 },
        ],
      },
    },
  };

  // 8 ── text-effect — staggered per-word / per-char text reveal
  const textEffectSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '14px', align: 'start' },
      children: [
        { type: 'text-effect', props: { text: 'Build. Brand. Ship.', effect: 'gradient', by: 'word' }, class: 'text-4xl font-bold' },
        { type: 'text-effect', props: { text: 'Describe it and it appears', effect: 'fade-in', by: 'char', stagger: 0.02 }, class: 'text-xl font-medium' },
        { type: 'text-effect', props: { text: 'Get early access', effect: 'shimmer', by: 'word' }, class: 'text-lg font-semibold' },
      ],
    },
  };

  // Drives the labeled grid below. Each entry is rendered through its own
  // isolated <Ripple> instance.
  const demos = [
    { id: 'marquee', label: 'marquee', note: 'Seamless scrolling row — pauses on hover.', spec: marqueeSpec },
    { id: 'border-beam', label: 'border-beam', note: 'Gradient beam orbiting a card border.', spec: borderBeamSpec },
    { id: 'shimmer', label: 'shimmer', note: 'Highlight band swept across a label.', spec: shimmerSpec },
    { id: 'animated-beam', label: 'animated-beam', note: 'SVG curve with a flowing gradient pulse.', spec: animatedBeamSpec },
    { id: 'aurora', label: 'aurora', note: 'Drifting multi-gradient backdrop.', spec: auroraSpec },
    { id: 'spotlight', label: 'spotlight', note: 'Radial highlight following the cursor.', spec: spotlightSpec },
    { id: 'bento-grid', label: 'bento-grid', note: 'Masonry feature grid with spanning cells.', spec: bentoGridSpec },
    { id: 'text-effect', label: 'text-effect', note: 'Staggered per-word / per-char reveal.', spec: textEffectSpec },
  ];
</script>

<div class="showcase">
  <header class="showcase-header">
    <h1>Premium pack — 8 motion widgets</h1>
    <p>
      The ported premium widgets (svelte-animations + aceternity.sveltekit.io,
      all MIT). Every effect is pure CSS/SVG (Tier 0) and SSR-safe. Each demo
      below is its own declarative <code>&lt;Ripple&gt;</code> spec. Hover the
      <code>marquee</code>, <code>spotlight</code>, and <code>border-beam</code>
      to see them react.
    </p>
    <nav class="showcase-nav">
      {#each demos as d}
        <a href={`#${d.id}`}>{d.label}</a>
      {/each}
    </nav>
  </header>

  {#each demos as d}
    <section id={d.id} class="showcase-section">
      <h2 class="showcase-section-title"><code>{d.label}</code></h2>
      <div class="showcase-item">
        <p class="showcase-item-title">{d.note}</p>
        <div class="showcase-item-demo">
          <Ripple spec={d.spec} onEvent={handleEvent} />
        </div>
      </div>
    </section>
  {/each}
</div>

<style>
  .showcase {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    color: var(--foreground);
  }
  .showcase-header {
    margin-bottom: 2.5rem;
  }
  .showcase-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }
  .showcase-header p {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    margin: 0 0 1rem;
    max-width: 72ch;
  }
  .showcase-header code {
    background: color-mix(in srgb, var(--muted) 50%, transparent);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  .showcase-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .showcase-nav a {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    background: color-mix(in srgb, var(--muted) 40%, transparent);
    color: var(--foreground);
    text-decoration: none;
    transition: background 0.15s;
  }
  .showcase-nav a:hover {
    background: var(--muted);
  }
  .showcase-section {
    margin-bottom: 2.5rem;
  }
  .showcase-section-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
  }
  .showcase-section-title code {
    background: color-mix(in srgb, var(--muted) 50%, transparent);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.95rem;
    font-weight: 500;
  }
  .showcase-item {
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
  .showcase-item-title {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 8px 14px;
    margin: 0;
    background: color-mix(in srgb, var(--muted) 25%, transparent);
    border-bottom: 1px solid var(--border);
    color: var(--muted-foreground);
  }
  .showcase-item-demo {
    padding: 1.5rem;
    background: var(--background);
    overflow: hidden;
  }
</style>
