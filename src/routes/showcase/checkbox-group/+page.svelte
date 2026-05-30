<!--
  src/routes/showcase/checkbox-group/+page.svelte
  @file routes/showcase/checkbox-group/+page.svelte
  @description Focused showcase for the Fluid-Functionalism-ported `checkbox-group`
    widget so the captain can HOVER and feel the gliding highlight. Three panels,
    each a declarative <Ripple {spec} /> with bound state:
      1. The glide — a notification-preferences group. Move the cursor down the
         list; the background highlight glides between rows on the 80ms FF-fast
         timing. This is the "Apple-level" interaction the port is about.
      2. Merged backgrounds — a build-your-box group. Check adjacent items and
         their selected backgrounds MERGE into one rounded shape (FF's signature);
         the merged shape morphs on the 160ms FF-moderate spring-overshoot timing.
      3. States — disabled group + per-item disabled, proving the affordances.
    Matches the /showcase/motion sub-route pattern (header + nav + sectioned
    <Ripple> panels). Linked from the showcase index sub-route strip.
  @created 2026-05-30 — RFC 12 premium pack: FF checkbox-group port (PR #45).
-->
<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  let lastEvent = $state('—');
  function handleEvent(event: RippleEvent) {
    lastEvent = `${event.type}${event.name ? ` · ${event.name}` : ''}`;
    console.log('RippleEvent:', event);
  }

  // ── 1. The gliding highlight ────────────────────────────────────
  // Hover down the list — one background element travels between rows on the
  // 80ms FF-fast timing. Realistic, specific copy (no "Option 1/2/3" slop).
  const glideSpec = {
    version: '1.0' as const,
    state: { alerts: ['mentions'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '14px' },
      children: [
        {
          type: 'text',
          props: { text: 'Move your cursor slowly down the rows — the highlight glides to follow it.', size: 'sm' },
          class: 'text-muted-foreground'
        },
        {
          type: 'checkbox-group',
          props: {
            label: 'Notify me about',
            options: [
              { value: 'mentions', label: 'Mentions & replies' },
              { value: 'assigned', label: 'Issues assigned to me' },
              { value: 'reviews', label: 'Review requests' },
              { value: 'deploys', label: 'Deploys to production' },
              { value: 'digest', label: 'Weekly digest' }
            ]
          },
          bind: 'alerts'
        },
        { type: 'text', props: { text: 'Subscribed: {state.alerts}', size: 'xs' }, class: 'text-muted-foreground' }
      ]
    }
  };

  // ── 2. Merged backgrounds (FF signature) ────────────────────────
  // Check adjacent rows → their backgrounds merge into one rounded shape; the
  // merge morphs on the 160ms FF-moderate overshoot timing. Start with a run
  // already selected so the merged shape is visible on load.
  const mergeSpec = {
    version: '1.0' as const,
    state: { build: ['ssd', 'ram'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '14px' },
      children: [
        {
          type: 'text',
          props: { text: 'Check two neighbouring rows — their selected backgrounds merge into one shape.', size: 'sm' },
          class: 'text-muted-foreground'
        },
        {
          type: 'checkbox-group',
          props: {
            label: 'Add to this build',
            options: [
              { value: 'gpu', label: 'Discrete GPU' },
              { value: 'ssd', label: '2 TB NVMe SSD' },
              { value: 'ram', label: '64 GB RAM' },
              { value: 'wifi', label: 'Wi-Fi 7 card' },
              { value: 'warranty', label: '3-year warranty' }
            ]
          },
          bind: 'build'
        },
        { type: 'text', props: { text: 'In your build: {state.build}', size: 'xs' }, class: 'text-muted-foreground' }
      ]
    }
  };

  // ── 3. States ───────────────────────────────────────────────────
  // A fully-disabled group, plus a group with one disabled row, so the disabled
  // affordance (no glide, no toggle, dimmed) is visible next to a live one.
  const statesSpec = {
    version: '1.0' as const,
    state: { plan: ['pro'] },
    ui: {
      type: 'grid',
      props: { columns: 2, gap: '24px' },
      children: [
        {
          type: 'checkbox-group',
          props: {
            label: 'Add-ons (one locked to your plan)',
            options: [
              { value: 'pro', label: 'Priority support' },
              { value: 'sso', label: 'SSO / SAML' },
              { value: 'audit', label: 'Audit log' },
              { value: 'sla', label: 'Custom SLA', disabled: true }
            ]
          },
          bind: 'plan'
        },
        {
          type: 'checkbox-group',
          props: {
            label: 'Archived workspace (read-only)',
            disabled: true,
            options: ['Billing', 'Members', 'Integrations']
          }
        }
      ]
    }
  };
</script>

<div class="showcase">
  <header class="showcase-header">
    <h1>Checkbox group — the gliding highlight</h1>
    <p>
      Ported from <a href="https://www.fluidfunctionalism.com/docs/checkbox-group" target="_blank" rel="noreferrer">Fluid Functionalism</a>
      (MIT) onto Ripple's motion primitive. A single background element
      <strong>glides</strong> between rows as you hover — driven by a CSS
      transition on the highlight's box, timed by the FF spring tokens
      (<code>fast</code> 80ms for the glide, <code>moderate</code> 160ms for the
      merge). Everything below is a declarative <code>&lt;Ripple&gt;</code> spec.
    </p>
    <nav class="showcase-nav">
      <a href="#glide">The glide</a>
      <a href="#merge">Merged backgrounds</a>
      <a href="#states">States</a>
      <a href="/showcase/motion">← Motion primitive</a>
    </nav>
    <p class="last-event">Last host event: <strong>{lastEvent}</strong></p>
  </header>

  <section id="glide" class="showcase-section">
    <h2 class="showcase-section-title">The gliding highlight — <code>FF_SPRING_TOKENS.fast</code> (80ms)</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <Ripple spec={glideSpec} onEvent={handleEvent} />
      </div>
    </div>
  </section>

  <section id="merge" class="showcase-section">
    <h2 class="showcase-section-title">Merged backgrounds for contiguous selections — <code>FF_SPRING_TOKENS.moderate</code> (160ms)</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <Ripple spec={mergeSpec} onEvent={handleEvent} />
      </div>
    </div>
  </section>

  <section id="states" class="showcase-section">
    <h2 class="showcase-section-title">States — disabled group &amp; per-item disabled</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <Ripple spec={statesSpec} onEvent={handleEvent} />
      </div>
    </div>
  </section>
</div>

<style>
  .showcase {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    color: hsl(var(--foreground));
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
    color: hsl(var(--muted-foreground));
    margin: 0 0 1rem;
    max-width: 65ch;
    line-height: 1.6;
  }
  .showcase-header a {
    color: hsl(var(--foreground));
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .showcase-header code {
    background: hsl(var(--muted) / 0.5);
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
    background: hsl(var(--muted) / 0.4);
    color: hsl(var(--foreground));
    text-decoration: none;
    transition: background 0.15s;
  }
  .showcase-nav a:hover {
    background: hsl(var(--muted));
  }
  .showcase-section {
    margin-bottom: 2.5rem;
  }
  .showcase-section-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid hsl(var(--border));
  }
  .showcase-section-title code {
    background: hsl(var(--muted) / 0.5);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .showcase-item {
    border: 1px solid hsl(var(--border));
    border-radius: 10px;
    overflow: hidden;
  }
  .showcase-item-demo {
    padding: 1.5rem;
    background: hsl(var(--background));
  }
</style>
