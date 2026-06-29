<!--
  src/routes/showcase/moving-indicator/+page.svelte
  @file routes/showcase/moving-indicator/+page.svelte
  @description Showcase for the GENERIC `movingIndicator` (shared-layout)
    primitive — "a highlight springs to the active item among its siblings."
    The page proves genericity: ONE primitive drives TWO different widgets with
    TWO different active sources, side by side, so the captain can see it.
      1. SEGMENTED CONTROL — active source = SELECTION. A white pill glides to the
         selected segment (axis 'x', FF-fast 80ms). The classic macOS control.
      2. CHECKBOX GROUP — active source = HOVER. The same primitive drives the
         hover highlight that glides between UNSELECTED rows (the doubled-highlight
         bug is fixed — hovering a selected row shows no separate highlight).
    Both indicators are a single `use:movingIndicator` element; the only
    difference is what they treat as "active." Matches the /showcase/checkbox-group
    + /showcase/motion sub-route pattern (header + nav + sectioned panels).
  @created 2026-05-30 — RFC 12: generic moving-indicator primitive showcase.
-->
<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';
  import SegmentedControl from './SegmentedControl.svelte';

  let lastEvent = $state('—');
  function handleEvent(event: RippleEvent) {
    lastEvent = `${event.type}${event.name ? ` · ${event.name}` : ''}`;
    console.log('RippleEvent:', event);
  }

  // ── Consumer 1: segmented control (active = SELECTION) ──────────────
  let viewMode = $state('Board');
  let range = $state('30 days');
  let density = $state('Comfortable');

  // ── Consumer 2: checkbox group (active = HOVER) ─────────────────────
  // A declarative Ripple spec — the SAME widget that was refactored onto the
  // primitive. Start with a contiguous run selected so the merged block is
  // visible and the captain can hover an already-selected row to confirm the
  // doubled-highlight bug is gone.
  const checkboxSpec = {
    version: '1.0' as const,
    state: { scopes: ['repo', 'workflow'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '14px' },
      children: [
        {
          type: 'text',
          props: { text: 'Hover an already-checked row — no second highlight paints inside the selection. Hover an unchecked row — the highlight glides to it.', size: 'sm' },
          class: 'text-muted-foreground'
        },
        {
          type: 'checkbox-group',
          props: {
            label: 'Token scopes',
            options: [
              { value: 'repo', label: 'Repository access' },
              { value: 'workflow', label: 'Workflow runs' },
              { value: 'packages', label: 'Package registry' },
              { value: 'webhooks', label: 'Webhook delivery' },
              { value: 'gist', label: 'Gist read & write' }
            ]
          },
          bind: 'scopes'
        },
        { type: 'text', props: { text: 'Granted: {state.scopes}', size: 'xs' }, class: 'text-muted-foreground' }
      ]
    }
  };
</script>

<div class="showcase">
  <header class="showcase-header">
    <h1>The moving indicator — one primitive, many widgets</h1>
    <p>
      A reusable <code>movingIndicator</code> action: a highlight springs to the
      active item among its siblings. Mount it on a highlight element, tell it the
      container, how to enumerate the items, and which one is active — it measures
      the active item's box (transform-immune <code>offset*</code>) and glides the
      highlight there on the FF <code>fast</code> (80ms) token. The two demos below
      run the <strong>same primitive</strong>; the only difference is what each
      calls "active" — <strong>selection</strong> on the left, <strong>hover</strong>
      on the right.
    </p>
    <nav class="showcase-nav">
      <a href="#segmented">Segmented control (selection)</a>
      <a href="#checkbox">Checkbox group (hover)</a>
      <a href="/showcase/checkbox-group">Checkbox group sub-route</a>
      <a href="/showcase/motion">← Motion primitive</a>
    </nav>
    <p class="last-event">Last host event: <strong>{lastEvent}</strong></p>
  </header>

  <section id="segmented" class="showcase-section">
    <h2 class="showcase-section-title">
      Consumer 1 — segmented control · active source = <code>selection</code>
    </h2>
    <p class="showcase-note">
      Click a segment (or arrow-key it). The white pill glides to the selection —
      <code>movingIndicator</code> with <code>axis: 'x'</code>, active = the
      selected index.
    </p>
    <div class="showcase-item">
      <div class="showcase-item-demo demo-stack">
        <SegmentedControl
          label="View"
          segments={['Board', 'Timeline', 'Calendar', 'Table']}
          bind:value={viewMode}
        />
        <SegmentedControl
          label="Date range"
          segments={['7 days', '30 days', '90 days', 'Year']}
          bind:value={range}
        />
        <SegmentedControl
          label="Row density"
          segments={['Compact', 'Comfortable', 'Spacious']}
          bind:value={density}
        />
        <p class="readout">
          View <strong>{viewMode}</strong> · Range <strong>{range}</strong> ·
          Density <strong>{density}</strong>
        </p>
      </div>
    </div>
  </section>

  <section id="checkbox" class="showcase-section">
    <h2 class="showcase-section-title">
      Consumer 2 — checkbox group · active source = <code>hover</code>
    </h2>
    <p class="showcase-note">
      The same primitive drives the hover highlight (it tracks unselected rows
      only). Two rows start selected as one merged block — hover it to confirm no
      doubled highlight paints inside the selection.
    </p>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <Ripple spec={checkboxSpec} onEvent={handleEvent} />
      </div>
    </div>
  </section>
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
    letter-spacing: -0.02em;
    margin: 0 0 0.25rem;
  }
  .showcase-header p {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    margin: 0 0 1rem;
    max-width: 65ch;
    line-height: 1.6;
  }
  .showcase-header a {
    color: var(--foreground);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  code {
    background: color-mix(in srgb, var(--muted) 50%, transparent);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  .last-event {
    font-size: 0.8rem;
  }
  .showcase-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 1rem;
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
    margin: 0 0 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
  }
  .showcase-note {
    font-size: 0.85rem;
    color: var(--muted-foreground);
    margin: 0 0 1rem;
    max-width: 65ch;
    line-height: 1.55;
  }
  .showcase-item {
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
  .showcase-item-demo {
    padding: 1.5rem;
    background: var(--background);
  }
  .demo-stack {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .readout {
    font-size: 0.8rem;
    color: var(--muted-foreground);
    margin: 0.25rem 0 0;
  }
</style>
