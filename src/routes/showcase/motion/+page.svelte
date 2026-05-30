<!--
  Created: 2026-05-30 — RFC 12 motion-primitive showcase. Renders declarative
  Ripple specs that exercise the node-level `motion` field so the captain can
  SEE the motion: staggered fade-up-on-scroll cards (motion.inView + per-card
  transition.delay), a magnetic/spring hover CTA (motion.hover/tap, `bouncy`),
  the `reveal` + `parallax` sugar widgets, and a button that fires the
  `animate` action. Each panel is one <Ripple {spec} onEvent={...} />, matching
  the card/stat/flow sub-route pattern.
  Changes:
    - 2026-05-30 (PR #45 motion runtime close-out): the staggered cards and the
      parallax demo now animate for real. The cascade is driven by per-card
      transition.delay in SECONDS (delay: i * 0.12 → 0/120/240/360ms) — FIX 2 —
      and each card now both fades AND rises because inView arms the full
      from-state (FIX 1). The parallax panel is powered by the new motion.scroll
      runtime (FIX 3: IO/scroll-rAF translateY every frame, the robust path).
    - 2026-05-30 (PR #45 animate runtime): the `animate` action now VISIBLY moves
      a target. The button was re-authored per the AnimateHandler schema
      ({ action, target, motion }) — the old { action: 'animate', name: 'pulse' }
      was wrong (`name` is not a field, so target + motion arrived undefined). It
      now targets a card by id ('animate-target') and the dispatcher's runtime
      pulses that node through the shared withMotion engine, so the click moves
      pixels with no host code. The host still echoes the event below.
-->
<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  let lastEvent = $state('—');
  function handleEvent(event: RippleEvent) {
    // Surface host-delegated events (e.g. the `animate` action) so the demo is
    // visibly interactive even for actions Ripple hands back to the host.
    lastEvent = `${event.type}${event.name ? ` · ${event.name}` : ''}`;
    console.log('RippleEvent:', event);
  }

  // ── 1. Staggered fade-up on scroll ──────────────────────────────
  // Each card carries an inView motion (fade + rise) plus a per-card delay so
  // the row cascades in. The cascade is the increasing transition.delay (in
  // SECONDS) across the four cards — NOT the parent-orchestrated `stagger`
  // field. inView arms the full from-state, so each card fades AND rises.
  const STEPS = [
    { n: '01', title: 'Describe', body: 'Tell the agent what you want in plain language.' },
    { n: '02', title: 'Generate', body: 'Ripple compiles a spec into live Svelte UI.' },
    { n: '03', title: 'Refine', body: 'Keep editing by chat — the spec re-renders in place.' },
    { n: '04', title: 'Ship', body: 'Publish to the edge. Your brand, your domain.' },
  ];

  const staggerSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'text', props: { text: 'Scroll so this row enters the viewport — the cards fade + rise in sequence.', size: 'sm' }, class: 'text-muted-foreground' },
        {
          type: 'grid',
          props: { columns: 4, gap: '12px' },
          children: STEPS.map((s, i) => ({
            type: 'card',
            props: { title: `${s.n} · ${s.title}` },
            // inView fade-up; the delay cascades 0 → 0.36s across the four cards.
            motion: {
              inView: { opacity: 0, y: 28, once: true, amount: 0.2 },
              transition: { preset: 'smooth', delay: i * 0.12 },
            },
            children: [{ type: 'text', props: { text: s.body, size: 'sm' }, class: 'text-muted-foreground' }],
          })),
        },
      ],
    },
  };

  // ── 2. Magnetic / spring hover CTA (bouncy preset) ──────────────
  // hover lifts + scales, tap presses in. The `bouncy` spring overshoots so the
  // button feels magnetic. Two buttons: the primary CTA and a ghost.
  const magneticCtaSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '16px', align: 'center', wrap: 'wrap' },
      class: 'py-6',
      children: [
        {
          type: 'button',
          props: { label: 'Start building', size: 'lg' },
          motion: {
            hover: { y: -4, scale: 1.06 },
            tap: { scale: 0.95 },
            transition: { preset: 'bouncy' },
          },
        },
        {
          type: 'button',
          props: { label: 'See a demo', variant: 'outline', size: 'lg' },
          motion: {
            hover: { y: -2, scale: 1.03 },
            tap: { scale: 0.97 },
            transition: { preset: 'snappy' },
          },
        },
        { type: 'text', props: { text: 'Hover and press — the spring overshoots on the way up, presses in on tap.', size: 'sm' }, class: 'text-muted-foreground' },
      ],
    },
  };

  // ── 3. `reveal` sugar widget ────────────────────────────────────
  // The author writes { type: 'reveal' } — it desugars to an inView motion.
  // Four directions so the captain can see up / down / left / right travel.
  const revealSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        {
          type: 'grid',
          props: { columns: 2, gap: '16px' },
          children: [
            {
              type: 'reveal',
              props: { direction: 'up' },
              children: [{ type: 'card', props: { title: 'reveal · up' }, children: [{ type: 'text', props: { text: 'Rises 24px into view.', size: 'sm' } }] }],
            },
            {
              type: 'reveal',
              props: { direction: 'left' },
              children: [{ type: 'card', props: { title: 'reveal · left' }, children: [{ type: 'text', props: { text: 'Slides in from the left.', size: 'sm' } }] }],
            },
            {
              type: 'reveal',
              props: { direction: 'right' },
              children: [{ type: 'card', props: { title: 'reveal · right' }, children: [{ type: 'text', props: { text: 'Slides in from the right.', size: 'sm' } }] }],
            },
            {
              type: 'reveal',
              props: { direction: 'fade' },
              children: [{ type: 'card', props: { title: 'reveal · fade' }, children: [{ type: 'text', props: { text: 'Pure opacity fade, no travel.', size: 'sm' } }] }],
            },
          ],
        },
      ],
    },
  };

  // ── 4. `parallax` sugar widget ──────────────────────────────────
  // Contents drift vertically as the page scrolls. Sugar over a scroll motion.
  const parallaxSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'parallax',
          props: { distance: 50 },
          children: [
            {
              type: 'card',
              props: { title: 'I drift on scroll' },
              children: [{ type: 'text', props: { text: 'As you scroll the page, this card drifts vertically relative to the flow. Scroll up and down to feel the depth.', size: 'sm' }, class: 'text-muted-foreground' }],
            },
          ],
        },
      ],
    },
  };

  // ── 5. The `animate` action ─────────────────────────────────────
  // on_click fires the `animate` action against a target widget BY ID. The
  // runtime locates that node (id: 'animate-target') and pulses it via the
  // shared withMotion engine — so the click VISIBLY moves the badge on screen
  // with no host code. The host (this page) ALSO receives the event via onEvent
  // and echoes it below, proving the action both animates AND round-trips.
  //
  // AUTHORED PER THE AnimateHandler SCHEMA: `{ action, target, motion }`. The
  // earlier `{ action: 'animate', name: 'pulse' }` was wrong — `name` is not a
  // field, so target + motion arrived undefined and nothing animated.
  const animateActionSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px', align: 'start' },
      children: [
        {
          type: 'button',
          props: { label: 'Fire animate action', icon: 'sparkles' },
          // Pulse the target: pop up + scale, bouncy spring on the return.
          on_click: {
            action: 'animate',
            target: 'animate-target',
            motion: { enter: { scale: 1.35, y: -14 }, transition: { preset: 'bouncy' } },
          },
          // also give the button itself a tactile hover so the trigger feels alive
          motion: { hover: { scale: 1.04 }, tap: { scale: 0.96 }, transition: { preset: 'snappy' } },
        },
        // The animation target. Its id is what the `animate` action above resolves
        // and pulses. A small card so the motion is unmistakable on screen.
        {
          type: 'card',
          id: 'animate-target',
          props: { title: 'Pulse me', description: 'Click the button — I scale + pop, then settle back.' },
          class: 'inline-block',
        },
        { type: 'text', props: { text: 'The `animate` action targets the badge by id and pulses it through the runtime — no host code. The host also echoes the event below.', size: 'sm' }, class: 'text-muted-foreground' },
      ],
    },
  };
