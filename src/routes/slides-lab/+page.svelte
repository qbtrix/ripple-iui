<!--
  @file routes/slides-lab/+page.svelte
  @description Captain visual-check surface for the SP-4 `slides` intent layout.
    Renders a sample multi-section spec (intent='slides') through <Ripple>, so it
    exercises the full live path: normalizeSpec keeps the slides intent →
    DESIGNED_INTENTS routes it to IntentRenderer → SlidesLayout partitions
    spec.ui.children into one slide each. Use Prev/Next, the dots, or the
    Left/Right arrow keys to page the deck. A small theme toggle proves the deck
    respects brand tokens (it renders inside the ripple-root).
  @created 2026-06-28 (SP-4 — slides intent layout)
  @changed 2026-06-29: theming. Page chrome now uses theme tokens (var(--token))
    so it follows light/dark; fixes the dark-on-dark heading. The in-deck "Brand
    theme" toggle keeps its fixed demo palette on purpose.
-->
<script lang="ts">
  import { Ripple } from '$lib/index.js';

  // Sample deck: each child of `ui.children` becomes one slide. Uses only
  // registered widgets (container / heading / text / grid / card / stat / badge)
  // so the deck renders real content, not red unknown-widget boxes.
  const deck = {
    version: '2.0' as const,
    intent: 'slides' as const,
    title: 'Ripple Slides',
    description: 'A spec rendered as a presentation deck — one slide per section.',
    ui: {
      type: 'container',
      children: [
        {
          type: 'container',
          children: [
            { type: 'badge', props: { text: 'SP-4', variant: 'secondary' } },
            { type: 'heading', props: { text: 'Render any spec as a deck', level: 1 } },
            {
              type: 'text',
              props: {
                text: 'The slides intent turns a UniversalSpec into a presentation. Each top-level section is a slide.'
              }
            }
          ]
        },
        {
          type: 'container',
          children: [
            { type: 'heading', props: { text: 'How it works', level: 2 } },
            {
              type: 'text',
              props: {
                text: 'partitionSlides splits the spec: sections → ui.children → the whole ui. Each slide renders through NodeRenderer, so every Ripple widget is available on a slide.'
              }
            }
          ]
        },
        {
          type: 'container',
          children: [
            { type: 'heading', props: { text: 'By the numbers', level: 2 } },
            {
              type: 'grid',
              props: { columns: 3, gap: '16px' },
              children: [
                {
                  type: 'card',
                  props: { title: 'Slides' },
                  children: [{ type: 'stat', props: { label: 'in this deck', value: '4' } }]
                },
                {
                  type: 'card',
                  props: { title: 'Widgets' },
                  children: [{ type: 'stat', props: { label: 'available per slide', value: '150+' } }]
                },
                {
                  type: 'card',
                  props: { title: 'Round-trips' },
                  children: [{ type: 'stat', props: { label: 'to page the deck', value: '0' } }]
                }
              ]
            }
          ]
        },
        {
          type: 'container',
          children: [
            { type: 'heading', props: { text: 'Try it', level: 2 } },
            {
              type: 'text',
              props: {
                text: 'Use Prev / Next, click a dot, or press the Left and Right arrow keys to page through the deck.'
              }
            }
          ]
        }
      ]
    }
  };

  // Optional brand override to prove the deck respects theme tokens.
  const brand = {
    theme: {
      primary: '#0ea5e9',
      card: '#0b1220',
      foreground: '#e2e8f0',
      'muted-foreground': '#94a3b8',
      border: '#1e293b'
    }
  };

  let dark = $state(false);
  const spec = $derived(dark ? { ...deck, ...brand } : deck);
</script>

<div class="page">
  <header class="page-head">
    <p class="eyebrow">SP-4</p>
    <h1>Slides intent — render-as-deck</h1>
    <p class="lede">
      A <code>{'{ intent: "slides" }'}</code> spec rendered through <code>&lt;Ripple&gt;</code>.
      Prev / Next, dots, and Left/Right arrow keys page the deck.
    </p>
    <label class="toggle">
      <input type="checkbox" bind:checked={dark} />
      Brand theme (proves tokens apply)
    </label>
  </header>

  <div class="stage" class:stage--dark={dark}>
    <Ripple {spec} />
  </div>
</div>

<style>
  .page {
    max-width: 1024px;
    margin: 0 auto;
    padding: 24px 24px 64px;
    color: var(--foreground);
  }
  .page-head {
    margin-bottom: 20px;
  }
  .eyebrow {
    margin: 0;
    font: 700 11px/1 ui-monospace, monospace;
    letter-spacing: 0.12em;
    color: var(--primary);
  }
  .page-head h1 {
    margin: 6px 0 4px;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .lede {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.9rem;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-size: 0.85rem;
    color: var(--muted-foreground);
  }
  /* Recessed canvas — a muted surround so the deck's own slide surface (var(--card))
     reads as an elevated artboard on top of it, in both themes. */
  .stage {
    padding: 32px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--muted);
  }
  /* The lab's own "Brand theme" toggle paints a fixed dark brand onto the deck to
     prove tokens apply — intentionally a specific palette, not the app theme. */
  .stage--dark {
    background: #020617;
    border-color: #1e293b;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8rem;
    background: var(--muted);
    color: var(--foreground);
    padding: 1px 5px;
    border-radius: 4px;
  }
</style>
