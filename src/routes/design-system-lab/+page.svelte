<!--
  design-system-lab — SP-3 (Pillar 2) live review surface. The DesignSystemEditor
  on the left edits a BrandPack held in $state; the right pane renders a sample
  spec via <Ripple brand={...}> so editing any token re-skins the preview live.
  The mode toggle switches the editor's slot AND the preview's brandMode + .dark
  class. Dev/playground route only (ripple's SvelteKit routes are not packaged).
  @created 2026-06-28 — SP-3.
  @changed 2026-06-29: preview paints the brand surface (bg-background /
    text-foreground on the Ripple root) inside a centered, floating artboard. The
    workspace canvas tone follows the EDITING mode (light/dark) via per-mode
    --canvas-* vars, so the surround and the artboard stay cohesive regardless of
    the app chrome (no white artboard stranded on a dark void).
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
          props: { title: 'Revenue', density: 'comfortable' },
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

  <!-- Canvas: a workspace surround whose tone follows the EDITING mode (not the
       app chrome), so the preview is cohesive — light mode shows a light canvas +
       light artboard, dark shows dark + dark. The artboard (Ripple root) paints
       the brand's own surface; the --canvas-* vars below set the surround per-mode
       so it works even when the app chrome is the opposite theme. -->
  <main
    class="ds-canvas flex-1 overflow-auto"
    class:dark={mode === 'dark'}
    style:--canvas-bg={mode === 'dark' ? 'hsl(0 0% 7%)' : 'hsl(0 0% 96.5%)'}
    style:--canvas-dot={mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.045)'}
    style:--canvas-fg={mode === 'dark' ? 'hsl(0 0% 60%)' : 'hsl(0 0% 42%)'}
    style:--canvas-border={mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}
  >
    <div class="flex min-h-full items-center justify-center p-6 sm:p-12">
      <div class="w-full max-w-2xl">
        <p
          class="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.18em]"
          style="color: var(--canvas-fg)"
        >
          Live preview · {mode} mode
        </p>
        <div class="ds-artboard overflow-hidden rounded-2xl">
          <Ripple spec={sample} {brand} brandMode={mode} class="block bg-background text-foreground" />
        </div>
      </div>
    </div>
  </main>
</div>

<style>
  /* Workspace canvas — tone follows the editing mode via per-mode --canvas-* vars
     set on the element, so the preview stays cohesive regardless of app chrome. */
  .ds-canvas {
    background:
      radial-gradient(var(--canvas-dot) 1px, transparent 1px) 0 0 / 22px 22px,
      var(--canvas-bg);
  }
  /* Float the artboard off the canvas: a mode-tuned hairline + a soft drop. */
  .ds-artboard {
    border: 1px solid var(--canvas-border);
    box-shadow: 0 24px 60px -28px rgba(0, 0, 0, 0.45);
  }
</style>
