<!--
  @file routes/labs/+page.svelte
  @description Labs hub — the index for the Ripple design-module playgrounds
    (visual editor, design system, slides). A discoverable landing reachable from
    the topbar, so the labs aren't URL-only. Fully theme-aware: reads the shadcn
    tokens directly as `var(--token)` (the tokens already resolve to full hsl()
    values, so they must NOT be re-wrapped in hsl(); alpha tints use color-mix).
    Refined/technical aesthetic cohesive with the app: monospace eyebrows, a quiet
    dotted-grid backdrop, and cards that lift with an accent rail on hover.
  @created 2026-06-29 (labs hub + lab theming pass)
-->
<script lang="ts">
  const labs = [
    {
      href: '/editor-lab',
      tag: 'editor',
      name: 'Visual Editor',
      desc: 'Click to select, double-click to edit inline, tweak props in the inspector. Snapshot and restore through the persistence port.'
    },
    {
      href: '/design-system-lab',
      tag: 'design system',
      name: 'Design System',
      desc: 'Edit a portable brand pack — color, type, radius, spacing — and watch a live spec re-skin token by token.'
    },
    {
      href: '/slides-lab',
      tag: 'slides',
      name: 'Slides',
      desc: 'Render any spec as a presentation deck: one slide per section, with keyboard and dot navigation.'
    }
  ];

  const more = [
    { href: '/showcase', name: 'Showcase' },
    { href: '/playground', name: 'Playground' }
  ];
</script>

<svelte:head><title>Ripple · Labs</title></svelte:head>

<div class="labs">
  <header class="head">
    <p class="eyebrow">ripple · design module</p>
    <h1>Labs</h1>
    <p class="lede">Live playgrounds for the editor, design system, and slides. Each renders the real components, so what you see here is what ships.</p>
  </header>

  <ul class="grid">
    {#each labs as lab, i (lab.href)}
      <li>
        <a class="card" href={lab.href} style={`--i:${i}`}>
          <span class="rail" aria-hidden="true"></span>
          <span class="tag">{lab.tag}</span>
          <span class="name">{lab.name}</span>
          <span class="desc">{lab.desc}</span>
          <span class="go" aria-hidden="true">
            open
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </a>
      </li>
    {/each}
  </ul>

  <footer class="more">
    <span class="more-label">also</span>
    {#each more as m (m.href)}
      <a class="more-link" href={m.href}>{m.name}</a>
    {/each}
  </footer>
</div>

<style>
  .labs {
    position: relative;
    max-width: 1080px;
    margin: 0 auto;
    padding: 72px 24px 96px;
    color: var(--foreground);
  }
  /* Quiet dotted-grid backdrop for atmosphere — token-tinted, fades downward. */
  .labs::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image: radial-gradient(color-mix(in srgb, var(--foreground) 7%, transparent) 1px, transparent 1px);
    background-size: 22px 22px;
    -webkit-mask-image: linear-gradient(to bottom, black, transparent 60%);
    mask-image: linear-gradient(to bottom, black, transparent 60%);
    pointer-events: none;
  }
  .head {
    margin-bottom: 40px;
    animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .eyebrow {
    margin: 0 0 10px;
    font: 600 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--primary);
  }
  h1 {
    margin: 0;
    font-size: clamp(2.4rem, 6vw, 3.4rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .lede {
    margin: 16px 0 0;
    max-width: 46ch;
    font-size: 1rem;
    line-height: 1.6;
    color: var(--muted-foreground);
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    padding: 24px 22px 20px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--card);
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s, box-shadow 0.2s;
    animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.06s * var(--i) + 0.08s);
  }
  .card:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--primary) 50%, transparent);
    box-shadow: 0 12px 30px -12px color-mix(in srgb, var(--foreground) 18%, transparent);
  }
  .card:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  /* Accent rail that grows from the top-left on hover. */
  .rail {
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 0;
    background: var(--primary);
    transition: height 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .card:hover .rail { height: 100%; }
  .tag {
    font: 600 10.5px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }
  .name {
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .desc {
    flex: 1;
    font-size: 0.9rem;
    line-height: 1.55;
    color: var(--muted-foreground);
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font: 600 12px/1 ui-monospace, monospace;
    letter-spacing: 0.04em;
    color: var(--primary);
  }
  .go svg { transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
  .card:hover .go svg { transform: translateX(4px); }
  .more {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 36px;
  }
  .more-label {
    font: 600 10.5px/1 ui-monospace, monospace;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--muted-foreground) 70%, transparent);
  }
  .more-link {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--muted-foreground);
    text-decoration: none;
    transition: color 0.15s;
  }
  .more-link:hover { color: var(--foreground); }
  @keyframes rise {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .head, .card { animation: none; }
    .card, .rail, .go svg { transition: none; }
  }
</style>