</script>

<div class="showcase">
  <header class="showcase-header">
    <h1>Motion — the animation primitive</h1>
    <p>
      Everything below is a declarative JSON spec rendered through
      <code>&lt;Ripple&gt;</code>. The <code>motion</code> field is a sibling to
      <code>props</code>/<code>class</code>/<code>style</code> on any node — no
      per-widget wiring. Scroll, hover, and click to see it move.
    </p>
    <nav class="showcase-nav">
      <a href="#stagger">Staggered scroll</a>
      <a href="#hover">Magnetic hover</a>
      <a href="#reveal">reveal</a>
      <a href="#parallax">parallax</a>
      <a href="#animate">animate action</a>
    </nav>
    <p class="last-event">Last host event: <strong>{lastEvent}</strong></p>
  </header>

  <section id="stagger" class="showcase-section">
    <h2 class="showcase-section-title">Staggered fade-up on scroll — <code>motion.inView</code></h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <Ripple spec={staggerSpec} onEvent={handleEvent} />
      </div>
    </div>
  </section>

  <section id="hover" class="showcase-section">
    <h2 class="showcase-section-title">Magnetic / spring hover — <code>motion.hover</code> + <code>tap</code> (bouncy)</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <Ripple spec={magneticCtaSpec} onEvent={handleEvent} />
      </div>
    </div>
  </section>

  <section id="reveal" class="showcase-section">
    <h2 class="showcase-section-title">The <code>reveal</code> sugar widget</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <Ripple spec={revealSpec} onEvent={handleEvent} />
      </div>
    </div>
  </section>

  <section id="parallax" class="showcase-section">
    <h2 class="showcase-section-title">The <code>parallax</code> sugar widget</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <Ripple spec={parallaxSpec} onEvent={handleEvent} />
      </div>
    </div>
  </section>

  <section id="animate" class="showcase-section">
    <h2 class="showcase-section-title">The <code>animate</code> action</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <Ripple spec={animateActionSpec} onEvent={handleEvent} />
      </div>
    </div>
  </section>

  <!-- Tall spacer so the scroll-driven demos (inView + parallax) have room to
       animate as the page scrolls. -->
  <div class="scroll-spacer" aria-hidden="true"></div>
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
    margin: 0 0 0.25rem;
  }
  .showcase-header p {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 1rem;
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
  .scroll-spacer {
    height: 60vh;
  }
</style>
