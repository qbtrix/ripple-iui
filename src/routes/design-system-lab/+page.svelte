<!--
  design-system-lab — SP-3 (Pillar 2) live review surface. The DesignSystemEditor
  on the left edits a BrandPack held in $state; the right pane renders a sample
  spec via <Ripple brand={...}> so editing any token re-skins the preview live.
  The mode toggle switches the editor's slot AND the preview's brandMode + .dark
  class. Dev/playground route only (ripple's SvelteKit routes are not packaged).
  @created 2026-06-28 — SP-3.
  @changed 2026-06-29: preview now paints the brand surface (bg-background /
    text-foreground on the Ripple root) inside a centered, framed artboard, so
    the light-brand preview reads on its own white surface even when the app
    chrome is dark; added canvas padding so the pane is not cramped.
-->
<script lang="ts">
  import Ripple from '$lib/Ripple.svelte';
  import { DesignSystemEditor, defaultBrandPack } from '$lib/widgets/design-system/index.js';
  import type { BrandPack } from '$lib/schema/brand.js';

  let brand = $state<BrandPack>(defaultBrandPack());
  let mode = $state<'light' | 'dark'>('light');

  // A small representative spec spanning the high-signal tokens (primary, surface,
  // foreground, border, radius, font) so a token edit is visibly reflected.
  const sample = {
    ui: {
      type: 'container',
      props: { class: 'flex flex-col gap-4 p-6' },
      children: [
        { type: 'heading', props: { text: 'Acme Analytics' } },
        { type: 'text', props: { text: 'This preview re-skins live as you edit tokens on the left.' } },
        {
          type: 'flex',
          props: { gap: 'md', class: 'items-center' },
          children: [
            { type: 'button', props: { label: 'Primary action' } },
            { type: 'button', props: { label: 'Secondary', variant: 'secondary' } },
            { type: 'badge', props: { text: 'Live' } }
          ]
        },
        {
          type: 'card',
          props: { title: 'Revenue' },
          children: [{ type: 'stat', props: { label: 'MRR', value: '$12,400', delta: '+8%' } }]
        },
        { type: 'input', props: { placeholder: 'Search…' } }
      ]
    }
  };
</script>

<div class="flex h-screen w-full overflow-hidden">
  <aside class="flex w-96 shrink-0 flex-col border-r border-border">
    <div class="flex items-center justify-between border-b border-border p-3">
      <h1 class="text-sm font-semibold">Design System</h1>
      <button
        class="rounded border border-border px-2 py-1 text-xs capitalize"
        onclick={() => (mode = mode === 'light' ? 'dark' : 'light')}
      >
        {mode} mode
      </button>
    </div>
    <DesignSystemEditor {brand} {mode} onChange={(next) => (brand = next)} class="flex-1" />
  </aside>

  <!-- Canvas: a textured surround with the brand "artboard" centered in it (a
       design-tool framing). The Ripple root paints bg-background/text-foreground,
       so the artboard adopts the brand's OWN surface — the light-brand preview
       reads on a white artboard even while the app chrome is dark. min-h-full +
       centering floats the artboard mid-pane instead of stranding dead space. -->
  <main class="ds-canvas flex-1 overflow-auto" class:dark={mode === 'dark'}>
    <div class="flex min-h-full items-center justify-center p-6 sm:p-12">
      <div class="w-full max-w-2xl">
        <p class="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Live preview · {mode} mode
        </p>
        <div class="ds-artboard overflow-hidden rounded-2xl border border-border">
          <Ripple spec={sample} {brand} brandMode={mode} class="block bg-background text-foreground" />
        </div>
      </div>
    </div>
  </main>
</div>

<style>
  /* Quiet dotted canvas so the empty surround reads as an intentional artboard
     backdrop, not a flat void. Foreground-tinted dots adapt to light/dark. */
  .ds-canvas {
    background:
      radial-gradient(color-mix(in srgb, var(--foreground) 6%, transparent) 1px, transparent 1px) 0 0 / 22px 22px,
      var(--muted);
  }
  /* Soft float so the artboard lifts off the canvas in both themes. */
  .ds-artboard {
    box-shadow: 0 24px 50px -24px color-mix(in srgb, var(--foreground) 30%, transparent);
  }
</style>
