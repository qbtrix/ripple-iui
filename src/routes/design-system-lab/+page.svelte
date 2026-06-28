<!--
  design-system-lab — SP-3 (Pillar 2) live review surface. The DesignSystemEditor
  on the left edits a BrandPack held in $state; the right pane renders a sample
  spec via <Ripple brand={...}> so editing any token re-skins the preview live.
  The mode toggle switches the editor's slot AND the preview's brandMode + .dark
  class. Dev/playground route only (ripple's SvelteKit routes are not packaged).
  @created 2026-06-28 — SP-3.
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

  <main class="flex-1 overflow-auto" class:dark={mode === 'dark'}>
    <Ripple spec={sample} {brand} brandMode={mode} class="min-h-full" />
  </main>
</div>
