<!--
  SlidesLayout.svelte — designed layout for the `slides` intent (SP-4).
  Created 2026-06-28.

  Renders a UniversalSpec as a presentation DECK: one slide per top-level
  section, one slide visible at a time, with Prev / Next buttons, an "n / total"
  counter, clickable dots, and Left/Right arrow-key navigation. This is the
  in-app render-as-deck surface; the later PPTX/MP4 export reads the same
  partition (slides-partition.ts) so the rendered deck and the exported deck
  agree on slide boundaries.

  Slide boundaries come from the pure `partitionSlides` helper (spec.sections →
  spec.ui.children → whole spec.ui → none). Each slide node is rendered through
  NodeRenderer, so the Ripple context set up by the hosting <Ripple> (state,
  events, widget resolver) applies unchanged. Only the active slide is mounted —
  "one slide at a time" is literal, not CSS-hidden — and `{#key}` remounts it on
  change so no widget state leaks between slides.

  Navigation clamps (no wrap): Prev is disabled on the first slide, Next on the
  last. Keyboard is wired via <svelte:window> so arrows work without the deck
  holding focus; it is a11y-safe (no static-element interaction handlers — all
  on-screen controls are real <button>s).

  PURE render: reads only `spec`. No fetch, no service. The deck index is the
  one piece of local UI state.
-->
<script lang="ts">
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import { partitionSlides, clampIndex } from '../slides-partition.js';
  import type { UniversalSpec } from '../../schema/universal-spec.js';

  interface Props {
    /** The spec to present. Sections come from ui.children / sections / ui. */
    spec: UniversalSpec;
  }

  let { spec }: Props = $props();

  // Ordered slide nodes (pure). Re-derives if the spec changes.
  const slides = $derived(partitionSlides(spec));
  const total = $derived(slides.length);

  // The only local state: which slide is showing. Held raw and re-clamped via a
  // derived so a shrinking deck (fewer slides) can never strand the index out of
  // range — `current` is always read through `index`.
  let current = $state(0);
  const index = $derived(clampIndex(current, total));
  const activeSlide = $derived(slides[index]);

  function go(to: number) {
    current = clampIndex(to, total);
  }
  function next() {
    go(index + 1);
  }
  function prev() {
    go(index - 1);
  }

  // Arrow-key navigation. Window-scoped so the deck doesn't need focus; guarded
  // to the two arrow keys so it never swallows other input. preventDefault stops
  // the arrows from also scrolling the page while presenting.
  function onKeydown(event: KeyboardEvent) {
    if (total <= 1) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prev();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if total === 0}
  <EmptyState
    title="No slides"
    description="This deck has no sections to present. Add children to the spec's ui to create slides."
    icon="file"
  />
{:else}
  <div class="slides-layout">
    {#if spec.title || spec.description}
      <header class="slides-layout__head">
        {#if spec.title}<h2 class="slides-layout__deck-title">{spec.title}</h2>{/if}
        {#if spec.description}<p class="slides-layout__deck-sub">{spec.description}</p>{/if}
      </header>
    {/if}

    <!-- The stage: one slide at a time. {#key} remounts on slide change so no
         widget state bleeds across slides. -->
    <div class="slides-layout__stage">
      {#key index}
        <section
          class="slides-layout__slide"
          aria-roledescription="slide"
          aria-label={`Slide ${index + 1} of ${total}`}
        >
          {#if activeSlide}
            <NodeRenderer node={activeSlide} />
          {/if}
        </section>
      {/key}
    </div>

    <nav class="slides-layout__controls" aria-label="Slide navigation">
      <button
        type="button"
        class="slides-layout__nav"
        onclick={prev}
        disabled={index === 0}
        aria-label="Previous slide"
      >
        <span aria-hidden="true">&lsaquo;</span> Prev
      </button>

      <div class="slides-layout__dots">
        {#each slides as _slide, i (i)}
          <button
            type="button"
            class="slides-layout__dot"
            class:is-active={i === index}
            data-slide-dot={i}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
            onclick={() => go(i)}
          ></button>
        {/each}
      </div>

      <span class="slides-layout__counter" data-total={total} aria-live="polite">
        {index + 1} / {total}
      </span>

      <button
        type="button"
        class="slides-layout__nav"
        onclick={next}
        disabled={index === total - 1}
        aria-label="Next slide"
      >
        Next <span aria-hidden="true">&rsaquo;</span>
      </button>
    </nav>
  </div>
{/if}

<style>
  .slides-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    max-width: 64rem;
    margin-inline: auto;
  }
  .slides-layout__head {
    text-align: center;
  }
  .slides-layout__deck-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--ripple-muted-foreground, inherit);
    margin: 0;
  }
  .slides-layout__deck-sub {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: var(--ripple-muted-foreground, inherit);
    opacity: 0.8;
  }
  /* Full-bleed slide surface — generous, centered, presentation-styled. */
  .slides-layout__stage {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 24rem;
    padding: 3rem;
    border: 1px solid var(--ripple-border, #e5e7eb);
    border-radius: 1rem;
    background: var(--ripple-card, #fff);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .slides-layout__slide {
    width: 100%;
    max-width: 48rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  .slides-layout__controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }
  .slides-layout__nav {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--ripple-foreground, inherit);
    background: var(--ripple-card, #fff);
    border: 1px solid var(--ripple-border, #e5e7eb);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .slides-layout__nav:hover:not(:disabled) {
    background: var(--ripple-muted, #f3f4f6);
  }
  .slides-layout__nav:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .slides-layout__dots {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .slides-layout__dot {
    width: 0.625rem;
    height: 0.625rem;
    padding: 0;
    border-radius: 9999px;
    border: none;
    background: var(--ripple-border, #d1d5db);
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .slides-layout__dot:hover {
    background: var(--ripple-muted-foreground, #9ca3af);
  }
  .slides-layout__dot.is-active {
    background: var(--ripple-primary, #6366f1);
    transform: scale(1.25);
  }
  .slides-layout__counter {
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
    color: var(--ripple-muted-foreground, inherit);
    min-width: 3.5rem;
    text-align: center;
  }
</style>
