<!--
  DesignSystemEditor.svelte — SP-3 (Pillar 2) the design-system token editor widget.
  A controlled L2 surface for editing a BrandPack's tokens: a color role per row
  (light/dark slot chosen by `mode`), font families, type-scale sizes, and the
  radius / spacing / shadow steps. Every edit emits the next BrandPack via
  `onChange`; the host (the lab, or any consumer) holds the brand in $state and
  feeds it to `<Ripple brand={...}>` for a live re-skin. PURE controlled component:
  it imports the L1 schema constants only — no Ripple import — so registering it in
  the widget map can't create an import cycle. The live preview lives in the host.
  @created 2026-06-28 — SP-3 chunk 11 (design-system editor widget).
-->
<script lang="ts">
  import type { BrandPack, ColorToken } from '../../schema/brand.js';
  import {
    BRAND_COLOR_ROLES,
    BRAND_TYPE_STEPS,
    BRAND_RADIUS_STEPS,
    BRAND_SPACE_STEPS,
    BRAND_SHADOW_STEPS
  } from '../../schema/brand.js';

  type FontKey = 'sans' | 'serif' | 'mono';
  type StepGroup = 'radius' | 'space' | 'shadow';
  const FONT_KEYS: readonly FontKey[] = ['sans', 'serif', 'mono'];

  interface Props {
    /** The brand being edited (controlled — the host owns the source of truth). */
    brand: BrandPack;
    /** Called with the next BrandPack on every edit. */
    onChange?: (next: BrandPack) => void;
    /** Which color slot the swatches read/write. */
    mode?: 'light' | 'dark';
    class?: string;
  }
  let { brand, onChange, mode = 'light', class: className = '' }: Props = $props();

  function clone(b: BrandPack): BrandPack {
    // JSON round-trip, NOT structuredClone: the brand is plain JSON (token values
    // are strings/numbers), so this is lossless AND proxy-safe. structuredClone
    // throws DataCloneError on the Svelte `$state` proxy the host passes as
    // `brand`, which silently swallowed every edit (the live "color not applying"
    // bug). JSON.stringify reads through the proxy's traps and yields a plain object.
    return JSON.parse(JSON.stringify(b)) as BrandPack;
  }

  function setColor(role: string, slot: 'light' | 'dark', value: string) {
    const next = clone(brand);
    next.tokens ??= {};
    next.tokens.color ??= {};
    const existing: ColorToken = next.tokens.color[role] ?? { light: value };
    next.tokens.color[role] = { ...existing, [slot]: value };
    onChange?.(next);
  }
  function setFont(key: FontKey, value: string) {
    const next = clone(brand);
    next.tokens ??= {};
    next.tokens.typography ??= {};
    next.tokens.typography.fontFamily ??= {};
    next.tokens.typography.fontFamily[key] = value;
    onChange?.(next);
  }
  function setScaleSize(step: string, value: string) {
    const next = clone(brand);
    next.tokens ??= {};
    next.tokens.typography ??= {};
    next.tokens.typography.scale ??= {};
    const s = next.tokens.typography.scale[step] ?? { size: value, lineHeight: '1.5' };
    next.tokens.typography.scale[step] = { ...s, size: value };
    onChange?.(next);
  }
  function setStep(group: StepGroup, step: string, value: string) {
    const next = clone(brand);
    next.tokens ??= {};
    next.tokens[group] ??= {};
    (next.tokens[group] as Record<string, string>)[step] = value;
    onChange?.(next);
  }

  const colorVal = (role: string, slot: 'light' | 'dark') => brand.tokens?.color?.[role]?.[slot] ?? '';
  const fontVal = (key: FontKey) => brand.tokens?.typography?.fontFamily?.[key] ?? '';
  const scaleVal = (step: string) => brand.tokens?.typography?.scale?.[step]?.size ?? '';
  const stepVal = (group: StepGroup, step: string) =>
    (brand.tokens?.[group] as Record<string, string> | undefined)?.[step] ?? '';

  // Native <input type=color> needs a hex; non-hex tokens (oklch/hsl) keep their
  // raw value in the text box and show a neutral chip so the picker still renders.
  const asHex = (v: string) => (/^#[0-9a-fA-F]{3,8}$/.test(v) ? v : '#888888');
</script>

{#snippet tokenRow(label: string, value: string, set: (v: string) => void, color: boolean)}
  <div class="flex items-center gap-2">
    {#if color}
      <input
        type="color"
        class="h-6 w-6 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
        value={asHex(value)}
        oninput={(e) => set((e.currentTarget as HTMLInputElement).value)}
        aria-label={`${label} color`}
      />
    {/if}
    <input
      type="text"
      class="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-xs"
      value={value}
      placeholder="—"
      oninput={(e) => set((e.currentTarget as HTMLInputElement).value)}
      aria-label={label}
    />
    <span class="w-44 shrink-0 truncate text-xs text-muted-foreground">{label}</span>
  </div>
{/snippet}

<div class={`ds-editor flex max-h-full flex-col gap-4 overflow-auto p-3 text-sm ${className}`}>
  <header class="flex items-center justify-between">
    <div class="font-semibold">{brand.name}</div>
    <div class="text-xs text-muted-foreground">v{brand.version} · editing {mode}</div>
  </header>

  <section class="flex flex-col gap-1.5">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colors</h3>
    {#each BRAND_COLOR_ROLES as role (role)}
      {@render tokenRow(role, colorVal(role, mode), (v) => setColor(role, mode, v), true)}
    {/each}
  </section>

  <section class="flex flex-col gap-1.5">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typography</h3>
    {#each FONT_KEYS as fk (fk)}
      {@render tokenRow(`font ${fk}`, fontVal(fk), (v) => setFont(fk, v), false)}
    {/each}
    {#each BRAND_TYPE_STEPS as step (step)}
      {@render tokenRow(`text ${step}`, scaleVal(step), (v) => setScaleSize(step, v), false)}
    {/each}
  </section>

  <section class="flex flex-col gap-1.5">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Radius</h3>
    {#each BRAND_RADIUS_STEPS as step (step)}
      {@render tokenRow(step, stepVal('radius', step), (v) => setStep('radius', step, v), false)}
    {/each}
  </section>

  <section class="flex flex-col gap-1.5">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Spacing</h3>
    {#each BRAND_SPACE_STEPS as step (step)}
      {@render tokenRow(step, stepVal('space', step), (v) => setStep('space', step, v), false)}
    {/each}
  </section>

  <section class="flex flex-col gap-1.5">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shadow</h3>
    {#each BRAND_SHADOW_STEPS as step (step)}
      {@render tokenRow(step, stepVal('shadow', step), (v) => setStep('shadow', step, v), false)}
    {/each}
  </section>
</div>
